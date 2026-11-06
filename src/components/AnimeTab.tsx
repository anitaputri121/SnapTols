import React, { useState, useEffect } from 'react';
import {
  Tv,
  Search,
  Play,
  X,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Film,
  AlertCircle,
} from 'lucide-react';
import {
  getRecentAnimekuindo,
  getCompletedAnimekuindo,
  searchAnimekuindo,
  getAnimekuindoDetails,
  getAnimekuindoStream,
  getPopularAnimasu,
  getCompletedAnimasu,
  searchAnimasu,
  getAnimasuDetails,
  getAnimasuStream,
  AnimeItem,
  AnimeEpisode,
  AnimeDetailData,
  sanitizeApiError,
} from '../utils/animeKomikApi';

type AnimePlatform = 'animekuindo' | 'animasu';

interface AnimeTabProps {
  onBackToHome?: () => void;
}

export const AnimeTab: React.FC<AnimeTabProps> = ({ onBackToHome }) => {
  const [platform, setPlatform] = useState<AnimePlatform>('animekuindo');
  const [activeCategory, setActiveCategory] = useState<'recent' | 'completed'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Anime list state
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected anime details state
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);
  const [animeDetail, setAnimeDetail] = useState<AnimeDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Streaming player state
  const [activeEpisode, setActiveEpisode] = useState<AnimeEpisode | null>(null);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number>(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState<string>('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // Load catalog on platform or category change
  useEffect(() => {
    loadAnimeCatalog();
  }, [platform, activeCategory]);

  const loadAnimeCatalog = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsSearching(false);
    setSearchQuery('');
    try {
      if (platform === 'animekuindo') {
        if (activeCategory === 'recent') {
          const res = await getRecentAnimekuindo(1);
          setAnimeList(res.animeList);
        } else {
          const res = await getCompletedAnimekuindo(1);
          setAnimeList(res.animeList);
        }
      } else {
        // Animasu
        if (activeCategory === 'recent') {
          const res = await getPopularAnimasu(1);
          setAnimeList(res.animeList);
        } else {
          const res = await getCompletedAnimasu(1);
          setAnimeList(res.animeList);
        }
      }
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat katalog anime.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadAnimeCatalog();
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setIsSearching(true);
    try {
      if (platform === 'animekuindo') {
        const results = await searchAnimekuindo(searchQuery);
        setAnimeList(results);
      } else {
        const results = await searchAnimasu(searchQuery);
        setAnimeList(results);
      }
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Tidak ditemukan anime yang cocok.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnime = async (anime: AnimeItem) => {
    setSelectedAnime(anime);
    setAnimeDetail(null);
    setActiveEpisode(null);
    setStreamUrl(null);
    setIsLoadingDetail(true);
    setErrorMsg(null);

    try {
      if (platform === 'animekuindo') {
        const detail = await getAnimekuindoDetails(anime.link);
        setAnimeDetail(detail);
        if (detail.episodes && detail.episodes.length > 0) {
          handlePlayEpisode(detail.episodes[0], 0);
        }
      } else {
        const detail = await getAnimasuDetails(anime.link);
        setAnimeDetail(detail);
        if (detail.episodes && detail.episodes.length > 0) {
          handlePlayEpisode(detail.episodes[0], 0);
        }
      }
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat episode anime.'));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePlayEpisode = async (episode: AnimeEpisode, index: number) => {
    setActiveEpisode(episode);
    setActiveEpisodeIndex(index);
    setStreamUrl(null);
    setIsLoadingStream(true);
    setErrorMsg(null);

    try {
      if (platform === 'animekuindo') {
        const streamData = await getAnimekuindoStream(episode.episodeUrl);
        setStreamUrl(streamData.streamUrl);
        setStreamTitle(streamData.title);
      } else {
        const streamData = await getAnimasuStream(episode.episodeUrl);
        setStreamUrl(streamData.streamUrl);
        setStreamTitle(streamData.title);
      }
    } catch (err: any) {
      setErrorMsg(sanitizeApiError(err.message || 'Gagal memuat pemutar streaming video anime.'));
    } finally {
      setIsLoadingStream(false);
    }
  };

  const handleNextEpisode = () => {
    if (!animeDetail || !animeDetail.episodes) return;
    if (activeEpisodeIndex > 0) {
      const nextIndex = activeEpisodeIndex - 1;
      handlePlayEpisode(animeDetail.episodes[nextIndex], nextIndex);
    }
  };

  const handlePrevEpisode = () => {
    if (!animeDetail || !animeDetail.episodes) return;
    if (activeEpisodeIndex < animeDetail.episodes.length - 1) {
      const prevIndex = activeEpisodeIndex + 1;
      handlePlayEpisode(animeDetail.episodes[prevIndex], prevIndex);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#141414] tracking-wide flex items-center gap-2 font-cyber">
            <Tv className="w-5 h-5 text-[#d62828]" />
            <span>NONTON ANIME INDO</span>
          </h2>
          <p className="text-xs text-[#6a6455]">
            Streaming anime subtitle Indonesia lengkap dengan multi-server in-app
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] font-cyber whitespace-nowrap shrink-0">
          VIP STREAM
        </span>
      </div>

      {/* Platform Switcher (Animekuindo vs Animasu) */}
      <div className="p-1 rounded-2xl bg-[#fffdf5] border-2 border-[#141414] flex items-center gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setPlatform('animekuindo');
            setSelectedAnime(null);
          }}
          className={`flex-1 py-2.5 rounded-xl font-cyber text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            platform === 'animekuindo'
              ? 'bg-[#ffd93d] text-[#141414] shadow-md '
              : 'text-[#6a6455] hover:text-[#141414]'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>ANIMEKUINDO</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPlatform('animasu');
            setSelectedAnime(null);
          }}
          className={`flex-1 py-2.5 rounded-xl font-cyber text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            platform === 'animasu'
              ? 'bg-[#b794f6] text-[#141414] shadow-md '
              : 'text-[#6a6455] hover:text-[#141414]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>ANIMASU</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari judul anime di ${platform === 'animekuindo' ? 'Animekuindo' : 'Animasu'}...`}
            className="w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#141414] outline-none"
          />
          <Search className="w-4 h-4 text-[#6a6455] absolute left-3 top-3" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                loadAnimeCatalog();
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

      {/* Category Pills (Only shown when not actively searching) */}
      {!isSearching && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('recent')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeCategory === 'recent'
                ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] shadow-sm'
                : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#a85d00]" />
            <span>{platform === 'animekuindo' ? 'Update Terbaru' : 'Populer'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('completed')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeCategory === 'completed'
                ? 'bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] shadow-sm'
                : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#17803a]" />
            <span>Tamat (Completed)</span>
          </button>
        </div>
      )}

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs flex items-start gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#c1121f] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#c1121f]">Perhatian</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* IN-APP STREAMING PLAYER MODAL / ACCORDION */}
      {selectedAnime && (
        <div className="glass-card-glow rounded-3xl p-4 sm:p-5 flex flex-col gap-4 border-2 border-[#141414] animate-pop-in shadow-2xl">
          {/* Header of Anime Player */}
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="p-1 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828]">
                <Play className="w-4 h-4 fill-current" />
              </span>
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-[#141414] line-clamp-1 font-cyber">
                  {selectedAnime.title.replace(/\t+/g, ' ')}
                </h3>
                <p className="text-[10px] text-[#d62828]">
                  {activeEpisode ? activeEpisode.title : 'Pilih Episode di Bawah'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedAnime(null);
                setStreamUrl(null);
                setActiveEpisode(null);
              }}
              className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3] shrink-0"
              title="Tutup Pemutar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Integrated Video Player Screen */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-[#141414] flex items-center justify-center relative shadow-lg">
            {isLoadingStream ? (
              <div className="flex flex-col items-center gap-2 text-[#d62828]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-cyber tracking-wider">MEMUAT VIDEO STREAMING...</span>
              </div>
            ) : streamUrl ? (
              <iframe
                src={streamUrl}
                title={streamTitle || 'Anime Player'}
                allowFullScreen
                className="w-full h-full border-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center text-[#6a6455]">
                <Tv className="w-10 h-10 text-[#d62828]" />
                <p className="text-xs">Klik salah satu nomor episode di bawah untuk memutar video</p>
              </div>
            )}
          </div>

          {/* Episode Navigation Buttons */}
          {activeEpisode && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrevEpisode}
                disabled={!animeDetail?.episodes || activeEpisodeIndex >= animeDetail.episodes.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-xs font-semibold text-[#4b463a] hover:text-[#141414] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ep Sebelumnya</span>
              </button>

              <span className="text-[11px] font-mono font-bold text-[#d62828] bg-[#ffe9a0] px-2.5 py-1 rounded-full border-2 border-[#141414]">
                Episode {activeEpisode.episode || activeEpisodeIndex + 1}
              </span>

              <button
                type="button"
                onClick={handleNextEpisode}
                disabled={activeEpisodeIndex <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-xs font-semibold text-[#4b463a] hover:text-[#141414] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Ep Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Episode List Selector */}
          <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#141414]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141414] font-cyber flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#d62828]" />
                <span>DAFTAR EPISODE TERSURAT:</span>
              </span>
              {animeDetail?.episodes && (
                <span className="text-[10px] text-[#6a6455] font-mono">
                  {animeDetail.episodes.length} Episode
                </span>
              )}
            </div>

            {isLoadingDetail ? (
              <div className="py-6 flex items-center justify-center gap-2 text-[#d62828] text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat daftar episode...</span>
              </div>
            ) : animeDetail?.episodes && animeDetail.episodes.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1">
                {animeDetail.episodes.map((ep, idx) => {
                  const isCurrent = activeEpisode?.episodeUrl === ep.episodeUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePlayEpisode(ep, idx)}
                      className={`p-2 rounded-xl text-xs font-bold font-mono transition-all truncate border-2 ${
                        isCurrent
                          ? 'bg-[#ffd93d] text-[#141414] border-[#141414] shadow-md '
                          : 'bg-[#fffdf5] hover:bg-[#fffdf5] text-[#4b463a] border-[#141414]'
                      }`}
                      title={ep.title}
                    >
                      {ep.episode ? `Ep ${ep.episode}` : `Ep ${idx + 1}`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#6a6455] text-center py-3">
                Tidak ada daftar episode langsung yang terdeteksi.
              </p>
            )}

            {/* Synopsis Preview */}
            {animeDetail?.sinopsis && (
              <div className="mt-2 p-3 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-xs text-[#4b463a] leading-relaxed max-h-32 overflow-y-auto">
                <p className="font-semibold text-[#d62828] text-[11px] mb-1">Sinopsis Singkat:</p>
                <p className="text-[11px] text-[#6a6455]">{animeDetail.sinopsis}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANIME CATALOG GRID */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#d62828]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-cyber tracking-widest">MEMUAT DAFTAR ANIME...</span>
        </div>
      ) : animeList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {animeList.map((anime, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectAnime(anime)}
              className="glass-card rounded-2xl overflow-hidden border-2 border-[#141414] hover:border-[#141414] transition-all cursor-pointer group flex flex-col"
            >
              {/* Poster image */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#fffdf5]">
                <img
                  src={anime.image}
                  alt={anime.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

                {/* Status or Latest Episode Badge */}
                {(anime.latestEpisode || anime.status || anime.type) && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#fffdf5] border-2 border-[#141414] text-[9px] font-bold text-[#d62828] font-cyber">
                    {anime.latestEpisode || anime.status || anime.type}
                  </span>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <span className="w-10 h-10 rounded-full bg-[#ffd93d] text-[#141414] flex items-center justify-center shadow-lg  scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="p-2.5 flex flex-col flex-1 justify-between bg-[#fffdf5]">
                <h4 className="text-xs font-bold text-[#141414] line-clamp-2 group-hover:text-[#d62828] transition-colors">
                  {anime.title.replace(/\t+/g, ' ')}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-[#6a6455] mt-2 pt-1 border-t-2 border-[#141414]">
                  <span className="text-[#d62828] font-mono">Tonton Sekarang</span>
                  <Play className="w-3 h-3 text-[#d62828] fill-current" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-[#6a6455]">
          <Film className="w-10 h-10 text-[#6a6455]" />
          <p className="text-xs">Tidak ada anime yang ditemukan.</p>
        </div>
      )}
    </div>
  );
};
