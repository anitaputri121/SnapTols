import React, { useEffect } from 'react';

/**
 * SAKLAR LAYAR ERROR (mode perbaikan)
 * true  = begitu web dibuka, langsung tampil layar ERROR yang menutupi semuanya
 *         (tidak ada tombol, tidak bisa ditutup, aplikasi di belakangnya tidak dijalankan).
 * false = web berjalan normal seperti biasa.
 */
export const SHOW_SERVER_ERROR = false;

export default function ServerErrorScreen() {
  // Kunci scroll supaya tidak ada yang bisa digeser
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] bg-dots flex items-center justify-center p-5 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      <div className="w-full max-w-sm glass-card-glow rounded-3xl overflow-hidden animate-pop-in">
        {/* Pita merah ERROR */}
        <div className="bg-[#e53935] border-b-[3px] border-[#141414] px-5 pt-6 pb-5 flex flex-col items-center gap-3">
          <div className="animate-err-shake w-20 h-20 rounded-2xl bg-[#fffdf5] border-[3px] border-[#141414] shadow-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-11 h-11"
              fill="none"
              stroke="#141414"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="7" rx="2" />
              <rect x="3" y="14" width="18" height="7" rx="2" />
              <path d="M7 6.5h.01M7 17.5h.01" />
              <path d="M13 6.5h5M13 17.5h2" />
              <path d="M16.5 15.5l3 3m0-3l-3 3" stroke="#e53935" strokeWidth="2.4" />
            </svg>
          </div>
          <h1 className="font-cyber text-5xl text-white tracking-widest leading-none">ERROR</h1>
        </div>

        {/* Isi pesan */}
        <div className="px-6 py-6 flex flex-col items-center text-center gap-3">
          <p className="text-base font-extrabold text-[#141414] leading-snug">
            Mohon maaf terjadi kesalahan di server
          </p>
          <p className="inline-block px-3 py-1 rounded-full bg-[#ffd93d] border-2 border-[#141414] shadow-sm text-sm font-bold text-[#141414]">
            Coba lagi nanti
          </p>
          <div className="w-full border-t-2 border-dashed border-[#141414]/40 my-1" />
          <p className="text-xs leading-relaxed text-[#4b463a]">
            Join saluran WhatsApp <span className="font-bold text-[#141414]">AnitaOfficial</span> untuk
            mendapatkan info terbaru jika masalah sudah diatasi
          </p>
        </div>
      </div>
    </div>
  );
}
