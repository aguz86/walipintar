interface AssetFetcher {
  fetch(request: Request | string): Promise<Response>;
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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyLynkEdgeSignature(
  rawBody: string,
  signatureHeader: string,
  merchantKey: string,
): Promise<boolean> {
  const incomingSig = signatureHeader.trim().toLowerCase().replace(/^sha256=/, '');
  if (!incomingSig) return false;

  const encoder = new TextEncoder();

  // Metode 1: HMAC-SHA256 atas raw JSON body
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(merchantKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const hmacSig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  if (constantTimeEqual(incomingSig, bytesToHex(hmacSig))) {
    return true;
  }

  // Metode 2: SHA-256 atas grandTotal + refId + message_id + MERCHANT_KEY
  try {
    const payload = JSON.parse(rawBody);
    const dataObj = payload?.data || payload || {};
    const msgData = dataObj?.message_data || dataObj || {};
    const totalsObj = msgData?.totals || {};
    const grandTotal = String(
      msgData?.grandTotal ?? msgData?.grand_total ?? totalsObj?.grandTotal ?? totalsObj?.grand_total ?? '',
    );
    const refId = String(msgData?.refId ?? msgData?.ref_id ?? dataObj?.refId ?? '');
    const messageId = String(dataObj?.message_id ?? msgData?.message_id ?? payload?.message_id ?? '');

    if (refId || messageId) {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(grandTotal + refId + messageId + merchantKey),
      );
      if (constantTimeEqual(incomingSig, bytesToHex(digest))) {
        return true;
      }
    }
  } catch {
    // Abaikan jika payload bukan JSON valid
  }

  return false;
}

async function handleLynkWebhook(request: Request, env: Env): Promise<Response> {
  const gasBaseUrl = (env.GAS_API_URL || env.VITE_GAS_API_URL || '').trim();
  const merchantKey = (env.MERCHANT_KEY || env.LYNK_MERCHANT_KEY || '').trim();

  if (request.method === 'GET' || request.method === 'HEAD') {
    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'Wali Pintar Lynk.id Webhook Proxy (Anti-302)',
        gasConfigured: Boolean(gasBaseUrl),
        edgeHmacConfigured: Boolean(merchantKey),
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
    '';

  // Jika MERCHANT_KEY juga dipasang di Cloudflare Secret, validasi langsung di Edge (HTTP 401)
  if (merchantKey) {
    const valid = await verifyLynkEdgeSignature(rawBody, signatureHeader, merchantKey);
    if (!valid) {
      return new Response(
        JSON.stringify({ status: 'error', code: 401, message: 'Invalid X-Lynk-Signature' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }

  // Teruskan ke Google Apps Script dengan redirect: 'follow' dan bawa signature di query param
  // karena GAS native doPost(e) tidak mengekspos HTTP headers.
  const targetUrl = new URL(gasBaseUrl);
  if (signatureHeader) {
    targetUrl.searchParams.set('signature', signatureHeader);
  }

  const gasResponse = await fetch(targetUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: rawBody,
    redirect: 'follow',
  });

  const responseText = await gasResponse.text();

  // Cek apakah GAS mengembalikan error JSON terstruktur (401/403/400/500)
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && parsed.status === 'error') {
      const code = Number(parsed.httpStatus || parsed.code || 400);
      const httpCode = code >= 400 && code < 600 ? code : 400;
      return new Response(responseText, {
        status: httpCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Jika bukan JSON (misal teks "OK" dari GAS), lanjutkan ke HTTP 200 OK
  }

  if (!gasResponse.ok) {
    return new Response(responseText || 'Upstream GAS Error', {
      status: gasResponse.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(responseText || 'OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/lynk-webhook' || url.pathname === '/api/lynk-webhook/') {
      return handleLynkWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
