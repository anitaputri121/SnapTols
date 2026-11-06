import React from 'react';
import { X, Play, Music, FileText, Download, HardDrive, CheckCircle2 } from 'lucide-react';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  mediaType: 'video' | 'audio' | 'image' | 'file';
  thumbnail?: string;
  storagePath?: string;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  mediaType,
  thumbnail,
  storagePath,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85  flex items-center justify-center p-3.5 sm:p-5 animate-fade-in">
      <div className="w-full max-w-lg glass-card rounded-3xl p-5 border-2 border-[#141414] shadow-2xl flex flex-col gap-3.5 text-[#141414] max-h-[90vh] overflow-y-auto animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffe9a0] text-[#d62828] flex items-center justify-center">
              {mediaType === 'video' ? (
                <Play className="w-4 h-4 fill-current" />
              ) : mediaType === 'audio' ? (
                <Music className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#141414] line-clamp-1">{title}</h4>
              <p className="text-[10px] text-[#d62828] font-cyber">PEMUTAR MEDIA DALAM APLIKASI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Pemutar"
            className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Player Area */}
        <div className="w-full rounded-2xl overflow-hidden bg-black/70 border-2 border-[#141414] flex items-center justify-center min-h-[180px]">
          {mediaType === 'video' ? (
            <video
              src={url}
              poster={thumbnail || undefined}
              controls
              autoPlay
              playsInline
              onError={(e) => console.warn('Modal video load notice', e)}
              className="w-full max-h-[50vh] object-contain rounded-xl"
            />
          ) : mediaType === 'audio' ? (
            <div className="w-full p-5 flex flex-col items-center gap-3">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-[#141414]"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#ffe9a0] border-2 border-[#141414] flex items-center justify-center text-[#d62828]">
                  <Music className="w-10 h-10 animate-pulse" />
                </div>
              )}
              <audio src={url} controls autoPlay className="w-full mt-2" />
            </div>
          ) : mediaType === 'image' ? (
            <img
              src={url}
              alt={title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full max-h-[50vh] object-contain"
            />
          ) : (
            <div className="p-6 text-center flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-[#d62828]" />
              <p className="text-xs text-[#4b463a]">Berkas Siap Dibuka di Perangkat</p>
            </div>
          )}
        </div>

        {/* Storage Location Badge */}
        {storagePath && (
          <div className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center gap-2 text-xs">
            <HardDrive className="w-4 h-4 text-[#d62828] shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-[#6a6455]">Lokasi Penyimpanan Perangkat:</p>
              <p className="text-[11px] font-mono text-[#d62828] truncate">{storagePath}</p>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold hover:bg-[#efe3c3]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
