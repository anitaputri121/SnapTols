import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Book,
  X,
  Flame,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Maximize2,
  ArrowLeft,
  Compass,
} from 'lucide-react';
import {
  getKomikTerbaru,
  getKomikDaftar,
  searchKomik,
  getKomikDetail,
  getKomikStream,
  KomikItem,
  KomikChapter,
  KomikDetailData,
  KomikPage,
  sanitizeApiError,
} from '../utils/animeKomikApi';

interface KomikTabProps {
  onBackToHome?: () => void;
}

export const KomikTab: React.FC<KomikTabProps> = () => {
  const [activeTab, setActiveTab] = useState<'update' | 'daftar'>('update');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Komik catalog state
  const [komikList, setKomikList] = useState<KomikItem[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail view state
  const [selectedKomik, setSelectedKomik] = useState<KomikItem | null>(null);
  const [komikDetail, setKomikDetail] = useState<KomikDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Chapter reader state
  const [activeChapter, setActiveChapter] = useState<KomikChapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [chapterPages, setChapterPages] = useState<KomikPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');

  // Load catalog on tab change
  useEffect(() => {
    loadCatalog(1);
  }, [activeTab]);

  const loadCatalog = async (targetPage = 1) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsSearching(false);
    setSearchQuery('');
    setPage(targetPage);
    try {
      if (activeTab === 'update') {
        const res = await getKomikTerbaru(targetPage);
        setKomikList(res.results);
      } else {
        const res = await getKomikDaftar(targetPage);
        setKomikList(res.results);
      }
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat katalog komik.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadCatalog(1);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setIsSearching(true);
    try {
      const results = await searchKomik(searchQuery);
      setKomikList(results);
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Tidak ditemukan komik yang cocok.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectKomik = async (item: KomikItem) => {
    setSelectedKomik(item);
    setKomikDetail(null);
    setActiveChapter(null);
    setChapterPages([]);
    setIsLoadingDetail(true);
    setErrorMsg(null);

    try {
      const detail = await getKomikDetail(item.slug);
      setKomikDetail(detail);
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat detail komik.'));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleReadChapter = async (chap: KomikChapter, idx: number) => {
    setActiveChapter(chap);
    setChapterIndex(idx);
    setChapterPages([]);
    setIsLoadingPages(true);
    setErrorMsg(null);

    try {
      const streamData = await getKomikStream(chap.slug);
      setChapterPages(streamData.pages);
      setChapterTitle(streamData.chapterTitle || chap.title);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat halaman komik.'));
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handlePrevChapter = () => {
    if (!komikDetail?.chapters) return;
    if (chapterIndex < komikDetail.chapters.length - 1) {
      const prevIdx = chapterIndex + 1;
      handleReadChapter(komikDetail.chapters[prevIdx], prevIdx);
    }
  };

  const handleNextChapter = () => {
    if (!komikDetail?.chapters) return;
    if (chapterIndex > 0) {
      const nextIdx = chapterIndex - 1;
      handleReadChapter(komikDetail.chapters[nextIdx], nextIdx);
    }
  };

  // FULLSCREEN CHAPTER READER MODE
  if (activeChapter) {
    return (
      <div className="w-full flex flex-col gap-4 pb-28">
        {/* Sticky Reader Top Bar */}
        <div className="sticky top-14 z-30 bg-[#fffdf5]  p-3 rounded-2xl border-2 border-[#141414] flex items-center justify-between gap-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setActiveChapter(null);
              setChapterPages([]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-xs font-semibold text-[#141414] hover:text-[#141414]"
          >
            <ArrowLeft className="w-4 h-4 text-[#d62828]" />
            <span>Kembali ke Komik</span>
          </button>

          <div className="overflow-hidden flex-1 text-center">
            <h4 className="text-xs font-bold text-[#141414] line-clamp-1">{chapterTitle}</h4>
            <p className="text-[10px] text-[#d62828] font-mono">
              {chapterPages.length} Halaman Webtoon
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevChapter}
              disabled={!komikDetail?.chapters || chapterIndex >= komikDetail.chapters.length - 1}
              className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#4b463a] disabled:opacity-30"
              title="Chapter Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextChapter}
              disabled={chapterIndex <= 0}
              className="p-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#4b463a] disabled:opacity-30"
              title="Chapter Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reader Pages View */}
        {isLoadingPages ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#d62828]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-cyber tracking-wider">MEMUAT GAMBAR CHAPTER KOMIK...</span>
          </div>
        ) : chapterPages.length > 0 ? (
          <div className="flex flex-col items-center bg-black rounded-2xl overflow-hidden border-2 border-[#141414] shadow-2xl">
            {chapterPages.map((pageItem, pIdx) => (
              <div key={pIdx} className="w-full relative min-h-[300px] flex items-center justify-center bg-[#fffdf5]">
                <img
                  src={pageItem.url}
                  alt={`Halaman ${pageItem.page}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-auto object-contain block select-none"
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#fffdf5] border-2 border-[#141414] text-[9px] font-mono text-[#141414]">
                  {pageItem.page}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[#6a6455]">
            <p className="text-xs">Tidak ada halaman yang dapat ditampilkan untuk chapter ini.</p>
          </div>
        )}

        {/* Reader Bottom Navigation Bar */}
        <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] flex items-center justify-between gap-3 shadow-xl">
          <button
            type="button"
            onClick={handlePrevChapter}
            disabled={!komikDetail?.chapters || chapterIndex >= komikDetail.chapters.length - 1}
            className="flex-1 py-3 px-3 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-xs font-bold text-[#141414] hover:text-[#141414] flex items-center justify-center gap-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chapter Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={handleNextChapter}
            disabled={chapterIndex <= 0}
            className="flex-1 py-3 px-3 rounded-xl bg-[#ffd93d] text-[#141414] font-bold text-xs flex items-center justify-center gap-1 shadow-md  disabled:opacity-30"
          >
            <span>Chapter Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#141414] tracking-wide flex items-center gap-2 font-cyber">
            <BookOpen className="w-5 h-5 text-[#d62828]" />
            <span>BACA KOMIK INDONESIA</span>
          </h2>
          <p className="text-xs text-[#6a6455]">
            Kumpulan Manga, Manhwa, & Manhua subtitle Indonesia terlengkap
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#c9f2d4] border-2 border-[#141414] text-[#17803a] font-cyber whitespace-nowrap shrink-0">
          VIP KOMIK
        </span>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul manga / manhwa (contoh: Solo Leveling, Slime)..."
            className="w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#141414] outline-none"
          />
          <Search className="w-4 h-4 text-[#6a6455] absolute left-3 top-3" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadCatalog(1);
              }}
              className="absolute right-2.5 top-2.5 text-[#6a6455] hover:text-[#141414]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-[#ffd93d] hover:bg-[#ffd93d] text-[#141414] font-bold text-xs font-cyber tracking-wider shrink-0 shadow-md  active:scale-95 transition-all"
        >
          CARI
        </button>
      </form>

      {/* Category Pills (Update Terbaru vs Daftar Komik) */}
      {!isSearching && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'update'
                ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] shadow-sm'
                : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#a85d00]" />
            <span>Update Terbaru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daftar')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'daftar'
                ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] shadow-sm'
                : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#17803a]" />
            <span>Daftar Komik Populer</span>
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs flex items-start gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#c1121f] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#c1121f]">Perhatian</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* COMIC DETAILS VIEW (ACCORDION / MODAL) */}
      {selectedKomik && (
        <div className="glass-card-glow rounded-3xl p-4 sm:p-5 flex flex-col gap-4 border-2 border-[#141414] animate-pop-in shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="p-1 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828]">
                <Book className="w-4 h-4" />
              </span>
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-[#141414] line-clamp-1 font-cyber">
                  {selectedKomik.title}
                </h3>
                <p className="text-[10px] text-[#d62828]">Detail & Daftar Chapter Komik</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedKomik(null);
                setKomikDetail(null);
              }}
              className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3] shrink-0"
              title="Tutup Detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#d62828] text-xs">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span>Memuat chapter komik...</span>
            </div>
          ) : komikDetail ? (
            <div className="flex flex-col gap-4">
              {/* Comic Info Card */}
              <div className="flex gap-3.5 items-start">
                <div className="w-24 aspect-[3/4] rounded-xl overflow-hidden bg-black shrink-0 border-2 border-[#141414] shadow-md">
                  <img
                    src={komikDetail.cover}
                    alt={komikDetail.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold text-[#141414] line-clamp-2">{komikDetail.title}</h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {komikDetail.type && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414]">
                        {komikDetail.type}
                      </span>
                    )}
                    {komikDetail.rating && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ffe7b0] text-[#a85d00] border-2 border-[#141414]">
                        ★ {komikDetail.rating}
                      </span>
                    )}
                  </div>
                  {komikDetail.synopsis && (
                    <p className="text-[11px] text-[#4b463a] line-clamp-3 mt-2 leading-relaxed">
                      {komikDetail.synopsis}
                    </p>
                  )}
                </div>
              </div>

              {/* Chapter Grid List */}
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#141414]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141414] font-cyber flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#d62828]" />
                    <span>PILIH CHAPTER UNTUK DIBACA:</span>
                  </span>
                  <span className="text-[10px] text-[#6a6455] font-mono">
                    {komikDetail.chapters.length} Chapter
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                  {komikDetail.chapters.map((chap, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleReadChapter(chap, idx)}
                      className="p-2.5 rounded-xl bg-[#fffdf5] hover:bg-[#fffdf5] hover:border-[#141414] border-2 border-[#141414] text-left transition-all flex flex-col group"
                    >
                      <span className="text-xs font-bold text-[#141414] group-hover:text-[#d62828] truncate">
                        {chap.title}
                      </span>
                      <span className="text-[10px] text-[#d62828] mt-1 flex items-center gap-1 font-mono">
                        <Eye className="w-3 h-3" />
                        <span>Baca Sekarang</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6a6455] text-center py-3">Rincian komik tidak tersedia.</p>
          )}
        </div>
      )}

      {/* COMIC CATALOG GRID */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#d62828]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-cyber tracking-widest">MEMUAT DAFTAR KOMIK...</span>
        </div>
      ) : komikList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {komikList.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectKomik(item)}
              className="glass-card rounded-2xl overflow-hidden border-2 border-[#141414] hover:border-[#141414] transition-all cursor-pointer group flex flex-col"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#fffdf5]">
                <img
                  src={item.cover}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

                {item.latestChapter && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#fffdf5] border-2 border-[#141414] text-[9px] font-bold text-[#d62828] font-cyber truncate max-w-[90%]">
                    {item.latestChapter}
                  </span>
                )}

                {item.type && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-[#fffdf5] text-[9px] font-bold text-[#17803a] font-mono">
                    {item.type}
                  </span>
                )}
              </div>

              <div className="p-2.5 flex flex-col flex-1 justify-between bg-[#fffdf5]">
                <h4 className="text-xs font-bold text-[#141414] line-clamp-2 group-hover:text-[#d62828] transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-[#6a6455] mt-2 pt-1 border-t-2 border-[#141414]">
                  <span className="text-[#d62828] font-mono">Baca Komik</span>
                  <BookOpen className="w-3 h-3 text-[#d62828]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-[#6a6455]">
          <Book className="w-10 h-10 text-[#6a6455]" />
          <p className="text-xs">Tidak ada komik yang ditemukan.</p>
        </div>
      )}
    </div>
  );
};
