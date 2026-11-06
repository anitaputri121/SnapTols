import React from 'react';
import { FolderDown, ShieldCheck, HardDrive, Check, X, FolderCheck } from 'lucide-react';

interface StoragePermissionModalProps {
  isOpen: boolean;
  storagePath: string;
  onGrantPermission: () => void;
  onDenyPermission: () => void;
}

export const StoragePermissionModal: React.FC<StoragePermissionModalProps> = ({
  isOpen,
  storagePath,
  onGrantPermission,
  onDenyPermission,
}) => {
  if (!isOpen) return null;

  const handleGrant = async () => {
    // If browser supports real File System Access API directory picker, trigger it
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        if (dirHandle) {
          (window as any).__anita_dir_handle = dirHandle;
        }
      } catch (err: any) {
        // User cancelled picker or permission denied; still fallback to standard filesystem download
      }
    }
    onGrantPermission();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85  flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm glass-card rounded-3xl p-6 border-2 border-[#141414] shadow-[3px_3px_0_#141414] flex flex-col gap-4 text-[#141414] animate-pop-in">
        {/* Header Icon with User Uploaded Anime App Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#141414] shadow-lg  shrink-0 bg-[#fffdf5]">
            <img
              src="/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg"
              alt="SnapTools Icon"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#141414] font-cyber tracking-wide">
              IZIN KELOLA FILE PERANGKAT
            </h3>
            <p className="text-[11px] text-[#d62828]">Penyimpanan Nyata ke Memori Perangkat</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#4b463a] leading-relaxed">
          Agar file dan video benar-benar tersimpan ke dalam memori penyimpanan perangkat Anda (bukan sekadar pajangan), izinkan aplikasi untuk mengelola direktori berikut:
        </p>

        {/* Storage Path Box */}
        <div className="p-3 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-1.5 shadow-inner">
          <span className="text-[10px] text-[#6a6455] flex items-center gap-1 font-semibold">
            <HardDrive className="w-3 h-3 text-[#d62828]" />
            <span>DIREKTORI PENYIMPANAN TARGET:</span>
          </span>
          <code className="text-xs font-mono text-[#d62828] break-all select-all font-semibold">
            {storagePath}
          </code>
        </div>

        {/* Feature bullets */}
        <div className="flex flex-col gap-2 text-xs text-[#4b463a]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#c9f2d4] text-[#17803a] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" />
            </span>
            <span>Berkas tersimpan asli di File Manager / Galeri</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#c9f2d4] text-[#17803a] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" />
            </span>
            <span>Dapat diputar offline dengan pemutar bawaan HP/PC</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#c9f2d4] text-[#17803a] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" />
            </span>
            <span>Unduh langsung tanpa beralih ke website lain</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={handleGrant}
            className="w-full py-3 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-sm tracking-wide shadow-lg  active:scale-[0.99] transition-all font-cyber flex items-center justify-center gap-2"
          >
            <FolderCheck className="w-4 h-4" />
            <span>IZINKAN PENGELOLAAN FILE</span>
          </button>

          <button
            onClick={onDenyPermission}
            className="w-full py-2.5 px-4 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] text-[#6a6455] text-xs font-medium transition-all"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
};
