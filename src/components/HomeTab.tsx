import React from 'react';
import { PLATFORMS } from '../utils/detector';
import {
  User,
  Smartphone,
  Battery,
  BatteryCharging,
  Crown,
  Layers,
  ExternalLink,
  Play,
  HardDrive,
  Download,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Music,
  FileText,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { UserProfile, DownloadTask, DownloadHistoryItem } from '../types';

interface HomeTabProps {
  user: UserProfile;
  device: string;
  batteryLevel: number;
  batteryCharging: boolean;
  totalDownloads: number;
  homeVideoUrl?: string;
  onOpenWhatsApp: () => void;
  onOpenYouTube: () => void;
  activeTasks: DownloadTask[];
  savedFiles: DownloadHistoryItem[];
  hasStoragePermission: boolean;
  storagePath: string;
  onRequestStoragePermission?: () => void;
  onPlayMedia: (item: {
    title: string;
    url: string;
    mediaType: 'video' | 'audio' | 'image' | 'file';
    thumbnail?: string;
    storagePath?: string;
  }) => void;
  onNavigateDownloader: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  user,
  device,
  batteryLevel,
  batteryCharging,
  totalDownloads,
  homeVideoUrl,
  onOpenWhatsApp,
  onOpenYouTube,
  activeTasks,
  savedFiles,
  hasStoragePermission,
  storagePath,
  onPlayMedia,
  onNavigateDownloader,
}) => {
  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* 1. Live Video Player Hero Card (Rasio Wajib 16:9, Bisa Dikustomisasi) */}
      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border-2 border-[#141414] shadow-[3px_3px_0_#141414] bg-[#fffdf5]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#070e1b] via-transparent to-transparent z-10 pointer-events-none" />

        <video
          key={homeVideoUrl || 'default-live'}
          src={homeVideoUrl || '/assets/aistudio/live_video_h264.mp4'}
          poster="/assets/aistudio/video_poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          onError={(e) => console.warn('Hero live video notice', e)}
          className="w-full h-full object-cover"
        />

        {/* Top-Left: LIVE Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fffdf5] border-2 border-[#141414] shadow-md ">
          <span className="w-2 h-2 rounded-full bg-[#ff5a4f] animate-pulse-live" />
          <span className="text-[11px] font-bold tracking-widest text-[#c1121f] font-cyber">LIVE</span>
        </div>

        {/* Top-Right: Stream badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffe9a0]  border-2 border-[#141414] text-[10px] text-[#d62828]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffd93d] animate-ping" />
          <span>Live Stream</span>
        </div>
      </div>

      {/* 2. Kartu Info (Information Card) */}
      <div className="glass-card rounded-2xl p-4 flex flex-col divide-y divide-[#141414]/25 shadow-xl">
        {/* Username */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 text-[#4b463a] text-sm">
            <User className="w-4 h-4 text-[#6a6455]" />
            <span className="font-medium">Username</span>
          </div>
          <span className="text-sm font-semibold text-[#d62828] tracking-wide font-cyber">
            {user.username}
          </span>
        </div>

        {/* Perangkat */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 text-[#4b463a] text-sm">
            <Smartphone className="w-4 h-4 text-[#6a6455]" />
            <span className="font-medium">Perangkat</span>
          </div>
          <span className="text-sm font-semibold text-[#d62828] tracking-wide font-cyber">
            {device}
          </span>
        </div>

        {/* Baterai */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 text-[#4b463a] text-sm">
            {batteryCharging ? (
              <BatteryCharging className="w-4 h-4 text-[#17803a] animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-[#6a6455]" />
            )}
            <span className="font-medium">Baterai</span>
          </div>
          <span className="text-sm font-semibold text-[#d62828] tracking-wide font-cyber">
            {batteryLevel}%
          </span>
        </div>

        {/* Role */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 text-[#4b463a] text-sm">
            <Crown className="w-4 h-4 text-[#6a6455]" />
            <span className="font-medium">Role</span>
          </div>
          <span className="text-xs font-bold text-[#d62828] tracking-wider flex items-center gap-1.5 font-cyber">
            <svg className="w-2.5 h-2.5 fill-[#d62828] shrink-0" viewBox="0 0 24 24">
              <polygon points="12,2 22,12 12,22 2,12" />
            </svg>
            <span>{user.role}</span>
            <svg className="w-2.5 h-2.5 fill-[#d62828] shrink-0" viewBox="0 0 24 24">
              <polygon points="12,2 22,12 12,22 2,12" />
            </svg>
          </span>
        </div>

        {/* Platform Didukung */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 text-[#4b463a] text-sm">
            <Layers className="w-4 h-4 text-[#6a6455]" />
            <span className="font-medium">Platform Didukung</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828]">
              {Object.keys(PLATFORMS).length} Platform
            </span>
            <span className="text-xs text-[#6a6455]">({totalDownloads} unduhan)</span>
          </div>
        </div>
      </div>

      {/* 3. Action Buttons WhatsApp & YouTube */}
      <div className="flex flex-col gap-3 mt-1">
        {/* Tombol Saluran WhatsApp AnitaOffc */}
        <button
          onClick={onOpenWhatsApp}
          aria-label="Bergabung ke Saluran WhatsApp AnitaOffc"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#4ade80] text-[#141414] font-semibold shadow-lg  hover:brightness-110 active:scale-[0.99] transition-all"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
          </svg>
          <span className="text-base tracking-wide">Saluran WhatsApp AnitaOffc</span>
          <ExternalLink className="w-4 h-4 ml-auto opacity-80" />
        </button>

        {/* Tombol Channel YouTube @anitaofficial_id */}
        <button
          onClick={onOpenYouTube}
          aria-label="Kunjungi Channel YouTube AnitaOffc"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] text-[#141414] font-semibold shadow-lg  hover:border-[#141414] hover:bg-[#fffdf5] active:scale-[0.99] transition-all"
        >
          <div className="w-6 h-6 rounded-md bg-[#ff5a4f] flex items-center justify-center shadow-md ">
            <Play className="w-3.5 h-3.5 fill-white text-[#141414] ml-0.5" />
          </div>
          <span className="text-base tracking-wide">Channel YouTube @anitaofficial_id</span>
          <ExternalLink className="w-4 h-4 ml-auto text-[#6a6455]" />
        </button>
      </div>

      {/* 4. DOWNLOADING PROCESS & STORAGE STATUS */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 border-2 border-[#141414] shadow-xl mt-1">
        {/* Header Widget */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#d62828]" />
            <h4 className="text-xs font-bold text-[#141414] font-cyber tracking-wider">
              PROSES DOWNLOADING & PENYIMPANAN
            </h4>
          </div>

          <div
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              hasStoragePermission
                ? 'bg-[#c9f2d4] text-[#17803a] border-2 border-[#141414]'
                : 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-[#17803a]" />
            <span>{hasStoragePermission ? 'Izin Aktif' : 'Penyimpanan Siap'}</span>
          </div>
        </div>

        {/* Directory Target Bar */}
        <div className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#6a6455]">Lokasi Simpan Perangkat:</span>
            <span className="font-mono text-[#d62828] text-[11px] truncate">{storagePath}</span>
          </div>
          <span className="text-[10px] text-[#6a6455] font-mono">movies/NitaCantik</span>
        </div>

        {/* Active Downloading Tasks */}
        {activeTasks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-2 shadow-md animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-[#ffd93d] animate-ping shrink-0" />
                    <span className="text-xs font-bold text-[#141414] truncate">{task.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#d62828] font-bold shrink-0">
                    {task.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#fffdf5] overflow-hidden border-2 border-[#141414]">
                  <div
                    className="h-full bg-[#ffd93d] transition-all duration-300 shadow-[3px_3px_0_#141414]"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#6a6455]">
                  <span>Kecepatan: {task.speed}</span>
                  <span>
                    {task.downloadedSize} / {task.totalSize}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t-2 border-[#141414] text-[10px]">
                  <span className="text-[#d62828] font-medium flex items-center gap-1">
                    <Download className="w-3 h-3 animate-bounce" />
                    <span>
                      {task.status === 'saving'
                        ? 'Menyimpan ke memori perangkat...'
                        : 'Sedang mengunduh...'}
                    </span>
                  </span>
                  <span className="text-[#6a6455] font-mono truncate max-w-[140px]">
                    {task.targetPath.split('/').pop()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#6a6455]">
              <CheckCircle2 className="w-4 h-4 text-[#d62828]" />
              <span>Tidak ada unduhan berjalan. Siap mengunduh file baru.</span>
            </div>
            <button
              onClick={onNavigateDownloader}
              className="text-[11px] font-bold text-[#d62828] hover:text-[#d62828] underline"
            >
              Unduh Sekarang ›
            </button>
          </div>
        )}

        {/* 5. Berkas Tersimpan di Direktori (storage/movies/NitaCantik/hasildownload) */}
        {savedFiles.length > 0 && (
          <div className="flex flex-col gap-2 mt-1 pt-2 border-t-2 border-[#141414]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4b463a] flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5 text-[#d62828]" />
                <span>File Tersimpan di Perangkat ({savedFiles.length})</span>
              </span>
              <span className="text-[10px] text-[#17803a] font-mono">Tersimpan Lokal</span>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {savedFiles.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center justify-between gap-2 hover:border-[#141414] transition-all"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] flex items-center justify-center shrink-0 text-[#d62828]">
                      {file.mediaType === 'audio' ? (
                        <Music className="w-4 h-4" />
                      ) : file.mediaType === 'video' ? (
                        <Play className="w-4 h-4 fill-current" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-[#141414] truncate">{file.title}</p>
                      <p className="text-[10px] text-[#6a6455] font-mono truncate">
                        {file.localPath || file.platformName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        onPlayMedia({
                          title: file.title,
                          url: file.downloadUrl,
                          mediaType: file.mediaType,
                          thumbnail: file.thumbnail,
                          storagePath: file.localPath,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#ffe9a0] hover:bg-[#ffe9a0] text-[#d62828] text-[11px] font-semibold border-2 border-[#141414] flex items-center gap-1 active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Putar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
