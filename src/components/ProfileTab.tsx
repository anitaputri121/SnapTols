import React, { useState, useRef } from 'react';
import {
  User,
  Calendar,
  Mail,
  ShieldCheck,
  Edit2,
  Camera,
  LogOut,
  Download,
  Award,
  Crown,
  HardDrive,
  Sparkles,
  Check,
  Upload,
  Image as ImageIcon,
  Loader2,
  FileVideo,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../types';
import { readFileAsDataUrl } from '../utils/fileHelpers';

interface ProfileTabProps {
  user: UserProfile;
  totalDownloads: number;
  homeVideoUrl?: string;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onUpdateHomeVideo?: (videoUrl: string) => void;
  onRequestStoragePermission?: () => void;
  onLogout: () => void;
}

const AVATAR_PRESETS = [
  '/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
];

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  totalDownloads,
  homeVideoUrl,
  onUpdateProfile,
  onUpdateHomeVideo,
  onRequestStoragePermission,
  onLogout,
}) => {
  // Modal states
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showEditAvatar, setShowEditAvatar] = useState(false);
  const [showEditBirthdate, setShowEditBirthdate] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Form values
  const [newUsername, setNewUsername] = useState(user.username);
  const [newName, setNewName] = useState(user.name);
  const [newBirthdate, setNewBirthdate] = useState(user.birthDate);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Handle Save Username
  const handleSaveUsername = () => {
    if (newUsername.trim()) {
      onUpdateProfile({ username: newUsername.trim() });
      setShowEditUsername(false);
    }
  };

  // Handle Save Name
  const handleSaveName = () => {
    if (newName.trim()) {
      onUpdateProfile({ name: newName.trim() });
      setShowEditName(false);
    }
  };

  // Handle Save Birthdate
  const handleSaveBirthdate = () => {
    if (newBirthdate) {
      onUpdateProfile({ birthDate: newBirthdate });
      setShowEditBirthdate(false);
    }
  };

  // Handle Select Avatar
  const handleSelectAvatar = (url: string) => {
    onUpdateProfile({ avatarUrl: url });
    setShowEditAvatar(false);
  };

  // Handle Upload Image from Device Gallery
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadSuccessMsg('Menerapkan foto dari galeri...');

    try {
      // Instantly read data URL for instant offline-safe display in profile
      const localDataUrl = await readFileAsDataUrl(file);
      onUpdateProfile({ avatarUrl: localDataUrl });
      setUploadSuccessMsg('Foto profil dari galeri berhasil dipasang!');

      setTimeout(() => {
        setUploadSuccessMsg(null);
        setShowEditAvatar(false);
      }, 1000);
    } catch (err) {
      console.error('Gagal membaca gambar:', err);
      setUploadSuccessMsg('Gagal membaca berkas gambar.');
      setTimeout(() => setUploadSuccessMsg(null), 2500);
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Video Input and State for Custom Home Video (Max 10 MB, 16:9)
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoErrorMsg, setVideoErrorMsg] = useState<string | null>(null);
  const [videoSuccessMsg, setVideoSuccessMsg] = useState<string | null>(null);

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoErrorMsg(null);
    setVideoSuccessMsg(null);

    // Validate maximum 10 MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setVideoErrorMsg(
        `Ukuran video (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 10 MB! Silakan pilih video lain.`
      );
      if (e.target) e.target.value = '';
      return;
    }

    setIsUploadingVideo(true);
    setVideoSuccessMsg('Menerapkan video kustom 16:9 untuk beranda...');

    try {
      // Convert to Data URL or Object URL for permanent or session playback
      const localVideoUrl = URL.createObjectURL(file);
      onUpdateHomeVideo?.(localVideoUrl);
      setVideoSuccessMsg(
        `Video beranda kustom 16:9 (${(file.size / (1024 * 1024)).toFixed(1)} MB) berhasil dipasang!`
      );

      setTimeout(() => {
        setVideoSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      setVideoErrorMsg(err.message || 'Gagal memproses file video.');
    } finally {
      setIsUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* 1. Header Profile Hero */}
      <div className="glass-card rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden border-2 border-[#141414]">
        <div className="absolute top-0 left-0 right-0 h-16 bg-[#ffd93d] pointer-events-none" />

        {/* Avatar with Camera Overlay */}
        <div className="relative mt-2">
          <div className="w-24 h-24 rounded-full p-1 bg-[#ffd93d] shadow-xl ">
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-full h-full rounded-full object-cover bg-[#fffdf5]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  '/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg';
              }}
            />
          </div>
          <button
            onClick={() => setShowEditAvatar(true)}
            aria-label="Ganti Foto Profil"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#ffd93d] text-[#141414] flex items-center justify-center shadow-lg hover:bg-[#ffd93d] active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Username & Role */}
        <div className="flex items-center gap-2 mt-3">
          <h3 className="text-xl font-bold text-[#141414] tracking-wide font-cyber">
            {user.username || 'Pengguna'}
          </h3>
          <button
            onClick={() => {
              setNewUsername(user.username);
              setShowEditUsername(true);
            }}
            aria-label="Ganti Username"
            className="p-1 rounded-md text-[#d62828] hover:text-[#d62828] hover:bg-[#ffe9a0]"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] text-xs font-semibold font-cyber tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          <span>{user.role}</span>
        </div>

        {/* Statistics mini bar */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-4 border-t-2 border-[#141414]">
          <div className="flex flex-col items-center p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414]">
            <span className="text-xs text-[#6a6455] flex items-center gap-1">
              <Download className="w-3 h-3 text-[#d62828]" /> Total Unduhan
            </span>
            <span className="text-lg font-bold text-[#d62828] font-cyber mt-0.5">
              {totalDownloads}
            </span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414]">
            <span className="text-xs text-[#6a6455] flex items-center gap-1">
              <Award className="w-3 h-3 text-[#d62828]" /> Status Akses
            </span>
            <span className="text-lg font-bold text-[#17803a] font-cyber mt-0.5">
              VIP AKTIF
            </span>
          </div>
        </div>
      </div>

      {/* 2. Informasi Akun Details */}
      <div className="glass-card rounded-2xl p-4 flex flex-col divide-y divide-[#141414]/25">
        <h4 className="text-xs font-bold text-[#d62828] tracking-wider font-cyber mb-1">
          DETAIL INFORMASI PENGGUNA
        </h4>

        {/* Nama Lengkap Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 text-sm text-[#4b463a]">
            <Sparkles className="w-4 h-4 text-[#6a6455]" />
            <span>Nama Lengkap</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#141414]">{user.name || user.username}</span>
            <button
              onClick={() => {
                setNewName(user.name);
                setShowEditName(true);
              }}
              className="text-xs text-[#d62828] hover:underline"
            >
              Ubah
            </button>
          </div>
        </div>

        {/* Username Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 text-sm text-[#4b463a]">
            <User className="w-4 h-4 text-[#6a6455]" />
            <span>Username</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#141414]">{user.username}</span>
            <button
              onClick={() => {
                setNewUsername(user.username);
                setShowEditUsername(true);
              }}
              className="text-xs text-[#d62828] hover:underline"
            >
              Ubah
            </button>
          </div>
        </div>

        {/* Tanggal Lahir Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 text-sm text-[#4b463a]">
            <Calendar className="w-4 h-4 text-[#6a6455]" />
            <span>Tanggal Lahir</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#141414]">
              {user.birthDate || 'Belum diatur'}
            </span>
            <button
              onClick={() => {
                setNewBirthdate(user.birthDate);
                setShowEditBirthdate(true);
              }}
              className="text-xs text-[#d62828] hover:underline"
            >
              Atur
            </button>
          </div>
        </div>

        {/* Email Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 text-sm text-[#4b463a]">
            <Mail className="w-4 h-4 text-[#6a6455]" />
            <span>Email</span>
          </div>
          <span className="text-xs font-medium text-[#4b463a]">
            {user.email || 'Belum diatur'}
          </span>
        </div>

        {/* Direktori Penyimpanan Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 text-sm text-[#4b463a]">
            <HardDrive className="w-4 h-4 text-[#6a6455]" />
            <span>Folder Simpan</span>
          </div>
          <span className="text-[11px] font-mono text-[#d62828] truncate max-w-[170px]">
            {user.storagePath || 'storage/movies/NitaCantik/hasildownload'}
          </span>
        </div>
      </div>

      {/* 3. Action Management Buttons */}
      <div className="flex flex-col gap-2 mt-1">
        {/* Ganti Nama Lengkap */}
        <button
          onClick={() => {
            setNewName(user.name);
            setShowEditName(true);
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] border-2 border-[#141414] text-[#141414] transition-all"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#d62828]" />
            <span className="text-sm font-medium">Ganti Nama Lengkap</span>
          </div>
          <span className="text-xs text-[#6a6455]">{user.name || user.username} ›</span>
        </button>

        {/* Ganti Username */}
        <button
          onClick={() => {
            setNewUsername(user.username);
            setShowEditUsername(true);
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] border-2 border-[#141414] text-[#141414] transition-all"
        >
          <div className="flex items-center gap-3">
            <Edit2 className="w-4 h-4 text-[#d62828]" />
            <span className="text-sm font-medium">Ganti Username</span>
          </div>
          <span className="text-xs text-[#6a6455]">{user.username} ›</span>
        </button>

        {/* Ganti Foto Profil */}
        <button
          onClick={() => setShowEditAvatar(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] border-2 border-[#141414] text-[#141414] transition-all"
        >
          <div className="flex items-center gap-3">
            <Camera className="w-4 h-4 text-[#d62828]" />
            <span className="text-sm font-medium">Ganti Foto Profil</span>
          </div>
          <span className="text-xs text-[#6a6455]">Pilih Avatar ›</span>
        </button>

        {/* 4. Pengaturan Izin Kelola File & Memori Perangkat */}
        <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 border-2 border-[#141414] mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#d62828]" />
              <h4 className="text-xs font-bold text-[#141414] font-cyber tracking-wider">
                IZIN KELOLA FILE & PENYIMPANAN
              </h4>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                user.hasStoragePermission
                  ? 'bg-[#c9f2d4] text-[#17803a] border-2 border-[#141414]'
                  : 'bg-[#ffe7b0] text-[#a85d00] border-2 border-[#141414]'
              }`}
            >
              {user.hasStoragePermission ? 'Izin Aktif' : 'Belum Diizinkan'}
            </span>
          </div>

          <p className="text-xs text-[#4b463a] leading-relaxed">
            Izin diperlukan untuk menyimpan unduhan media video dan audio secara langsung ke folder penyimpanan memori perangkat Anda.
          </p>

          <div className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-1 text-xs">
            <span className="text-[10px] text-[#6a6455]">Target Folder Memori:</span>
            <span className="font-mono text-[#d62828] text-[11px] truncate">
              {user.storagePath || 'storage/movies/NitaCantik/hasildownload'}
            </span>
          </div>

          <button
            type="button"
            onClick={onRequestStoragePermission}
            className="w-full py-2.5 px-3 rounded-xl bg-[#ffe9a0] hover:bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] font-bold text-xs flex items-center justify-center gap-2 transition-all font-cyber"
          >
            <HardDrive className="w-4 h-4" />
            <span>
              {user.hasStoragePermission
                ? 'UBAH / PERBARUI IZIN PENYIMPANAN'
                : 'MINTA IZIN MENGELOLA FILE PERANGKAT'}
            </span>
          </button>
        </div>

        {/* 5. Kustomisasi Video Beranda (Maks 10 MB, Rasio 16:9) */}
        <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 border-2 border-[#141414] mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-[#d62828]" />
              <h4 className="text-xs font-bold text-[#141414] font-cyber tracking-wider">
                KUSTOMISASI VIDEO BERANDA (16:9)
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]">
              MAKS 10 MB
            </span>
          </div>

          <p className="text-xs text-[#4b463a] leading-relaxed">
            Unggah video favorit Anda untuk diputar langsung di halaman Beranda Utama dengan bingkai rasio 16:9.
          </p>

          {/* Hidden Video Input */}
          <input
            type="file"
            ref={videoInputRef}
            accept="video/mp4,video/*"
            className="hidden"
            onChange={handleVideoFileChange}
          />

          {/* Feedback messages */}
          {videoErrorMsg && (
            <div className="p-2.5 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#c1121f] shrink-0 mt-0.5" />
              <span className="leading-tight">{videoErrorMsg}</span>
            </div>
          )}

          {videoSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-[#c9f2d4] border-2 border-[#141414] text-[#17803a] text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-[#17803a] shrink-0" />
              <span>{videoSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadingVideo}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs flex items-center justify-center gap-2 shadow-md  active:scale-95 transition-all font-cyber disabled:opacity-60"
            >
              {isUploadingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES VIDEO...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-[#141414]" />
                  <span>UNGGAH VIDEO BERANDA (16:9)</span>
                </>
              )}
            </button>

            {homeVideoUrl && homeVideoUrl !== '/assets/aistudio/live_video_h264.mp4' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateHomeVideo?.('/assets/aistudio/live_video_h264.mp4');
                  setVideoSuccessMsg('Video beranda dikembalikan ke video default AnitaOffc!');
                  setTimeout(() => setVideoSuccessMsg(null), 2500);
                }}
                className="px-3 py-2.5 rounded-xl bg-[#efe3c3] hover:bg-[#efe3c3] text-[#4b463a] text-xs font-semibold shrink-0 flex items-center gap-1"
                title="Kembalikan ke video bawaan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Tombol Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="Keluar / Log Out"
          className="w-full flex items-center justify-center gap-2 p-3.5 mt-2 rounded-xl bg-[#ffd6d2] hover:bg-[#ffc0ba] border-2 border-[#141414] text-[#c1121f] font-semibold text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun (Log Out)</span>
        </button>
      </div>

      {/* --- MODALS --- */}

      {/* Modal: Edit Username */}
      {showEditUsername && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3 shadow-2xl animate-pop-in">
            <h3 className="text-base font-bold text-[#141414] font-cyber flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#d62828]" />
              <span>GANTI USERNAME</span>
            </h3>
            <p className="text-xs text-[#4b463a]">
              Masukkan nama pengguna baru untuk ditampilkan di profil dan kartu info:
            </p>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username baru..."
              className="w-full bg-[#fffdf5] border-2 border-[#141414] rounded-xl py-2.5 px-3.5 text-sm text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setShowEditUsername(false)}
                className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveUsername}
                className="px-4 py-2 rounded-xl bg-[#ffd93d] text-[#141414] text-xs font-bold font-cyber"
              >
                SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Name */}
      {showEditName && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3 shadow-2xl animate-pop-in">
            <h3 className="text-base font-bold text-[#141414] font-cyber flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d62828]" />
              <span>GANTI NAMA LENGKAP</span>
            </h3>
            <p className="text-xs text-[#4b463a]">Masukkan nama lengkap baru Anda:</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama lengkap baru..."
              className="w-full bg-[#fffdf5] border-2 border-[#141414] rounded-xl py-2.5 px-3.5 text-sm text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setShowEditName(false)}
                className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveName}
                className="px-4 py-2 rounded-xl bg-[#ffd93d] text-[#141414] text-xs font-bold font-cyber"
              >
                SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Birthdate */}
      {showEditBirthdate && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3 shadow-2xl animate-pop-in">
            <h3 className="text-base font-bold text-[#141414] font-cyber flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#d62828]" />
              <span>PILIH TANGGAL LAHIR</span>
            </h3>
            <p className="text-xs text-[#4b463a]">Pilih tanggal lahir Anda:</p>
            <input
              type="date"
              value={newBirthdate}
              onChange={(e) => setNewBirthdate(e.target.value)}
              className="w-full bg-[#fffdf5] border-2 border-[#141414] rounded-xl py-2.5 px-3.5 text-sm text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setShowEditBirthdate(false)}
                className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBirthdate}
                className="px-4 py-2 rounded-xl bg-[#ffd93d] text-[#141414] text-xs font-bold font-cyber"
              >
                SIMPAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Avatar */}
      {showEditAvatar && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3.5 shadow-2xl animate-pop-in">
            <h3 className="text-base font-bold text-[#141414] font-cyber flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#d62828]" />
              <span>GANTI FOTO PROFIL</span>
            </h3>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Upload from Device Gallery Button */}
            <div className="p-3 rounded-xl bg-[#ffd93d] border-2 border-[#141414] flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#d62828] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#d62828]" />
                <span>Unggah Gambar dari Perangkat</span>
              </span>
              <p className="text-[11px] text-[#4b463a] leading-tight">
                Pilih foto langsung dari galeri atau penyimpanan file perangkat Anda:
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs shadow-md  active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                    <span>MEMPROSES GAMBAR...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-[#141414]" />
                    <span>PILIH DARI GALERI / MEMORI</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload feedback notice */}
            {uploadSuccessMsg && (
              <div className="p-2 rounded-xl bg-[#c9f2d4] border-2 border-[#141414] text-[#17803a] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-[#17803a] shrink-0" />
                <span className="text-[11px] font-medium">{uploadSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-[#fffdf5]" />
              <span className="text-[10px] text-[#6a6455] font-cyber uppercase tracking-wider">Atau Pilih Preset</span>
              <div className="flex-1 h-px bg-[#fffdf5]" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_PRESETS.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectAvatar(imgUrl)}
                  className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    user.avatarUrl === imgUrl ? 'border-[#141414] scale-105 shadow-md ' : 'border-transparent hover:border-[#141414]'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Avatar ${i}`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        '/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg';
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] text-[#6a6455]">Atau gunakan URL gambar langsung:</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] rounded-xl px-3 py-2 text-xs text-[#141414]"
                />
                <button
                  onClick={() => {
                    if (customAvatarUrl.trim()) handleSelectAvatar(customAvatarUrl.trim());
                  }}
                  className="px-3 py-2 rounded-xl bg-[#ffd93d] text-[#141414] font-bold text-xs"
                >
                  Terapkan
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-1">
              <button
                onClick={() => setShowEditAvatar(false)}
                className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold hover:bg-[#efe3c3]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3 shadow-2xl animate-pop-in">
            <h3 className="text-base font-bold text-[#c1121f] font-cyber flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[#c1121f]" />
              <span>KONFIRMASI LOG OUT</span>
            </h3>
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Apakah Anda yakin ingin keluar dari akun ini? Anda harus login kembali saat masuk ke aplikasi.
            </p>
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#efe3c3] text-[#4b463a] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setShowLogoutConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#ff5a4f] hover:bg-[#ff5a4f] text-[#141414] text-xs font-bold font-cyber"
              >
                YA, KELUAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
