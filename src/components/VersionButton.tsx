import React, { useEffect, useRef, useState } from 'react';
import { SFX } from '../utils/audio';

const GAS_API_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GAS_API_URL ||
  'https://script.google.com/macros/s/AKfycbwRXacMOX7jFffw73voAxPcdgYtu7in5kt7PQ0M7qK3FaaC3YOYm0F9WeQSBcnRFlVG/exec';

const VERSION_STORAGE_KEY = 'walipintar_locked_version';
const DEFAULT_FALLBACK_VERSION = 'v.1.0.4';
const POLL_INTERVAL_MS = 30000; // Fetch versi terkunci tiap 30 detik

function parseVersionNumber(ver: string): number {
  const match = /^v\.(\d+)\.(\d+)\.(\d+)$/i.exec(ver.trim());
  if (!match) return -1;
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
}

interface VersionResponse {
  versi?: string;
  no?: number;
  tanggal?: string;
}

export const VersionButton: React.FC = () => {
  const [version, setVersion] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(VERSION_STORAGE_KEY);
      if (saved && saved.trim() !== '') {
        const trimmed = saved.trim();
        if (parseVersionNumber(trimmed) >= parseVersionNumber(DEFAULT_FALLBACK_VERSION)) {
          return trimmed;
        }
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_FALLBACK_VERSION;
  });

  const [statusHint, setStatusHint] = useState<string | null>(null);
  const currentVersionRef = useRef(version);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentVersionRef.current = version;
  }, [version]);

  const fetchLockedVersion = async (manualTrigger = false) => {
    try {
      const separator = GAS_API_URL.includes('?') ? '&' : '?';
      const url = `${GAS_API_URL}${separator}action=version&t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;

      const data = (await res.json()) as VersionResponse;
      const incomingVersi = typeof data?.versi === 'string' ? data.versi.trim() : '';
      const incomingTanggal = typeof data?.tanggal === 'string' ? data.tanggal.trim() : '';

      // Hanya berubah jika versi di Sheet SUDAH TERKUNCI dengan tanggal yang terisi
      if (incomingVersi && incomingTanggal) {
        const changed = incomingVersi !== currentVersionRef.current;
        setVersion(incomingVersi);
        try {
          localStorage.setItem(VERSION_STORAGE_KEY, incomingVersi);
        } catch {
          // Ignore storage error
        }

        if (changed && 'serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) {
              reg.update().catch(() => {});
            }
          });
        }

        if (manualTrigger) {
          setStatusHint(
            changed
              ? `Pembaruan tersedia: ${incomingVersi} (${incomingTanggal})`
              : `Versi terkunci terbaru (${incomingTanggal})`
          );
        }
      } else if (manualTrigger) {
        setStatusHint('Menunggu versi terkunci dari server');
      }
    } catch {
      if (manualTrigger) {
        setStatusHint('Mode offline (memakai versi tersimpan)');
      }
    }
  };

  useEffect(() => {
    fetchLockedVersion(false);
    const intervalId = window.setInterval(() => {
      fetchLockedVersion(false);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    SFX.bloop();
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
    }
    fetchLockedVersion(true);
    hintTimerRef.current = window.setTimeout(() => {
      setStatusHint(null);
    }, 3500);
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        id="btnVersi"
        type="button"
        onClick={handleClick}
        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 font-black text-[11px] sm:text-xs tracking-wide shadow-2xs transition-all cursor-pointer select-none"
        title="Cek versi aplikasi terbaru dari server"
      >
        {`WALI PINTAR ${version}`}
      </button>
      {statusHint && (
        <span className="text-[10px] font-bold text-slate-500 animate-fade-in">
          {statusHint}
        </span>
      )}
    </div>
  );
};
