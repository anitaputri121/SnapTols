import React from 'react';
import { Home, Download, User, Wrench } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  hidden?: boolean;
}

const NAV_ITEMS: { tab: TabType; label: string; aria: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  // 1. Samping Kiri Downloader: Tools
  { tab: 'tools', label: 'Tools', aria: 'Menu Tools', Icon: Wrench },
  // 2. Menu Downloader
  { tab: 'downloader', label: 'Downloader', aria: 'Menu Downloader', Icon: Download },
  // 3. Menu Beranda
  { tab: 'home', label: 'Beranda', aria: 'Menu Beranda', Icon: Home },
  // 4. Menu Profil
  { tab: 'profile', label: 'Profil', aria: 'Menu Profil', Icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, hidden = false }) => {
  const activeIndex = NAV_ITEMS.findIndex((item) => item.tab === activeTab);

  return (
    <nav
      aria-hidden={hidden}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#fffdf5] border-t-[3px] border-[#141414] pt-2.5 pb-2 px-3 sm:px-4 transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hidden ? 'translate-y-full pointer-events-none' : 'translate-y-0'}`}
    >
      <div className="relative w-full max-w-none md:max-w-md mx-auto grid grid-cols-4 items-start text-center">
        {/* Kotak kuning yang meluncur ke tab aktif */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 w-1/4 h-[46px] flex justify-center pointer-events-none transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex < 0 ? 0 : 1,
          }}
        >
          <span className="w-12 h-full rounded-2xl bg-[#ffd93d] border-[2.5px] border-[#141414] shadow-md" />
        </span>

        {NAV_ITEMS.map(({ tab, label, aria, Icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChangeTab(tab)}
              aria-label={aria}
              className="relative flex flex-col items-center justify-start gap-1 rounded-xl"
            >
              <span
                className={`h-[46px] w-12 flex items-center justify-center ${
                  isActive ? 'animate-nav-bounce' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-[#141414]' : 'text-[#6a6455]'
                  }`}
                />
              </span>
              <span
                className={`font-cyber text-[11px] sm:text-xs uppercase tracking-wide leading-none transition-colors duration-200 ${
                  isActive ? 'text-[#d62828]' : 'text-[#6a6455]'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
