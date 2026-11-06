export type TabType = 'tools' | 'downloader' | 'home' | 'profile' | 'anime' | 'komik' | 'dramabox' | 'spotify' | 'snaptube';

export interface UserProfile {
  username: string;
  name: string;
  email: string;
  birthDate: string;
  password?: string;
  avatarUrl: string;
  role: string;
  isLoggedIn: boolean;
  hasStoragePermission: boolean;
  storagePath: string;
  googleAccount?: {
    name: string;
    email: string;
    picture: string;
  } | null;
}

export interface DownloadHistoryItem {
  id: string;
  platform: string;
  platformName: string;
  originalUrl: string;
  downloadUrl: string;
  title: string;
  thumbnail?: string;
  timestamp: number;
  quality?: string;
  mediaType: 'video' | 'audio' | 'image' | 'file';
  localPath?: string;
  fileSize?: string;
}

export interface DownloadTask {
  id: string;
  title: string;
  platform: string;
  platformName: string;
  progress: number; // 0 to 100
  speed: string; // e.g. "3.8 MB/s"
  totalSize: string;
  downloadedSize: string;
  status: 'pending' | 'downloading' | 'saving' | 'completed' | 'failed';
  mediaType: 'video' | 'audio' | 'image' | 'file';
  downloadUrl: string;
  blobUrl?: string;
  targetPath: string;
  timestamp: number;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  title: string;
  author?: string;
  thumbnail?: string;
  downloadUrl: string;
  mediaType: 'video' | 'audio' | 'image' | 'file';
  filesize?: string;
  duration?: string;
  quality?: string;
  /** Halaman gambar (MangaDex): daftar tautan berurutan. */
  pages?: string[];
  rawResponse?: any;
  error?: string;
}

