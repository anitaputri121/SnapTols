import React, { useState, useEffect } from 'react';
import {
  Download,
  Link,
  Sparkles,
  Clipboard,
  X,
  Play,
  Music,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  HardDrive,
  FolderArchive,
  FileArchive,
  Copy,
  Loader2,
} from 'lucide-react';
import { PlatformId, PLATFORMS, QUALITY_OPTIONS, detectPlatform } from '../utils/detector';
import { createZip } from '../utils/zipStore';
import { executeDownload } from '../utils/apiExecutor';
import { DownloadResult, DownloadHistoryItem, DownloadTask } from '../types';

interface DownloaderTabProps {
  onAddHistory: (item: DownloadHistoryItem) => void;
  onStartDownloadTask: (task: DownloadTask) => void;
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
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
}

export const DownloaderTab: React.FC<DownloaderTabProps> = ({
  onAddHistory,
  onStartDownloadTask,
  history,
  onClearHistory,
  hasStoragePermission,
  storagePath,
  onPlayMedia,
}) => {
  const [url, setUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('tiktok');
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [tiktokFormat, setTiktokFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [audioMode, setAudioMode] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'video' | 'audio' | 'social' | 'file' | 'manga'>('all');
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloadingToStorage, setIsDownloadingToStorage] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedModalInput, setPastedModalInput] = useState('');
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  // Pindah platform: kembali ke mode video (Audio MP3 tidak ikut terbawa)
  useEffect(() => {
    setAudioMode(false);
  }, [selectedPlatform]);

  // Auto-detect platform when url changes
  useEffect(() => {
    if (!url.trim()) {
      setDetectedPlatform(null);
      setError(null);
      return;
    }
    const detected = detectPlatform(url);
    setDetectedPlatform(detected);
    if (detected) {
      setSelectedPlatform(detected);
    }
  }, [url]);

  const handlePaste = async () => {
    // 1. Attempt reading directly from clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2200);
          return;
        }
      } catch (clipErr) {
        console.warn('Clipboard readText restricted by browser/iframe:', clipErr);
      }
    }

    // 2. Focus input so mobile/desktop paste bubble or keyboard clipboard bar appears
    if (urlInputRef.current) {
      urlInputRef.current.focus();
      urlInputRef.current.select();
    }

    // 3. Open smooth In-App Paste Modal for 100% reliable pasting
    setPastedModalInput('');
    setShowPasteModal(true);
  };

  const handleApplyModalPaste = () => {
    if (pastedModalInput.trim()) {
      setUrl(pastedModalInput.trim());
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2200);
    }
    setShowPasteModal(false);
  };

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setError(null);
    setCopyNotice(null);
  };

  // Get media info and stream directly in-app
  const handleFetchMedia = async () => {
    if (!url.trim()) {
      setError('Silakan masukkan tautan URL terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopyNotice(null);

    try {
      const cfg = PLATFORMS[selectedPlatform];
      const qualityToPass =
        selectedPlatform === 'tiktok'
          ? tiktokFormat
          : cfg.supportsAudioToggle && audioMode
            ? 'mp3'
            : selectedQuality;
      const res = await executeDownload(selectedPlatform, url, qualityToPass);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data media. Pastikan tautan valid dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct In-App Download without opening new external websites
  const handleSaveToDevice = (
    customDownloadUrl?: string,
    customMediaType?: 'video' | 'audio' | 'image' | 'file',
    customTitle?: string
  ) => {
    if (!result) return;

    setIsDownloadingToStorage(true);

    const activeUrl = customDownloadUrl || result.downloadUrl;
    const activeMediaType = customMediaType || result.mediaType;
    const activeTitle = customTitle || result.title;

    // Detect file extension
    let ext = 'zip';
    if (activeMediaType === 'audio') {
      ext = 'mp3';
    } else if (activeMediaType === 'video') {
      ext = 'mp4';
    } else if (activeMediaType === 'image') {
      ext = 'jpg';
    } else if (activeMediaType === 'file') {
      // Judul yang sudah punya ekstensi (zip, rar, apk, mkv, pdf, dst.) dipakai apa adanya.
      if (/\.[a-z0-9]{1,5}$/i.test(activeTitle)) ext = '';
      else ext = 'zip';
    }

    const cleanTitle = activeTitle.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
    const filename = ext ? `${cleanTitle}.${ext}` : cleanTitle;
    const targetFilePath = `${storagePath}/${filename}`;

    const newTask: DownloadTask = {
      id: Date.now().toString(),
      title: activeTitle,
      platform: selectedPlatform,
      platformName: PLATFORMS[selectedPlatform].name,
      progress: 0,
      speed: '6.4 MB/s',
      totalSize: result.filesize || (activeMediaType === 'file' ? 'Berkas ZIP' : activeMediaType === 'video' ? '28.4 MB' : '7.2 MB'),
      downloadedSize: '0 MB',
      status: 'downloading',
      mediaType: activeMediaType,
      downloadUrl: activeUrl,
      targetPath: targetFilePath,
      timestamp: Date.now(),
    };

    onStartDownloadTask(newTask);

    // Record in History
    const historyItem: DownloadHistoryItem = {
      id: Date.now().toString(),
      platform: selectedPlatform,
      platformName: PLATFORMS[selectedPlatform].name,
      originalUrl: url,
      downloadUrl: activeUrl,
      title: activeTitle,
      thumbnail: result.thumbnail,
      timestamp: Date.now(),
      quality: result.quality || (selectedPlatform === 'tiktok' ? (tiktokFormat === 'mp3' ? 'MP3 Audio' : 'MP4 Video') : selectedQuality),
      mediaType: activeMediaType,
      localPath: targetFilePath,
      fileSize: newTask.totalSize,
    };
    onAddHistory(historyItem);

    // 1. Instantly trigger native device download (starts immediately in Android/browser download manager)
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = activeUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      setIsDownloadingToStorage(false);
    }, 800);

    // 2. Non-blocking background folder write if FileSystemAccess directory handle is active
    const dirHandle = (window as any).__anita_dir_handle;
    if (dirHandle) {
      fetch(activeUrl)
        .then((resp) => (resp.ok ? resp.blob() : null))
        .then(async (blob) => {
          if (!blob) return;
          try {
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (err) {
            console.warn('Background folder write notice:', err);
          }
        })
        .catch(() => {});
    }
  };

  // Komik: kumpulkan semua halaman jadi satu berkas ZIP
  const handleDownloadPagesZip = async () => {
    const pages = result?.pages;
    if (!result || !pages?.length || zipBusy) return;
    setZipBusy(true);
    setCopyNotice(null);
    try {
      const entries: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < pages.length; i++) {
        setZipProgress(`${i + 1}/${pages.length}`);
        const resp = await fetch(pages[i]);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = new Uint8Array(await resp.arrayBuffer());
        const ext = (pages[i].split('?')[0].match(/\.(png|jpe?g|webp|gif|avif)$/i)?.[1] || 'jpg').toLowerCase();
        entries.push({ name: `${String(i + 1).padStart(3, '0')}.${ext}`, data });
      }
      const blob = new Blob([createZip(entries)], { type: 'application/zip' });
      const objectUrl = URL.createObjectURL(blob);
      const cleanTitle = result.title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || 'chapter';
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = objectUrl;
      a.download = `${cleanTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 60000);
      onAddHistory({
        id: Date.now().toString(),
        platform: selectedPlatform,
        platformName: PLATFORMS[selectedPlatform].name,
        originalUrl: url,
        downloadUrl: pages[0],
        title: result.title,
        thumbnail: pages[0],
        timestamp: Date.now(),
        quality: result.quality,
        mediaType: 'image',
        localPath: `${storagePath}/${cleanTitle}.zip`,
      });
      setCopyNotice(`ZIP berisi ${pages.length} halaman siap diunduh.`);
    } catch {
      setCopyNotice('Sebagian halaman tidak bisa digabung ke ZIP (diblokir sumber). Tekan lama pada gambar untuk menyimpannya satu per satu.');
    } finally {
      setZipBusy(false);
      setZipProgress('');
    }
  };

  // Copy direct download link to clipboard
  const handleCopyDirectLink = async () => {
    if (!result) return;
    try {
      // Strip any internal key if present
      const cleanUrl = result.downloadUrl.replace(/[?&]key=[^&]+/gi, '').replace(/[?&]apikey=[^&]+/gi, '');
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      setCopyNotice('Tautan berkas berhasil disalin ke clipboard!');
      setTimeout(() => {
        setCopied(false);
        setCopyNotice(null);
      }, 3000);
    } catch {
      prompt('Salin tautan unduhan berikut:', result.downloadUrl);
    }
  };

  const platformsList = Object.values(PLATFORMS);
  const filteredPlatforms =
    selectedCategory === 'all'
      ? platformsList
      : platformsList.filter((p) => p.category === selectedCategory);

  const isMediaFireOrFile = selectedPlatform === 'mediafire' || result?.mediaType === 'file';

  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* Title banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#141414] tracking-wide flex items-center gap-2 font-cyber">
            <svg className="w-3.5 h-3.5 fill-[#d62828] shrink-0" viewBox="0 0 24 24">
              <polygon points="12,2 22,12 12,22 2,12" />
            </svg>
            <span>MULTI FUNGSI</span>
          </h2>
          <p className="text-xs text-[#6a6455]">
            Putar & unduh video atau berkas ZIP langsung ke memori perangkat
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] font-cyber whitespace-nowrap shrink-0">
          DIRECT DL
        </span>
      </div>

      {/* URL Input Box */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-[#4b463a] font-medium">
          <span className="flex items-center gap-1.5 text-[#d62828]">
            <Link className="w-3.5 h-3.5" />
            <span>Tautan Media / Berkas ZIP</span>
          </span>
          {detectedPlatform && (
            <span className="flex items-center gap-1 text-[11px] text-[#17803a] bg-[#c9f2d4] px-2 py-0.5 rounded-full border-2 border-[#141414]">
              <Sparkles className="w-3 h-3" />
              <span>Terdeteksi: {PLATFORMS[detectedPlatform].name}</span>
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <input
            ref={urlInputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData('text');
              if (pasted) {
                setPasteSuccess(true);
                setTimeout(() => setPasteSuccess(false), 2000);
              }
            }}
            placeholder={PLATFORMS[selectedPlatform]?.placeholder || 'Tempel tautan (TikTok, MediaFire ZIP, YouTube, dll)...'}
            className="w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] rounded-xl py-3 pl-3.5 pr-24 text-sm text-[#141414] placeholder:text-[#6a6455] outline-none transition-all font-mono"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {url && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Hapus URL"
                className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handlePaste}
              aria-label="Tempel Tautan dari Clipboard"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 active:scale-95 transition-all shadow-sm ${
                pasteSuccess
                  ? 'bg-[#c9f2d4] text-[#17803a] border-[#141414] '
                  : 'bg-[#ffe9a0] hover:bg-[#ffe9a0] text-[#d62828] border-[#141414]'
              }`}
            >
              {pasteSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#17803a]" />
                  <span>Ditempel!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* TikTok Format Selector if tiktok selected (MP4 vs MP3) */}
        {selectedPlatform === 'tiktok' && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#4b463a] font-medium">Pilihan Format TikTok:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTiktokFormat('mp4')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  tiktokFormat === 'mp4'
                    ? 'bg-[#ffd93d] text-[#141414] shadow-md '
                    : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Video MP4</span>
              </button>
              <button
                type="button"
                onClick={() => setTiktokFormat('mp3')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  tiktokFormat === 'mp3'
                    ? 'bg-[#ff8fb1] text-[#141414] shadow-md '
                    : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio MP3</span>
              </button>
            </div>
          </div>
        )}

        {/* Pilihan Video MP4 / Audio MP3 (platform zapi yang mendukung) */}
        {PLATFORMS[selectedPlatform].supportsAudioToggle && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#4b463a] font-medium">Pilihan Format:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAudioMode(false)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  !audioMode
                    ? 'bg-[#ffd93d] text-[#141414] shadow-md '
                    : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Video MP4</span>
              </button>
              <button
                type="button"
                onClick={() => setAudioMode(true)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  audioMode
                    ? 'bg-[#ff8fb1] text-[#141414] shadow-md '
                    : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio MP3</span>
              </button>
            </div>
          </div>
        )}

        {/* Pilihan kualitas video: dari HD 1080p sampai paling rendah */}
        {PLATFORMS[selectedPlatform].supportsQuality && !(PLATFORMS[selectedPlatform].supportsAudioToggle && audioMode) && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs text-[#4b463a] font-medium">Pilih Kualitas Video:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                ...(PLATFORMS[selectedPlatform].autoQuality ? [{ value: 'auto', label: 'Otomatis' }] : []),
                ...QUALITY_OPTIONS,
              ].map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setSelectedQuality(q.value)}
                  aria-pressed={selectedQuality === q.value}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold whitespace-nowrap shrink-0 transition-all ${
                    selectedQuality === q.value
                      ? 'bg-[#ffd93d] text-[#141414] shadow-md '
                      : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Process Button */}
        <button
          onClick={handleFetchMedia}
          disabled={isLoading}
          aria-label="Proses Unduhan Media"
          className="w-full mt-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold tracking-wide shadow-lg  active:scale-[0.99] disabled:opacity-50 transition-all font-cyber text-base"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#141414] border-t-white rounded-full animate-spin" />
              <span>MEMPROSES TAUTAN...</span>
            </div>
          ) : (
            <>
              {selectedPlatform === 'mediafire' ? (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>PERIKSA BERKAS ZIP MEDIAFIRE</span>
                </>
              ) : PLATFORMS[selectedPlatform].category === 'file' ? (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>PERIKSA BERKAS</span>
                </>
              ) : PLATFORMS[selectedPlatform].category === 'manga' ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>AMBIL HALAMAN CHAPTER</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>TAMPILKAN & PUTAR MEDIA</span>
                </>
              )}
            </>
          )}
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs flex items-start gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#c1121f] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#c1121f]">Gagal Memproses</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* RESULT SECTION */}
      {result && (
        <div className="glass-card-glow rounded-3xl p-4 sm:p-5 flex flex-col gap-4 border-2 border-[#141414] animate-pop-in shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#d62828] font-cyber">
              <Check className="w-4 h-4 text-[#17803a]" />
              <span>
                {result.pages?.length
                  ? 'CHAPTER SIAP DIBACA DI APLIKASI'
                  : isMediaFireOrFile
                    ? selectedPlatform === 'mediafire' ? 'BERKAS ZIP MEDIAFIRE SIAP DIUNDUH' : 'BERKAS SIAP DIUNDUH'
                    : 'MEDIA MUNCUL LANGSUNG DI APLIKASI'}
              </span>
            </span>
            {result.quality && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828]">
                {result.quality}
              </span>
            )}
          </div>

          {/* DEDICATED MEDIAFIRE ZIP FILE CARD (Sesuai Permintaan User: langsung kasih berkas zip & tombol unduh) */}
          {result.pages && result.pages.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-[#141414] line-clamp-2 leading-snug">{result.title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] whitespace-nowrap shrink-0">
                  {result.pages.length} HALAMAN
                </span>
              </div>
              <div className="max-h-[60vh] overflow-y-auto rounded-2xl border-2 border-[#141414] bg-[#fffdf5] p-2 flex flex-col gap-2">
                {result.pages.map((src, i) => (
                  <div key={`${i}-${src}`} className="relative">
                    <img
                      src={src}
                      alt={`Halaman ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto rounded-xl border-2 border-[#141414] bg-[#efe3c3] min-h-[120px]"
                    />
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ffd93d] border-2 border-[#141414] text-[#141414]">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleDownloadPagesZip}
                disabled={zipBusy}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#4ade80] text-[#141414] font-extrabold text-sm shadow-lg active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
              >
                {zipBusy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#141414]" />
                    <span>MENYIAPKAN ZIP {zipProgress}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 text-[#141414]" />
                    <span>UNDUH SEMUA HALAMAN (ZIP)</span>
                  </>
                )}
              </button>
            </div>
          ) : isMediaFireOrFile ? (
            <div className="w-full p-4 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-3.5 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#ffe9a0] border-2 border-[#141414] flex items-center justify-center text-[#d62828] shrink-0 shadow-inner">
                  <FolderArchive className="w-7 h-7 text-[#d62828]" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] font-cyber">
                      {selectedPlatform === 'mediafire' ? 'ZIP ARCHIVE' : 'BERKAS'}
                    </span>
                    {result.filesize && (
                      <span className="text-[10px] font-mono text-[#17803a] font-semibold">
                        {result.filesize}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[#141414] line-clamp-2 mt-1 font-mono">
                    {result.title}
                  </h4>
                  <p className="text-[11px] text-[#6a6455] mt-0.5">
                    {selectedPlatform === 'mediafire' ? 'MediaFire Direct Download Archive' : `${PLATFORMS[selectedPlatform].name} • Direct Download`}
                  </p>
                </div>
              </div>

              {/* Destination Folder Notice */}
              <div className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center gap-2 text-xs">
                <HardDrive className="w-4 h-4 text-[#d62828] shrink-0" />
                <div className="overflow-hidden flex-1">
                  <p className="text-[10px] text-[#6a6455]">Target Folder Penyimpanan Perangkat:</p>
                  <p className="text-[11px] font-mono text-[#d62828] truncate">{storagePath}</p>
                </div>
                <span className="text-[10px] text-[#17803a] font-bold shrink-0">✓ Siap Simpan</span>
              </div>

              {/* Action Buttons for MediaFire ZIP */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveToDevice()}
                  disabled={isDownloadingToStorage}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-extrabold text-sm shadow-lg  active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
                >
                  {isDownloadingToStorage ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#141414]" />
                      <span>{selectedPlatform === 'mediafire' ? 'SEDANG MENGUNDUH BERKAS ZIP...' : 'SEDANG MENGUNDUH BERKAS...'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-[#141414]" />
                      <span>{selectedPlatform === 'mediafire' ? 'UNDUH BERKAS ZIP KE PERANGKAT' : 'UNDUH BERKAS KE PERANGKAT'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] text-[#141414] text-xs font-semibold border-2 border-[#141414] transition-all shrink-0"
                  title="Salin tautan unduhan langsung"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#17803a]" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#d62828]" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD VIDEO / AUDIO PLAYER */
            <>
              {result.mediaType === 'video' ? (
                <div className="w-full rounded-2xl overflow-hidden bg-black/90 border-2 border-[#141414] shadow-lg relative aspect-video flex items-center justify-center">
                  <video
                    src={result.downloadUrl}
                    poster={result.thumbnail || undefined}
                    controls
                    playsInline
                    onError={(e) => {
                      console.warn('Video load notice:', e);
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : result.mediaType === 'audio' ? (
                <div className="w-full p-4 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-14 h-14 rounded-xl object-cover shadow-md"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#ffe9a0] flex items-center justify-center text-[#d62828]">
                        <Music className="w-7 h-7" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-[#141414] line-clamp-1">{result.title}</h4>
                      <p className="text-xs text-[#6a6455]">Audio Stream • {result.author || 'Lossless'}</p>
                    </div>
                  </div>
                  <audio src={result.downloadUrl} controls className="w-full" />
                </div>
              ) : result.mediaType === 'image' ? (
                <div className="w-full rounded-2xl overflow-hidden bg-[#fffdf5] border-2 border-[#141414] shadow-lg flex items-center justify-center">
                  <img
                    src={result.downloadUrl}
                    alt={result.title}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>
              ) : null}

              {/* Title and metadata */}
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-[#141414] line-clamp-2 leading-snug">
                  {result.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[#6a6455]">
                  <span className="text-[#17803a] font-semibold">✓ Siap Disimpan ke Perangkat</span>
                  {result.duration && <span>• Durasi: {result.duration}</span>}
                  {result.filesize && <span>• Ukuran: {result.filesize}</span>}
                </div>
              </div>

              {/* Destination Directory Notice */}
              <div className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center gap-2 text-xs">
                <HardDrive className="w-4 h-4 text-[#d62828] shrink-0" />
                <div className="overflow-hidden flex-1">
                  <p className="text-[10px] text-[#6a6455]">Tersimpan ke Penyimpanan Perangkat:</p>
                  <p className="text-[11px] font-mono text-[#d62828] truncate">{storagePath}</p>
                </div>
                <span className="text-[10px] text-[#17803a] font-bold shrink-0">✓ Siap Disimpan</span>
              </div>

              {/* Action Download Buttons for Video/Audio */}
              {selectedPlatform === 'tiktok' && result.rawResponse?.audioUrl ? (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveToDevice(
                          result.rawResponse?.videoUrl || result.downloadUrl,
                          'video',
                          `${result.title} (No Watermark)`
                        )
                      }
                      disabled={isDownloadingToStorage}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#4ade80]   text-[#141414] font-bold text-xs shadow-md  active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" />
                      <span>UNDUH VIDEO MP4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSaveToDevice(
                          result.rawResponse?.audioUrl,
                          'audio',
                          `${result.title} (Audio Track)`
                        )
                      }
                      disabled={isDownloadingToStorage}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#ff8fb1]   text-[#141414] font-bold text-xs shadow-md  active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
                    >
                      <Music className="w-4 h-4" />
                      <span>UNDUH AUDIO MP3</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] text-[#141414] text-xs font-semibold border-2 border-[#141414] transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#17803a]" />
                        <span>Tautan Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#d62828]" />
                        <span>Salin Tautan Media Langsung</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => handleSaveToDevice()}
                    disabled={isDownloadingToStorage}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-bold text-sm shadow-lg  active:scale-95 transition-all font-cyber tracking-wide disabled:opacity-60"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isDownloadingToStorage
                        ? 'SEDANG MENYIMPAN KE PERANGKAT...'
                        : 'UNDUH & SIMPAN KE PERANGKAT'}
                    </span>
                  </button>

                  <button
                    onClick={handleCopyDirectLink}
                    className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] text-[#141414] text-xs font-semibold border-2 border-[#141414] transition-all shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#17803a]" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#d62828]" />
                        <span>Salin Tautan</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Copy feedback notification */}
          {copyNotice && (
            <div className="p-2 rounded-xl bg-[#ffe9a0] border-2 border-[#141414] flex items-center gap-2 text-xs text-[#d62828] animate-fade-in">
              <Check className="w-4 h-4 text-[#17803a] shrink-0" />
              <span className="flex-1 text-[11px] font-medium">{copyNotice}</span>
            </div>
          )}
        </div>
      )}

      {/* Platform Category Selector */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#4b463a]">Pilih Platform Downloader</span>
          <span className="text-[10px] text-[#6a6455]">Total {platformsList.length} Layanan Aktif</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'video', label: 'Video' },
              { id: 'audio', label: 'Audio' },
              { id: 'social', label: 'Sosial' },
              { id: 'file', label: 'Berkas / ZIP' },
              { id: 'manga', label: 'Komik' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#ffd93d] text-[#141414] font-bold shadow-sm '
                  : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {filteredPlatforms.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`p-3 rounded-xl flex flex-col items-start gap-1.5 text-left transition-all relative ${
                  isSelected
                    ? 'bg-[#fffdf5] border-2 border-[#141414] shadow-md '
                    : 'bg-[#fffdf5] hover:bg-[#fffdf5] border-2 border-[#141414]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded font-cyber whitespace-nowrap"
                    style={{
                      backgroundColor: `${p.color}22`,
                      color: p.color === '#ffffff' ? '#e2e8f0' : p.color,
                      border: `1px solid ${p.color}44`,
                    }}
                  >
                    {p.tag || p.id.toUpperCase()}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#ffd93d] animate-ping" />}
                </div>

                <span className="text-xs font-semibold text-[#141414] line-clamp-1 mt-0.5">
                  {p.name}
                </span>
                <span className="text-[10px] text-[#6a6455]">{p.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Riwayat Unduhan */}
      {history.length > 0 && (
        <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#141414]">
              <Clock className="w-3.5 h-3.5 text-[#d62828]" />
              <span>Riwayat Unduhan ({history.length})</span>
            </span>
            <button
              onClick={onClearHistory}
              aria-label="Bersihkan Riwayat"
              className="text-[11px] text-[#c1121f] hover:text-[#c1121f] flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] flex items-center justify-center shrink-0 text-[#d62828] text-xs font-bold font-cyber">
                    {item.platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-[#141414] line-clamp-1">{item.title}</p>
                    <p className="text-[10px] text-[#6a6455] font-mono truncate">
                      {item.localPath || item.platformName}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onPlayMedia({
                      title: item.title,
                      url: item.downloadUrl,
                      mediaType: item.mediaType,
                      thumbnail: item.thumbnail,
                      storagePath: item.localPath,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#ffe9a0] hover:bg-[#ffe9a0] text-[#d62828] text-[11px] font-semibold border-2 border-[#141414] shrink-0 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Buka</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-App Quick Paste Modal (Fallback if system clipboard is restricted) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80  flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-[#141414] flex flex-col gap-3.5 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
              <div className="flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-[#d62828]" />
                <h3 className="text-sm font-bold text-[#141414] font-cyber tracking-wider">
                  TEMPEL TAUTAN MEDIA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1 rounded-lg text-[#6a6455] hover:text-[#141414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tempelkan (Paste) tautan URL video atau berkas ZIP yang ingin Anda unduh ke kolom di bawah ini:
            </p>

            <textarea
              autoFocus
              rows={3}
              value={pastedModalInput}
              onChange={(e) => setPastedModalInput(e.target.value)}
              placeholder="https://www.tiktok.com/... atau https://www.mediafire.com/file/..."
              className="w-full bg-[#fffdf5] border-2 border-[#141414] rounded-xl p-3 text-xs text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] font-mono resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#efe3c3] hover:bg-[#efe3c3] text-[#4b463a] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyModalPaste}
                disabled={!pastedModalInput.trim()}
                className="px-4 py-2 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs font-cyber disabled:opacity-50 tracking-wider shadow-md "
              >
                GUNAKAN TAUTAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
