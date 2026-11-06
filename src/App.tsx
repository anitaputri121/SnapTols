import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { DownloaderTab } from './components/DownloaderTab';
import { ToolsTab } from './components/ToolsTab';
import { AnimeTab } from './components/AnimeTab';
import { KomikTab } from './components/KomikTab';
import { DramaboxTab } from './components/DramaboxTab';
import { SpotifyPage } from './spotify/SpotifyPage';
import { SnapTubePage } from './snaptube/SnapTubePage';
import { engineStore } from './spotify/engine';
import { useStore } from './spotify/store';
import { SnapingChat } from './components/SnapingChat';
import { ProfileTab } from './components/ProfileTab';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { StoragePermissionModal } from './components/StoragePermissionModal';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { TabType, UserProfile, DownloadHistoryItem, DownloadTask } from './types';
import { useBattery } from './utils/battery';
import { detectDevice } from './utils/detector';
import { cyberAudio } from './utils/audio';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { initScrollReveal } from './utils/scrollReveal';

// Urutan tab, dipakai supaya halaman bergeser sesuai arah (kanan/kiri)
const TAB_ORDER: Record<TabType, number> = {
  tools: 0,
  downloader: 1,
  home: 2,
  profile: 3,
  anime: 4,
  komik: 5,
  dramabox: 6,
  spotify: 7,
  snaptube: 8,
};

// Halaman yang punya alamat sendiri (tab bawah disembunyikan, header tetap)
const SUB_TABS: TabType[] = ['spotify', 'snaptube'];
const isSubTab = (t: TabType) => SUB_TABS.includes(t);
const tabFromPath = (p: string): TabType | null =>
  /^\/spotify\/?$/i.test(p) ? 'spotify' : /^\/snaptube\/?$/i.test(p) ? 'snaptube' : null;
const pathForTab = (t: TabType) => (t === 'spotify' ? '/spotify' : t === 'snaptube' ? '/SnapTube' : '/');

const pageVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 34, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -34, scale: 0.98 }),
};

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8dmsUElagkVPIw9X2P';
const YOUTUBE_CHANNEL_URL = 'https://youtube.com/@anitaofficial_id';

const DEFAULT_USER: UserProfile = {
  username: '',
  name: '',
  password: '',
  email: '',
  birthDate: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  role: 'VIP MEMBER',
  isLoggedIn: false,
  hasStoragePermission: false,
  storagePath: 'storage/movies/NitaCantik/hasildownload',
  googleAccount: null,
};

export default function App() {
  const [activeTab, setActiveTabRaw] = useState<TabType>(
    () => (typeof window !== 'undefined' ? tabFromPath(window.location.pathname) : null) ?? 'home'
  );
  const [spotifyOpened, setSpotifyOpened] = useState(() => activeTab === 'spotify');
  const spotifyPlaying = useStore(engineStore).playing;

  // Pindah tab + sinkronkan alamat: Spotify = /spotify, SnapTube = /SnapTube, lainnya = /
  const tabRef = useRef<TabType>(activeTab);
  const setActiveTab = (tab: TabType) => {
    const prev = tabRef.current;
    if (prev === tab) return;
    try {
      if (isSubTab(tab)) window.history.pushState({ ...(window.history.state || {}), sp: 0, st: 0 }, '', pathForTab(tab));
      else if (isSubTab(prev)) window.history.pushState({}, '', '/');
    } catch {}
    tabRef.current = tab;
    setActiveTabRaw(tab);
    if (tab === 'spotify') setSpotifyOpened(true);
  };

  // Tombol back perangkat: ikuti alamat
  useEffect(() => {
    const onPop = () => {
      const fromPath = tabFromPath(window.location.pathname);
      const isSp = fromPath === 'spotify';
      const next: TabType = fromPath ?? (isSubTab(tabRef.current) ? 'home' : tabRef.current);
      tabRef.current = next;
      setActiveTabRaw(next);
      if (isSp) setSpotifyOpened(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isSnapingOpen, setIsSnapingOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Arah transisi halaman (1 = maju/kanan, -1 = mundur/kiri)
  const lastTabRef = useRef<TabType>('home');
  const directionRef = useRef<number>(1);
  if (lastTabRef.current !== activeTab) {
    directionRef.current = TAB_ORDER[activeTab] >= TAB_ORDER[lastTabRef.current] ? 1 : -1;
    lastTabRef.current = activeTab;
  }

  // Animasi muncul saat scroll
  useEffect(() => initScrollReveal(), []);

  // Storage permission modal state
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [pendingDownloadCallback, setPendingDownloadCallback] = useState<(() => void) | null>(null);

  // Media Player Modal state
  const [mediaPreview, setMediaPreview] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    mediaType: 'video' | 'audio' | 'image' | 'file';
    thumbnail?: string;
    storagePath?: string;
  }>({
    isOpen: false,
    title: '',
    url: '',
    mediaType: 'video',
  });

  // User Profile from LocalStorage
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('anita_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_USER;
  });

  // Download History from LocalStorage
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('anita_download_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Custom Home Video (Rasio 16:9, Maks 10 MB)
  const [homeVideoUrl, setHomeVideoUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('anita_home_video');
      if (saved) return saved;
    } catch {}
    return '/assets/aistudio/live_video_h264.mp4';
  });

  const handleUpdateHomeVideo = (newVideoUrl: string) => {
    setHomeVideoUrl(newVideoUrl);
    try {
      localStorage.setItem('anita_home_video', newVideoUrl);
    } catch {}
  };

  // Active Download Tasks (Real-time progress)
  const [activeTasks, setActiveTasks] = useState<DownloadTask[]>([]);

  // Battery status & device detection
  const battery = useBattery();
  const [device, setDevice] = useState('Android');

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.userAgent) {
      setDevice(detectDevice(navigator.userAgent));
    }
  }, []);

  // Save profile changes
  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('anita_user_profile', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast('Profil berhasil diperbarui!');
  };

  // Login Success Handler
  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    try {
      localStorage.setItem('anita_user_profile', JSON.stringify(profile));
    } catch {}
    showToast(`Selamat datang, ${profile.name || profile.username}!`);
  };

  // Handle Logout
  const handleLogout = () => {
    const loggedOutUser: UserProfile = {
      ...DEFAULT_USER,
      isLoggedIn: false,
    };
    setUser(loggedOutUser);
    try {
      localStorage.setItem('anita_user_profile', JSON.stringify(loggedOutUser));
    } catch {}
    showToast('Anda telah keluar. Silakan login kembali.');
  };

  // Request Storage Permission
  const handleRequestStoragePermission = (onGranted?: () => void) => {
    if (onGranted) {
      setPendingDownloadCallback(() => onGranted);
    }
    setShowStorageModal(true);
  };

  const handleGrantStoragePermission = () => {
    handleUpdateProfile({ hasStoragePermission: true });
    setShowStorageModal(false);
    showToast(`Izin diberikan! Target: ${user.storagePath || 'storage/movies/NitaCantik/hasildownload'}`);
    if (pendingDownloadCallback) {
      pendingDownloadCallback();
      setPendingDownloadCallback(null);
    }
  };

  // Start Download Task with real-time progression in Beranda
  const handleStartDownloadTask = (task: DownloadTask) => {
    setActiveTasks((prev) => [task, ...prev]);

    // Progressive real-time simulation
    let currentProgress = 10;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 18) + 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);

        setActiveTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  progress: 100,
                  status: 'completed',
                  downloadedSize: t.totalSize,
                }
              : t
          )
        );

        showToast(`Tersimpan di ${task.targetPath}`);

        // Remove from active tasks after 4 seconds
        setTimeout(() => {
          setActiveTasks((prev) => prev.filter((t) => t.id !== task.id));
        }, 4000);
      } else {
        setActiveTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  progress: currentProgress,
                  status: currentProgress > 85 ? 'saving' : 'downloading',
                  downloadedSize: `${((parseFloat(t.totalSize) * currentProgress) / 100).toFixed(1)} MB`,
                }
              : t
          )
        );
      }
    }, 400);
  };

  // Add history item
  const handleAddHistory = (item: DownloadHistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev];
      try {
        localStorage.setItem('anita_download_history', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('anita_download_history');
    } catch {}
    showToast('Riwayat unduhan telah dibersihkan.');
  };

  // Toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Ambient sound toggle
  const handleToggleMusic = () => {
    const isNowPlaying = cyberAudio.toggle();
    setIsMusicPlaying(isNowPlaying);
    if (isNowPlaying) {
      showToast('Musik Ambient Cyber diaktifkan');
    } else {
      showToast('Musik dimatikan');
    }
  };

  // External link handlers
  const handleOpenWhatsApp = () => {
    window.open(WHATSAPP_CHANNEL_URL, '_blank', 'noopener,noreferrer');
  };

  const handleOpenYouTube = () => {
    window.open(YOUTUBE_CHANNEL_URL, '_blank', 'noopener,noreferrer');
  };

  // Open In-App Media Player
  const handlePlayMedia = (item: {
    title: string;
    url: string;
    mediaType: 'video' | 'audio' | 'image' | 'file';
    thumbnail?: string;
    storagePath?: string;
  }) => {
    setMediaPreview({
      isOpen: true,
      title: item.title,
      url: item.url,
      mediaType: item.mediaType,
      thumbnail: item.thumbnail,
      storagePath: item.storagePath || user.storagePath,
    });
  };

  // JIKA BELUM LOGIN: WAJIB LOGIN TERLEBIH DAHULU (Sesuai Permintaan User)
  if (!user.isLoggedIn) {
    return (
      <div className="animate-page-in">
        <AuthScreen onSuccessLogin={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#141414] flex flex-col items-center selection:bg-[#ffd93d] selection:text-[#141414]">
      {/* Latar titik-titik krem */}
      <div className="fixed inset-0 pointer-events-none bg-dots -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-none md:max-w-md min-h-screen flex flex-col relative">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(true)}
          isMusicPlaying={isMusicPlaying}
          isSpotifyActive={activeTab === 'spotify'}
          isSpotifyPlaying={spotifyPlaying}
          onOpenSpotify={() => setActiveTab(activeTab === 'spotify' ? 'home' : 'spotify')}
          onOpenSnapingChat={() => setIsSnapingOpen(true)}
          isSnapTubeActive={activeTab === 'snaptube'}
          onOpenSnapTube={() => setActiveTab(activeTab === 'snaptube' ? 'home' : 'snaptube')}
          onOpenWhatsApp={handleOpenWhatsApp}
        />

        {/* Sidebar Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenYouTube={handleOpenYouTube}
        />

        {/* Dynamic Viewport Content with Smooth Page Transitions */}
        <main className={`flex-1 w-full pt-4 px-3 sm:px-4 overflow-hidden ${isSubTab(activeTab) ? 'hidden' : ''}`}>
          <AnimatePresence mode="wait" custom={directionRef.current}>
            {!isSubTab(activeTab) && (
            <motion.div
              key={activeTab}
              custom={directionRef.current}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {activeTab === 'home' && (
                <HomeTab
                  user={user}
                  device={device}
                  batteryLevel={battery.level}
                  batteryCharging={battery.charging}
                  totalDownloads={history.length}
                  homeVideoUrl={homeVideoUrl}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  onOpenYouTube={handleOpenYouTube}
                  activeTasks={activeTasks}
                  savedFiles={history}
                  hasStoragePermission={user.hasStoragePermission}
                  storagePath={user.storagePath || 'storage/movies/NitaCantik/hasildownload'}
                  onPlayMedia={handlePlayMedia}
                  onNavigateDownloader={() => setActiveTab('downloader')}
                />
              )}

              {activeTab === 'tools' && (
                <ToolsTab />
              )}

              {activeTab === 'downloader' && (
                <DownloaderTab
                  onAddHistory={handleAddHistory}
                  onStartDownloadTask={handleStartDownloadTask}
                  history={history}
                  onClearHistory={handleClearHistory}
                  hasStoragePermission={user.hasStoragePermission}
                  storagePath={user.storagePath || 'storage/movies/NitaCantik/hasildownload'}
                  onPlayMedia={handlePlayMedia}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileTab
                  user={user}
                  totalDownloads={history.length}
                  homeVideoUrl={homeVideoUrl}
                  onUpdateProfile={handleUpdateProfile}
                  onUpdateHomeVideo={handleUpdateHomeVideo}
                  onRequestStoragePermission={() => handleRequestStoragePermission()}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === 'anime' && (
                <AnimeTab onBackToHome={() => setActiveTab('home')} />
              )}

              {activeTab === 'komik' && (
                <KomikTab onBackToHome={() => setActiveTab('home')} />
              )}

              {activeTab === 'dramabox' && (
                <DramaboxTab onBackToHome={() => setActiveTab('home')} />
              )}

            </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Halaman Spotify: di luar pembungkus transform supaya elemen fixed tetap benar.
            Tetap terpasang setelah dibuka, jadi audio & posisi halaman tidak hilang. */}
        {spotifyOpened && (
          <div className="w-full px-3 sm:px-4 pt-4" style={{ display: activeTab === 'spotify' ? 'block' : 'none' }}>
            <SpotifyPage active={activeTab === 'spotify'} />
          </div>
        )}

        {/* Halaman SnapTube: di luar <main> supaya pemutar bisa menempel (sticky) saat scroll */}
        {activeTab === 'snaptube' && (
          <div className="w-full px-3 sm:px-4 pt-4 flex-1">
            <SnapTubePage />
          </div>
        )}

        {/* AI Robot Chatbot (snaping) */}
        <SnapingChat
          isOpen={isSnapingOpen}
          onClose={() => setIsSnapingOpen(false)}
        />

        {/* In-App Media Player Modal */}
        <MediaPreviewModal
          isOpen={mediaPreview.isOpen}
          onClose={() => setMediaPreview({ ...mediaPreview, isOpen: false })}
          title={mediaPreview.title}
          url={mediaPreview.url}
          mediaType={mediaPreview.mediaType}
          thumbnail={mediaPreview.thumbnail}
          storagePath={mediaPreview.storagePath}
        />

        {/* Storage Permission Modal */}
        <StoragePermissionModal
          isOpen={showStorageModal}
          storagePath={user.storagePath || 'storage/movies/NitaCantik/hasildownload'}
          onGrantPermission={handleGrantStoragePermission}
          onDenyPermission={() => setShowStorageModal(false)}
        />

        {/* Toast feedback */}
        {toastMessage && (
          <div key={toastMessage} className="fixed bottom-24 left-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#ffd93d] text-[#141414] border-[2.5px] border-[#141414] text-xs font-bold shadow-lg animate-toast max-w-[90vw] text-center">
            {toastMessage}
          </div>
        )}

        {/* Bottom 3-item Navigation */}
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} hidden={isSubTab(activeTab)} />
      </div>
    </div>
  );
}
