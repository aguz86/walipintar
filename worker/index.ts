interface AssetFetcher {
  fetch(request: Request | string): Promise<Response>;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  ASSETS: AssetFetcher;
  GAS_API_URL?: string;
  VITE_GAS_API_URL?: string;
  MERCHANT_KEY?: string;
  LYNK_MERCHANT_KEY?: string;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractLynkContext(rawBody: string): { refId: string; email: string } {
  try {
    const payload = JSON.parse(rawBody);
    const dataObj = payload?.data || payload || {};
    const msgData = dataObj?.message_data || dataObj || {};
    const refId = String(
      msgData?.refId ?? msgData?.ref_id ?? dataObj?.refId ?? dataObj?.ref_id ?? payload?.refId ?? '',
    ).trim();
    const email = String(
      msgData?.customer?.email ||
        dataObj?.customer?.email ||
        payload?.customer?.email ||
        msgData?.email ||
        payload?.email ||
        '',
    )
      .trim()
      .toLowerCase();
    return { refId, email };
  } catch {
    return { refId: '', email: '' };
  }
}

function isHarmlessTestPing(rawBody: string): boolean {
  const trimmed = rawBody.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]') return true;
  try {
    const payload = JSON.parse(trimmed);
    const dataObj = payload?.data || payload || {};
    const msgData = dataObj?.message_data || dataObj || {};
    const eventName = String(payload?.event || dataObj?.message_action || '').trim().toUpperCase();
    const customerEmail = String(
      msgData?.customer?.email || dataObj?.customer?.email || payload?.customer?.email || msgData?.email || payload?.email || '',
    ).trim();

    if (
      payload?.test === true ||
      eventName === 'TEST' ||
      eventName === 'PING' ||
      eventName === 'WEBHOOK.TEST' ||
      eventName === 'TEST_WEBHOOK'
    ) {
      return true;
    }

    // Jika payload ping kosong tanpa email pembeli & tanpa refId
    const refId = String(msgData?.refId ?? msgData?.ref_id ?? dataObj?.refId ?? payload?.refId ?? '').trim();
    if (!customerEmail && !refId) {
      return true;
    }
  } catch {
    // Bukan JSON
  }
  return false;
}

async function verifyLynkEdgeSignature(
  rawBody: string,
  signatureHeader: string,
  merchantKey: string,
): Promise<boolean> {
  const rawTrimmed = signatureHeader.trim();
  const incomingLower = rawTrimmed.toLowerCase().replace(/^sha256=/, '');
  if (!incomingLower) return false;

  const encoder = new TextEncoder();

  // Metode 1: HMAC-SHA256 atas raw JSON body (Hex & Base64)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(merchantKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const hmacSig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  if (
    constantTimeEqual(incomingLower, bytesToHex(hmacSig)) ||
    constantTimeEqual(rawTrimmed.replace(/^sha256=/i, ''), bytesToBase64(hmacSig))
  ) {
    return true;
  }

  // Metode 2 & 3: SHA-256 / HMAC-SHA256 atas grandTotal + refId + message_id (+ merchantKey)
  try {
    const payload = JSON.parse(rawBody);
    const dataObj = payload?.data || payload || {};
    const msgData = dataObj?.message_data || dataObj || {};
    const totalsObj = msgData?.totals || dataObj?.totals || {};
    const grandTotal = String(
      msgData?.grandTotal ??
        msgData?.grand_total ??
        totalsObj?.grandTotal ??
        totalsObj?.grand_total ??
        dataObj?.grandTotal ??
        payload?.grandTotal ??
        '',
    );
    const refId = String(
      msgData?.refId ?? msgData?.ref_id ?? dataObj?.refId ?? dataObj?.ref_id ?? payload?.refId ?? '',
    );
    const messageId = String(dataObj?.message_id ?? msgData?.message_id ?? payload?.message_id ?? '');

    if (refId || messageId) {
      const concatStr = grandTotal + refId + messageId + merchantKey;
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(concatStr));
      if (constantTimeEqual(incomingLower, bytesToHex(digest))) {
        return true;
      }

      const concatHmac = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(grandTotal + refId + messageId),
      );
      if (constantTimeEqual(incomingLower, bytesToHex(concatHmac))) {
        return true;
      }
    }
  } catch {
    // Abaikan jika payload bukan JSON valid
  }

  return false;
}

async function reportWorkerErrorToGas(
  gasBaseUrl: string,
  errData: {
    incidentKey: string;
    source: string;
    orderId?: string;
    email?: string;
    message: string;
    detail?: string;
  },
): Promise<void> {
  try {
    const logUrl = new URL(gasBaseUrl);
    logUrl.searchParams.set('action', 'log_error');
    await fetch(logUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_error',
        incidentKey: errData.incidentKey,
        source: errData.source,
        orderId: errData.orderId || '',
        email: errData.email || '',
        message: errData.message,
        detail: errData.detail || '',
      }),
      redirect: 'follow',
    });
  } catch (err) {
    console.error('Gagal mengirim log error Worker ke GAS:', err);
  }
}

async function sendToGasOnce(targetUrl: string, rawBody: string): Promise<{
  ok: boolean;
  httpStatus: number;
  responseText: string;
  errorMessage?: string;
}> {
  try {
    const gasResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: rawBody,
      redirect: 'follow',
    });

    const responseText = await gasResponse.text();

    try {
      const parsed = JSON.parse(responseText);
      if (parsed && parsed.status === 'error') {
        const code = Number(parsed.httpStatus || parsed.code || 400);
        const httpCode = code >= 400 && code < 600 ? code : 400;
        return {
          ok: false,
          httpStatus: httpCode,
          responseText,
          errorMessage: String(parsed.message || 'GAS error ' + httpCode),
        };
      }
    } catch {
      // Non-JSON (misal teks "OK") -> cek gasResponse.ok
    }

    if (!gasResponse.ok) {
      return {
        ok: false,
        httpStatus: gasResponse.status,
        responseText: responseText || 'Upstream GAS Error',
        errorMessage: 'HTTP ' + gasResponse.status + ': ' + (responseText || 'Upstream GAS Error').slice(0, 180),
      };
    }

    return {
      ok: true,
      httpStatus: 200,
      responseText: responseText || 'OK',
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 502,
      responseText: '',
      errorMessage: 'Gagal menghubungi upstream GAS: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

async function forwardToGasInBackground(
  targetUrl: string,
  rawBody: string,
  gasBaseUrl: string,
): Promise<void> {
  const ctxInfo = extractLynkContext(rawBody);
  const firstAttempt = await sendToGasOnce(targetUrl, rawBody);
  if (firstAttempt.ok) return;

  // Retry 1x jika upstream GAS timeout / 5xx / sibuk
  const shouldRetry = firstAttempt.httpStatus >= 500 || firstAttempt.httpStatus === 429;
  let finalResult = firstAttempt;

  if (shouldRetry) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const retryAttempt = await sendToGasOnce(targetUrl, rawBody);
    if (retryAttempt.ok) return;
    finalResult = retryAttempt;
  }

  const incidentTarget = ctxInfo.refId || ctxInfo.email || 'GLOBAL';
  const msg = finalResult.errorMessage || 'Upstream GAS gagal memproses webhook Lynk';
  console.error('Worker Background GAS Error:', {
    httpStatus: finalResult.httpStatus,
    refId: ctxInfo.refId,
    email: ctxInfo.email,
    message: msg,
  });

  await reportWorkerErrorToGas(gasBaseUrl, {
    incidentKey: 'WORKER_LYNK|' + incidentTarget,
    source: 'WORKER_LYNK_BRIDGE',
    orderId: ctxInfo.refId,
    email: ctxInfo.email,
    message: msg,
    detail: 'HTTP ' + finalResult.httpStatus + ' | Body: ' + rawBody.slice(0, 220),
  });
}

async function handleLynkWebhook(
  request: Request,
  env: Env,
  ctx?: WorkerExecutionContext,
): Promise<Response> {
  const gasBaseUrl = (env.GAS_API_URL || env.VITE_GAS_API_URL || '').trim();
  const merchantKey = (env.MERCHANT_KEY || env.LYNK_MERCHANT_KEY || '').trim();
  const reqUrl = new URL(request.url);
  const isSyncTest = reqUrl.searchParams.get('sync_test') === '1';

  if (request.method === 'GET' || request.method === 'HEAD') {
    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'Wali Pintar Lynk.id Webhook Proxy (Anti-302 & Anti-Timeout)',
        gasConfigured: Boolean(gasBaseUrl),
        edgeHmacConfigured: Boolean(merchantKey),
        asyncFastAck: Boolean(ctx && typeof ctx.waitUntil === 'function'),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!gasBaseUrl) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'GAS_API_URL belum dikonfigurasi di Cloudflare Worker Variables & Secrets.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get('X-Lynk-Signature') ||
    request.headers.get('x-lynk-signature') ||
    request.headers.get('X-Signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('X-Webhook-Signature') ||
    '';

  // Izinkan ping uji koneksi ringan ("Test URL" dari Lynk) tanpa membuat order apa pun
  // Kecuali ?sync_test=1 dari tombol admin Sheet yang ingin menguji jalur sampai ke GAS
  if (!isSyncTest && isHarmlessTestPing(rawBody)) {
    console.log('Lynk Test Ping diterima:', {
      hasSignature: Boolean(signatureHeader),
      bodyLength: rawBody.length,
    });
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Jika MERCHANT_KEY juga dipasang di Cloudflare Secret, validasi langsung di Edge (HTTP 401)
  if (merchantKey) {
    const valid = await verifyLynkEdgeSignature(rawBody, signatureHeader, merchantKey);
    if (!valid) {
      const ctxInfo = extractLynkContext(rawBody);
      const headerNames = Array.from(request.headers.keys()).filter((h) =>
        h.toLowerCase().includes('sig') || h.toLowerCase().includes('lynk'),
      );
      console.warn('Lynk 401 Signature Mismatch:', {
        hasSignatureHeader: Boolean(signatureHeader),
        sigLength: signatureHeader.length,
        matchedHeaders: headerNames,
        bodyPreview: rawBody.slice(0, 200),
      });

      const errMsg = signatureHeader
        ? 'Invalid X-Lynk-Signature (periksa kecocokan MERCHANT_KEY di Cloudflare & Lynk.id)'
        : 'Missing X-Lynk-Signature header';

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(
          reportWorkerErrorToGas(gasBaseUrl, {
            incidentKey: 'LYNK_SIGNATURE_INVALID',
            source: 'WORKER_LYNK_BRIDGE',
            orderId: ctxInfo.refId,
            email: ctxInfo.email,
            message: errMsg,
            detail: 'Headers: ' + headerNames.join(',') + ' | Preview: ' + rawBody.slice(0, 160),
          }),
        );
      }

      return new Response(
        JSON.stringify({
          status: 'error',
          code: 401,
          message: errMsg,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(gasBaseUrl);
  } catch {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Format GAS_API_URL tidak valid. Harus diawali https://script.google.com/.../exec',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (signatureHeader) {
    targetUrl.searchParams.set('signature', signatureHeader);
  }

  // Mode cepat Anti-Timeout 5s: balas 200 OK instan ke Lynk, proses GAS + retry di background
  if (!isSyncTest && ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(forwardToGasInBackground(targetUrl.toString(), rawBody, gasBaseUrl));
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Mode sinkron (dipakai saat ?sync_test=1 dari tombol admin Sheet atau runtime tanpa waitUntil)
  const syncResult = await sendToGasOnce(targetUrl.toString(), rawBody);
  if (!syncResult.ok) {
    return new Response(syncResult.responseText || syncResult.errorMessage || 'Upstream GAS Error', {
      status: syncResult.httpStatus,
      headers: {
        'Content-Type': syncResult.responseText.trim().startsWith('{')
          ? 'application/json'
          : 'text/plain; charset=utf-8',
      },
    });
  }

  return new Response(syncResult.responseText || 'OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/lynk-webhook' || url.pathname === '/api/lynk-webhook/') {
      return handleLynkWebhook(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
