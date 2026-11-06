import React from 'react';
import { PLATFORMS } from '../utils/detector';
import {
  X,
  Home,
  Download,
  User,
  ExternalLink,
  Crown,
  Radio,
  Shield,
  Layers,
  Sparkles,
  Wrench,
  Tv,
  BookOpen,
  Heart,
  Clapperboard,
  Music,
} from 'lucide-react';
import { TabType } from '../types';
import { YouTubeLogo } from '../snaptube/YouTubeLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenWhatsApp: () => void;
  onOpenYouTube: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  onOpenWhatsApp,
  onOpenYouTube,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-72 max-w-[80vw] h-full bg-[#fffdf5] border-r-2 border-[#141414] flex flex-col justify-between p-5 shadow-2xl z-10 animate-slide-left">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#141414]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#141414] shadow-lg  shrink-0 bg-[#fffdf5]">
                <img
                  src="/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg"
                  alt="SnapTool Logo"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs font-cyber text-[#d62828] tracking-wider">
                  SnapTools
                </span>
                <span className="text-[10px] text-[#6a6455]">Official Release</span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup Menu"
              className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#6a6455] tracking-wider font-cyber">
              MENU UTAMA
            </span>

            <button
              onClick={() => {
                onChangeTab('spotify');
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'spotify'
                  ? 'bg-[#c9f2d4] text-[#16883c] border-2 border-[#141414] shadow-[3px_3px_0_#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Music className="w-4 h-4 text-[#16883c]" />
                <span className="font-bold text-[#141414]">SnapTools Music</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c9f2d4] text-[#16883c] border-2 border-[#141414]">
                Musik
              </span>
            </button>

            <button
              onClick={() => {
                onChangeTab('snaptube');
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'snaptube'
                  ? 'bg-[#ffd6d2] text-[#c1121f] border-2 border-[#141414] shadow-[3px_3px_0_#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <YouTubeLogo className="w-4 h-[11px]" />
                <span className="font-bold text-[#141414]">SnapTube</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffd6d2] text-[#c1121f] border-2 border-[#141414]">
                Video
              </span>
            </button>

            <button
              onClick={() => {
                onChangeTab('tools');
                onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'tools'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <Wrench className="w-4 h-4 text-[#d62828]" />
              <span>Tools & Utilities (11 Tools)</span>
            </button>

            <button
              onClick={() => {
                onChangeTab('downloader');
                onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'downloader'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <Download className="w-4 h-4 text-[#d62828]" />
              <span>Multi Fungsi ({Object.keys(PLATFORMS).length} Platform)</span>
            </button>

            <button
              onClick={() => {
                onChangeTab('anime');
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'anime'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tv className="w-4 h-4 text-[#d62828]" />
                <span>Nonton Anime</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]">
                Stream
              </span>
            </button>

            <button
              onClick={() => {
                onChangeTab('komik');
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'komik'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#d62828]" />
                <span>Baca Komik</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]">
                Manga
              </span>
            </button>

            <button
              onClick={() => {
                onChangeTab('dramabox');
                onClose();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dramabox'
                  ? 'bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] shadow-[3px_3px_0_#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clapperboard className="w-4 h-4 text-[#c2255c]" />
                <span>Nonton DramaBox</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414]">
                VIP Short
              </span>
            </button>

            <button
              onClick={() => {
                onChangeTab('home');
                onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <Home className="w-4 h-4 text-[#d62828]" />
              <span>Beranda & Live Stream</span>
            </button>

            <button
              onClick={() => {
                onChangeTab('profile');
                onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]'
                  : 'text-[#4b463a] hover:bg-[#fffdf5]'
              }`}
            >
              <User className="w-4 h-4 text-[#d62828]" />
              <span>Profil & Akun</span>
            </button>
          </div>

          {/* Official Channel Links */}
          <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#141414]">
            <span className="text-[11px] font-bold text-[#6a6455] tracking-wider font-cyber">
              SALURAN RESMI
            </span>

            <button
              onClick={() => {
                onOpenWhatsApp();
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#c9f2d4] border-2 border-[#141414] text-[#17803a] text-xs font-medium hover:bg-[#c9f2d4]"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                <span>Saluran WhatsApp</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              onClick={() => {
                onOpenYouTube();
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs font-medium hover:bg-[#ffc0ba]"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff5a4f]" />
                <span>YouTube @anitaofficial_id</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Tombol Donasi Saweria */}
            <a
              href="https://saweria.co/anitaofficial"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#ffb703] border-2 border-[#141414] text-[#a85d00] text-xs font-medium hover:brightness-125 transition-all shadow-md "
            >
              <span className="flex items-center gap-2 font-semibold">
                <Heart className="w-3.5 h-3.5 text-[#a85d00] fill-[#a85d00] animate-pulse" />
                <span>Dukung & Donasi (Saweria)</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-[#a85d00] opacity-80" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-[#141414] flex flex-col gap-1 text-[11px] text-[#6a6455]">
          <div className="flex items-center justify-between">
            <span>Status Server API</span>
            <span className="text-[#17803a] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-[10px] text-[#6a6455] mt-1">© 2026 AnitaOffc. Multi Fungsi System.</p>
        </div>
      </div>
    </div>
  );
};
