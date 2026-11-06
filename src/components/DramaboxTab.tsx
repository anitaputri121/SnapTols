import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Search,
  X,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Share2,
  Clock,
  Layers,
  ArrowLeft,
  Loader2,
  Check,
  Download,
  Flame,
  Star,
  Eye,
  Tv,
} from 'lucide-react';
import {
  DramaItem,
  DramaCategory,
  DramaEpisode,
  DramaDetailData,
  getDramaboxHome,
  getDramaboxCategories,
  getDramaboxBrowse,
  searchDramabox,
  getDramaboxDetail,
  getDramaboxEpisodeVideo,
  sanitizeDramaboxError,
} from '../utils/dramaboxApi';

interface DramaboxTabProps {
  onBackToHome: () => void;
}

interface LastWatchedDrama {
  id: string;
  title: string;
  cover: string;
  url: string;
  lastEpIndex: number;
  lastEpName: string;
  timestamp: number;
}

export const DramaboxTab: React.FC<DramaboxTabProps> = ({ onBackToHome }) => {
  // Navigation / View states
  const [selectedDramaUrl, setSelectedDramaUrl] = useState<string | null>(null);
  const [dramaDetail, setDramaDetail] = useState<DramaDetailData | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<DramaEpisode | null>(null);
  const [activeMp4Url, setActiveMp4Url] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Home / Catalog states
  const [featuredDramas, setFeaturedDramas] = useState<DramaItem[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [categories, setCategories] = useState<DramaCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [dramaList, setDramaList] = useState<DramaItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DramaItem[] | null>(null);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Last watched history
  const [lastWatched, setLastWatched] = useState<LastWatchedDrama[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load last watched from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dramabox_last_watched');
      if (saved) {
        setLastWatched(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveLastWatched = (drama: DramaItem, ep: DramaEpisode) => {
    try {
      const updated: LastWatchedDrama = {
        id: drama.id,
        title: drama.title,
        cover: drama.cover,
        url: drama.url,
        lastEpIndex: ep.index,
        lastEpName: ep.name,
        timestamp: Date.now(),
      };
      const filtered = lastWatched.filter((it) => it.id !== drama.id);
      const newList = [updated, ...filtered].slice(0, 10);
      setLastWatched(newList);
      localStorage.setItem('dramabox_last_watched', JSON.stringify(newList));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Initial load: Home featured & categories & catalog
  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setIsLoadingCatalog(true); setErrorMsg(null);
    try {
      const [homeResult, categoriesResult, browseResult] = await Promise.allSettled([getDramaboxHome(),getDramaboxCategories(),getDramaboxBrowse(0,1)]);
      const homeData=homeResult.status==='fulfilled'?homeResult.value:{featured:[],sections:[]};
      const catsData=categoriesResult.status==='fulfilled'?categoriesResult.value:[];
      const browseData=browseResult.status==='fulfilled'?browseResult.value:{books:[],pageNo:1,pages:1};
      setFeaturedDramas(homeData.featured.length?homeData.featured:browseData.books.slice(0,5));setCategories(catsData);setDramaList(browseData.books||[]);setCurrentPage(browseData.pageNo||1);setTotalPages(browseData.pages||1);
      if(browseResult.status==='rejected'&&homeResult.status==='rejected')setErrorMsg(sanitizeDramaboxError(browseResult.reason?.message||homeResult.reason?.message||'Gagal memuat katalog DramaBox.'));
      else if(browseResult.status==='rejected')setErrorMsg(sanitizeDramaboxError(browseResult.reason?.message||'Gagal memuat katalog drama.'));
      else if(categoriesResult.status==='rejected')setErrorMsg(sanitizeDramaboxError(categoriesResult.reason?.message||'Gagal memuat kategori DramaBox.'));
    } catch(err:any){setErrorMsg(sanitizeDramaboxError(err.message||'Gagal memuat katalog DramaBox.'));} finally {setIsLoadingCatalog(false);}
  };

  // Change Category
  const handleSelectCategory = async (catId: number) => {
    setSelectedCategoryId(catId);
    setSearchQuery('');
    setSearchResults(null);
    setIsLoadingCatalog(true);
    setErrorMsg(null);
    setCurrentPage(1);

    try {
      const res = await getDramaboxBrowse(catId, 1);
      setDramaList(res.books);
      setCurrentPage(res.pageNo);
      setTotalPages(res.pages);
    } catch (err: any) {
      setErrorMsg(sanitizeDramaboxError(err.message || 'Gagal memuat kategori drama.'));
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Load more pages
  const handleLoadMore = async () => {
    if (isLoadingMore || currentPage >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await getDramaboxBrowse(selectedCategoryId, nextPage);
      setDramaList((prev) => [...prev, ...res.books]);
      setCurrentPage(res.pageNo);
    } catch {
      showToast('Gagal memuat halaman berikutnya.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Search Drama
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    setErrorMsg(null);
    try {
      const results = await searchDramabox(q);
      setSearchResults(results);
      if (results.length === 0) {
        showToast('Tidak ada drama yang cocok dengan kata kunci.');
      }
    } catch (err: any) {
      setErrorMsg(sanitizeDramaboxError(err.message || 'Gagal mencari drama.'));
    } finally {
      setIsSearching(false);
    }
  };

  // Select Drama & Open Detail
  const handleOpenDrama = async (dramaUrl: string) => {
    setSelectedDramaUrl(dramaUrl);
    setIsLoadingDetail(true);
    setErrorMsg(null);
    setDramaDetail(null);
    setCurrentEpisode(null);
    setActiveMp4Url(null);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const detail = await getDramaboxDetail(dramaUrl);
      setDramaDetail(detail);

      // Automatically play first episode
      if (detail.episodes && detail.episodes.length > 0) {
        handlePlayEpisode(detail.episodes[0], detail);
      }
    } catch (err: any) {
      setErrorMsg(sanitizeDramaboxError(err.message || 'Gagal memuat rincian drama.'));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Play an Episode
  const handlePlayEpisode = async (ep: DramaEpisode, detailData?: DramaDetailData) => {
    const activeDetail = detailData || dramaDetail;
    setCurrentEpisode(ep);
    setIsLoadingVideo(true);
    setActiveMp4Url(null);

    // Save to last watched
    if (activeDetail?.book) {
      saveLastWatched(activeDetail.book, ep);
    }

    try {
      // 1. If episode already has direct mp4 link
      if (ep.mp4) {
        setActiveMp4Url(ep.mp4);
        setIsLoadingVideo(false);
        return;
      }

      // 2. Otherwise fetch stream from video endpoint
      if (ep.videoUrl) {
        const streamData = await getDramaboxEpisodeVideo(ep.videoUrl);
        if (streamData.mp4Url) {
          setActiveMp4Url(streamData.mp4Url);

          // Update episode list with cached mp4s
          if (activeDetail) {
            const updatedEpisodes = activeDetail.episodes.map((item) => {
              const matched = streamData.episodes.find((s) => s.id === item.id || s.index === item.index);
              return matched?.mp4 ? { ...item, mp4: matched.mp4 } : item;
            });
            setDramaDetail({ ...activeDetail, episodes: updatedEpisodes });
          }
        } else {
          showToast('Tautan video episode belum tersedia.');
        }
      }
    } catch (err: any) {
      console.warn('Play episode error:', err);
      showToast('Gagal memuat video episode. Silakan pilih episode lain.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Auto-play next episode when video ends
  const handleVideoEnded = () => {
    if (!dramaDetail || !currentEpisode) return;
    const currentIndex = currentEpisode.index;
    const nextEp = dramaDetail.episodes.find((ep) => ep.index === currentIndex + 1);
    if (nextEp) {
      showToast(`Memutar Episode ${nextEp.index}...`);
      handlePlayEpisode(nextEp);
    } else {
      showToast('Anda telah mencapai episode terakhir!');
    }
  };

  // Share Drama
  const handleShareDrama = (drama: DramaItem) => {
    if (navigator.share) {
      navigator.share({
        title: drama.title,
        text: `Nonton drama "${drama.title}" di SnapTools VIP DramaBox!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Tautan drama berhasil disalin!');
    }
  };

  return (
    <div className="min-h-screen text-[#141414] pb-28 pt-2 -mx-3 sm:-mx-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 z-50 px-4 py-2 rounded-xl bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] text-xs font-semibold shadow-2xl  animate-toast-top max-w-[90vw] text-center">
          {toastMsg}
        </div>
      )}

      {/* Top Bar */}
      <div className="px-4 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {selectedDramaUrl ? (
            <button
              onClick={() => {
                setSelectedDramaUrl(null);
                setDramaDetail(null);
                setCurrentEpisode(null);
                setActiveMp4Url(null);
              }}
              className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#d62828] hover:bg-[#ffe9a0] active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#d62828] hover:bg-[#ffe9a0] active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Beranda</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ff6b5e] flex items-center justify-center shadow-[3px_3px_0_#141414]">
              <Film className="w-4 h-4 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-wide text-[#d62828]">
                  DRAMABOX VIP
                </h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] font-bold whitespace-nowrap shrink-0">
                  SULIH SUARA
                </span>
              </div>
              <p className="text-[10px] text-[#6a6455]">Short Drama HD Tanpa Iklan</p>
            </div>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadHomeData}
          disabled={isLoadingCatalog}
          className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#6a6455] hover:text-[#d62828] active:scale-95 transition-all"
          title="Segarkan Katalog"
        >
          <RotateCcw className={`w-4 h-4 ${isLoadingCatalog ? 'animate-spin text-[#d62828]' : ''}`} />
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-[#ffd0e0] border-2 border-[#141414] text-[#c2255c] text-xs flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-[#c2255c] hover:text-[#c2255c]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DETAIL & VIDEO PLAYER VIEW */}
      {selectedDramaUrl && (
        <div className="px-4 space-y-4 animate-fade-in">
          {isLoadingDetail ? (
            <div className="p-12 rounded-3xl bg-[#fffdf5] border-2 border-[#141414] text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#c2255c] animate-spin" />
              <p className="text-xs text-[#4b463a] font-semibold">Memuat episode DramaBox...</p>
            </div>
          ) : dramaDetail ? (
            <div className="space-y-4">
              {/* VIDEO PLAYER SCREEN */}
              <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-[#141414] shadow-[3px_3px_0_#141414] aspect-[9/16] sm:aspect-video max-h-[70vh] mx-auto flex items-center justify-center">
                {isLoadingVideo ? (
                  <div className="absolute inset-0 z-20 bg-[#fffdf5]/95 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#c2255c] animate-spin" />
                    <p className="text-xs text-[#c2255c] font-semibold">
                      Memuat {currentEpisode?.name || 'Episode'}...
                    </p>
                  </div>
                ) : null}

                {activeMp4Url ? (
                  <video
                    ref={videoRef}
                    key={activeMp4Url}
                    src={activeMp4Url}
                    controls
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <Film className="w-10 h-10 text-[#c2255c] mx-auto" />
                    <p className="text-xs text-[#6a6455]">Pilih episode di bawah untuk memutar video</p>
                  </div>
                )}
              </div>

              {/* Current Episode Header & Actions */}
              <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] font-bold uppercase tracking-wider">
                      Sedang Diputar
                    </span>
                    <h2 className="text-base font-bold text-[#141414] mt-1 leading-snug">
                      {dramaDetail.book.title}
                    </h2>
                    <p className="text-xs text-[#c2255c] font-semibold mt-0.5">
                      {currentEpisode?.name || `Episode ${currentEpisode?.index || 1}`}
                      {currentEpisode?.duration ? ` • ${Math.round(currentEpisode.duration / 1000)} detik` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeMp4Url && (
                      <a
                        href={activeMp4Url}
                        target="_blank"
                        rel="noreferrer"
                        download={`${dramaDetail.book.title}_${currentEpisode?.name || 'Ep'}.mp4`}
                        className="p-2 rounded-xl bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] hover:bg-[#ffe9a0] active:scale-95 transition-all flex items-center gap-1 text-[11px] font-semibold"
                        title="Unduh Episode Ini"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Unduh</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleShareDrama(dramaDetail.book)}
                      className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#4b463a] hover:text-[#c2255c] active:scale-95 transition-all"
                      title="Bagikan Drama"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Synopsis Accordion */}
                {dramaDetail.book.intro && (
                  <p className="text-xs text-[#4b463a] leading-relaxed bg-[#fffdf5] p-3 rounded-xl border-2 border-[#141414]">
                    {dramaDetail.book.intro}
                  </p>
                )}

                {/* Tags */}
                {dramaDetail.book.tags && dramaDetail.book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dramaDetail.book.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-[#efe3c3] text-[#4b463a] border-2 border-[#141414]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* EPISODE LIST SELECTOR */}
              <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#c2255c]" />
                    <h3 className="text-sm font-bold text-[#141414]">
                      Daftar Episode ({dramaDetail.episodes.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6a6455]">Pilih episode untuk ditonton</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-72 overflow-y-auto pr-1">
                  {dramaDetail.episodes.map((ep) => {
                    const isActive = currentEpisode?.id === ep.id || currentEpisode?.index === ep.index;
                    return (
                      <button
                        key={ep.id || ep.index}
                        onClick={() => handlePlayEpisode(ep)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                          isActive
                            ? 'bg-[#ff6b5e] text-[#141414] shadow-[3px_3px_0_#141414] border-2 border-[#141414]'
                            : 'bg-[#fffdf5] hover:bg-[#fffdf5] text-[#4b463a] border-2 border-[#141414] hover:border-[#141414]'
                        }`}
                      >
                        <span>Ep {ep.index}</span>
                        {isActive && <Play className="w-2.5 h-2.5 fill-current" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* CATALOG & BROWSE VIEW */}
      {!selectedDramaUrl && (
        <div className="space-y-5">
          {/* Search Box */}
          <div className="px-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6455]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari drama pendek, CEO, balas dendam..."
                className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] text-xs text-[#141414] placeholder-slate-500 focus:outline-none focus:border-[#141414] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-[#6a6455] hover:text-[#141414]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#ff6b5e] text-[#141414] text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-[3px_3px_0_#141414]"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
              </button>
            </form>
          </div>

          {/* Search Results if active */}
          {searchResults && (
            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#c2255c]">
                  Hasil Pencarian: &ldquo;{searchQuery}&rdquo; ({searchResults.length})
                </h3>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="text-[11px] text-[#d62828] hover:underline"
                >
                  Tutup Pencarian
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] text-center text-xs text-[#6a6455]">
                  Tidak ditemukan drama dengan kata kunci tersebut.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {searchResults.map((item) => (
                    <DramaCard key={item.id} drama={item} onClick={() => handleOpenDrama(item.url)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Featured Hero Carousel */}
          {!searchResults && featuredDramas.length > 0 && (
            <div className="px-4">
              <div className="relative rounded-3xl overflow-hidden bg-[#ffe9a0] border-2 border-[#141414] p-5 shadow-[3px_3px_0_#141414] flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Background cover blur */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xl -z-10"
                  style={{ backgroundImage: `url(${featuredDramas[currentHeroIndex]?.cover})` }}
                />

                <div className="flex-1 space-y-2 text-center md:text-left z-10">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#c2255c]" />
                      TRENDING VIP
                    </span>
                    {featuredDramas[currentHeroIndex]?.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] font-semibold">
                        {featuredDramas[currentHeroIndex].category}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg md:text-xl font-extrabold text-[#141414] line-clamp-2">
                    {featuredDramas[currentHeroIndex]?.title}
                  </h2>

                  <p className="text-xs text-[#4b463a] line-clamp-2 max-w-lg">
                    {featuredDramas[currentHeroIndex]?.intro || 'Tonton short drama seru dengan kualitas tinggi dan alur cerita memukau langsung di SnapTools.'}
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-3 pt-1">
                    <button
                      onClick={() => handleOpenDrama(featuredDramas[currentHeroIndex]?.url)}
                      className="px-4 py-2 rounded-xl bg-[#ff6b5e] text-[#141414] text-xs font-bold shadow-[3px_3px_0_#141414] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tonton Sekarang</span>
                    </button>
                    {featuredDramas[currentHeroIndex]?.chapterCount ? (
                      <span className="text-xs text-[#6a6455] font-semibold">
                        {featuredDramas[currentHeroIndex].chapterCount} Episode
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Hero Poster */}
                <div
                  onClick={() => handleOpenDrama(featuredDramas[currentHeroIndex]?.url)}
                  className="w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#141414] cursor-pointer flex-shrink-0 relative group hover:scale-105 transition-all z-10"
                >
                  <img
                    src={featuredDramas[currentHeroIndex]?.cover}
                    alt={featuredDramas[currentHeroIndex]?.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#ff6f91] text-[#141414] flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Hero slider dots */}
                {featuredDramas.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                    {featuredDramas.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentHeroIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentHeroIndex ? 'w-5 bg-[#ff6f91]' : 'w-1.5 bg-[#efe3c3]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Watched Shelf */}
          {!searchResults && lastWatched.length > 0 && (
            <div className="px-4 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#d62828]" />
                <h3 className="text-xs font-bold text-[#141414] uppercase tracking-wider">
                  Lanjutkan Menonton
                </h3>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {lastWatched.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDrama(item.url)}
                    className="flex-shrink-0 w-32 p-2 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] hover:border-[#141414] cursor-pointer active:scale-95 transition-all space-y-1.5 group"
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#efe3c3]">
                      <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-[#fffdf5] text-[9px] font-bold text-[#c2255c] text-center truncate">
                        {item.lastEpName}
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-[#141414] line-clamp-1">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {!searchResults && (
            <div className="px-4 space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => handleSelectCategory(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                    selectedCategoryId === 0
                      ? 'bg-[#ff6f91] text-[#141414] shadow-[3px_3px_0_#141414]'
                      : 'bg-[#fffdf5] text-[#4b463a] border-2 border-[#141414] hover:border-[#141414]'
                  }`}
                >
                  Semua
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                      selectedCategoryId === cat.id
                        ? 'bg-[#ff6f91] text-[#141414] shadow-[3px_3px_0_#141414]'
                        : 'bg-[#fffdf5] text-[#4b463a] border-2 border-[#141414] hover:border-[#141414]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Drama Grid */}
              {isLoadingCatalog ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-2xl bg-[#efe3c3] animate-pulse border-2 border-[#141414]" />
                  ))}
                </div>
              ) : dramaList.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {dramaList.map((item) => (
                      <DramaCard key={item.id} drama={item} onClick={() => handleOpenDrama(item.url)} />
                    ))}
                  </div>

                  {/* Load more button */}
                  {currentPage < totalPages && (
                    <div className="text-center pt-2">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-5 py-2.5 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] text-[#d62828] text-xs font-bold hover:bg-[#ffe9a0] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Memuat Drama Lainnya...</span>
                          </>
                        ) : (
                          <>
                            <span>Muat Lebih Banyak</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 rounded-3xl bg-[#fffdf5] border-2 border-[#141414] text-center text-xs text-[#6a6455]">
                  Tidak ada drama yang tersedia di kategori ini.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DramaCardProps {
  drama: DramaItem;
  onClick: () => void;
}

const DramaCard: React.FC<DramaCardProps> = ({ drama, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden bg-[#fffdf5] border-2 border-[#141414] hover:border-[#141414] transition-all duration-200 cursor-pointer flex flex-col active:scale-98 shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#efe3c3]">
        <img
          src={drama.cover}
          alt={drama.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {drama.chapterCount ? (
            <span className="px-1.5 py-0.5 rounded-md bg-[#fffdf5] text-[9px] font-extrabold text-[#a85d00] border-2 border-[#141414]">
              {drama.chapterCount} Eps
            </span>
          ) : null}
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-[#ff6f91] text-[#141414] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom stats */}
        {drama.views && (
          <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-[#fffdf5] border-2 border-[#141414] text-[9px] font-semibold text-[#141414] flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-[#d62828]" />
            <span>{drama.views}</span>
          </div>
        )}
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
        <h4 className="text-xs font-bold text-[#141414] line-clamp-2 leading-snug group-hover:text-[#c2255c] transition-colors">
          {drama.title}
        </h4>

        {drama.category && (
          <span className="text-[10px] text-[#6a6455] block truncate">
            {drama.category}
          </span>
        )}
      </div>
    </div>
  );
};
