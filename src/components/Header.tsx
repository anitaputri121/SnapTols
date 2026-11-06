import React from 'react';
import { Menu, Bot, Music, MessageSquare } from 'lucide-react';
import { YouTubeLogo } from '../snaptube/YouTubeLogo';

interface HeaderProps {
  onToggleSidebar: () => void;
  isMusicPlaying: boolean;
  isSpotifyActive?: boolean;
  isSpotifyPlaying?: boolean;
  onOpenSpotify: () => void;
  onOpenSnapingChat: () => void;
  isSnapTubeActive?: boolean;
  onOpenSnapTube: () => void;
  onOpenWhatsApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isMusicPlaying,
  isSpotifyActive,
  isSpotifyPlaying = false,
  onOpenSpotify,
  onOpenSnapingChat,
  isSnapTubeActive,
  onOpenSnapTube,
  onOpenWhatsApp,
}) => {
  const audioOn = isMusicPlaying || isSpotifyPlaying;
  const circleBtn =
    'w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#fffdf5] text-[#141414] border-2 border-[#141414] shadow-sm flex items-center justify-center shrink-0';
  return (
    <header className="sticky top-0 z-40 w-full bg-[#e53935] border-b-[3px] border-[#141414] px-3.5 py-2.5">
      <div className="w-full max-w-none md:max-w-md mx-auto flex items-center justify-between gap-1 sm:gap-2 min-w-0">
        {/* Left: Hamburger & Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            onClick={onToggleSidebar}
            aria-label="Buka Menu"
            className="w-9 h-9 shrink-0 rounded-xl bg-[#fffdf5] text-[#141414] border-2 border-[#141414] shadow-sm flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-[#141414] shadow-sm shrink-0 bg-[#fffdf5]">
              <img
                src="/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg"
                alt="SnapTools Logo"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-cyber text-sm min-[380px]:text-base sm:text-lg text-white tracking-wide truncate max-w-[104px] min-[420px]:max-w-[150px] sm:max-w-none">
                SnapTools
              </span>
              <span className="text-[9px] text-[#fff3c4] font-mono tracking-tight">
                VIP MULTI FUNGSI
              </span>
            </div>
          </div>
        </div>

        {/* Right: Icon Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Robot AI Chatbot (snaping) */}
          <button
            onClick={onOpenSnapingChat}
            aria-label="Chat Bersama snaping AI"
            title="Ngobrol Santai bersama AI snaping"
            className={circleBtn}
          >
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Spotify Music Page Button */}
          <button
            onClick={onOpenSpotify}
            aria-label={isSpotifyActive ? 'Kembali dari Spotify' : 'Buka Halaman Spotify'}
            title={isSpotifyActive ? 'Kembali ke Beranda' : 'Buka Pemutar Musik'}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0 border-2 border-[#141414] shadow-sm text-[#141414] ${
              isSpotifyActive
                ? 'bg-[#4ade80]'
                : isMusicPlaying || isSpotifyPlaying
                ? 'bg-[#ffd93d]'
                : 'bg-[#fffdf5]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
          </button>

          {/* Equalizer Visualizer Bars */}
          <div
            className={`flex items-end gap-0.5 px-1.5 py-1.5 rounded-full border-2 border-[#141414] bg-[#fffdf5] shrink-0 ${
              audioOn ? 'shadow-sm' : ''
            }`}
            title={audioOn ? 'Audio Aktif' : 'Audio Nonaktif'}
          >
            <span
              className={`w-0.5 rounded-full ${
                isSpotifyPlaying ? 'bg-[#16883c]' : 'bg-[#141414]'
              } ${audioOn ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'}`}
            />
            <span
              className={`w-0.5 rounded-full ${
                isSpotifyPlaying ? 'bg-[#16883c]' : 'bg-[#141414]'
              } ${audioOn ? 'h-4 animate-bounce' : 'h-2.5 opacity-40'}`}
            />
            <span
              className={`w-0.5 rounded-full ${
                isSpotifyPlaying ? 'bg-[#16883c]' : 'bg-[#141414]'
              } ${audioOn ? 'h-2 animate-pulse' : 'h-1 opacity-40'}`}
            />
            <span
              className={`w-0.5 rounded-full ${
                isSpotifyPlaying ? 'bg-[#16883c]' : 'bg-[#141414]'
              } ${audioOn ? 'h-3.5 animate-bounce' : 'h-2 opacity-40'}`}
            />
          </div>

          {/* SnapTube (video YouTube) */}
          <button
            onClick={onOpenSnapTube}
            aria-label={isSnapTubeActive ? 'Kembali dari SnapTube' : 'Buka SnapTube'}
            title={isSnapTubeActive ? 'Kembali ke Beranda' : 'Buka SnapTube'}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0 border-2 border-[#141414] shadow-sm text-[#141414] ${
              isSnapTubeActive ? 'bg-[#ffd93d]' : 'bg-[#fffdf5]'
            }`}
          >
            <YouTubeLogo className="w-4 h-[11px] sm:w-[18px] sm:h-3" />
          </button>

          {/* Quick Chat / WhatsApp Channel button */}
          <button
            onClick={onOpenWhatsApp}
            aria-label="Gabung Saluran WhatsApp"
            className="flex items-center gap-1 px-2 sm:px-2.5 h-7 sm:h-8 rounded-full bg-[#ffd93d] border-2 border-[#141414] shadow-sm text-[#141414] text-xs font-bold transition-all shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saluran</span>
          </button>
        </div>
      </div>
    </header>
  );
};
