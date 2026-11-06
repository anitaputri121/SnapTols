import React, { useState, useRef } from 'react';
import {
  Wrench,
  Sparkles,
  Crown,
  Eye,
  Heart,
  Image as ImageIcon,
  Scissors,
  Search,
  FastForward,
  CheckSquare,
  Smile,
  UserPlus,
  ArrowRight,
  Clipboard,
  Check,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  Upload,
  RefreshCw,
  Copy,
  Play,
  Film,
  Zap,
  Lock,
} from 'lucide-react';
import {
  sendAmEmail,
  verifAmLink,
  boostTikTokView,
  boostInstagramView,
  boostTikTokLike,
  processWink,
  processHD,
  processRemoveBg,
  searchAmPreset,
  skipLink,
  voteWhatsApp,
  reactWhatsApp,
  suntikChannelWA,
  uploadImageForTools,
  sanitizeErrorMessage,
} from '../utils/toolsApi';

type ToolId =
  | 'am_premium'
  | 'boost_tt_view'
  | 'boost_ig_view'
  | 'boost_tt_like'
  | 'wink_ai'
  | 'hd_enhancer'
  | 'remove_bg'
  | 'find_am_preset'
  | 'skip_link'
  | 'vote_wa'
  | 'react_wa'
  | 'suntik_wa';

interface ToolMeta {
  id: ToolId;
  name: string;
  badge: string;
  category: 'alight' | 'boost' | 'media' | 'whatsapp' | 'utility';
  icon: React.ReactNode;
  color: string;
  locked?: boolean;
}

const TOOLS_LIST: ToolMeta[] = [
  {
    id: 'am_premium',
    name: 'Alight Motion Premium',
    badge: 'Kirim Link & Verif',
    category: 'alight',
    icon: <Crown className="w-4 h-4 text-[#a85d00]" />,
    color: '#f59e0b',
  },
  {
    id: 'boost_tt_view',
    name: 'Boost View TikTok',
    badge: 'Fitur Tidak Tersedia',
    category: 'boost',
    icon: <Eye className="w-4 h-4 text-[#6a6455]" />,
    color: '#64748b',
    locked: true,
  },
  {
    id: 'boost_ig_view',
    name: 'Boost View Reels IG',
    badge: 'Fitur Tidak Tersedia',
    category: 'boost',
    icon: <Play className="w-4 h-4 text-[#6a6455]" />,
    color: '#64748b',
    locked: true,
  },
  {
    id: 'boost_tt_like',
    name: 'Boost Like TikTok',
    badge: 'Fitur Tidak Tersedia',
    category: 'boost',
    icon: <Heart className="w-4 h-4 text-[#6a6455]" />,
    color: '#64748b',
    locked: true,
  },
  {
    id: 'hd_enhancer',
    name: 'HD',
    badge: 'Ultra Resolusi AI',
    category: 'media',
    icon: <Sparkles className="w-4 h-4 text-[#17803a]" />,
    color: '#10b981',
  },
  {
    id: 'remove_bg',
    name: 'Remove Background',
    badge: 'Hapus BG Transparan',
    category: 'media',
    icon: <Scissors className="w-4 h-4 text-[#0b7285]" />,
    color: '#14b8a6',
  },
  {
    id: 'find_am_preset',
    name: 'Cari Preset AM',
    badge: 'Komentar TikTok',
    category: 'alight',
    icon: <Search className="w-4 h-4 text-[#1c5ed6]" />,
    color: '#3b82f6',
  },
  {
    id: 'skip_link',
    name: 'Skip Link Iklan',
    badge: 'Bypass Shortlink',
    category: 'utility',
    icon: <FastForward className="w-4 h-4 text-[#4338ca]" />,
    color: '#6366f1',
  },
  {
    id: 'vote_wa',
    name: 'Vote Polling WhatsApp',
    badge: 'Saluran WA',
    category: 'whatsapp',
    icon: <CheckSquare className="w-4 h-4 text-[#17803a]" />,
    color: '#10b981',
  },
  {
    id: 'react_wa',
    name: 'React Saluran WA',
    badge: 'Emoji Reaksi',
    category: 'whatsapp',
    icon: <Smile className="w-4 h-4 text-[#a85d00]" />,
    color: '#eab308',
  },
  {
    id: 'suntik_wa',
    name: 'Suntik Saluran WA',
    badge: 'Fitur Tidak Tersedia',
    category: 'whatsapp',
    icon: <UserPlus className="w-4 h-4 text-[#6a6455]" />,
    color: '#64748b',
    locked: true,
  },
];

export const ToolsTab: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolId>('am_premium');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Loading, error, and feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // 1. Alight Motion State
  const [amEmail, setAmEmail] = useState('');
  const [amStep, setAmStep] = useState<'send' | 'verif' | 'activate'>('send');
  const [amVerifLink, setAmVerifLink] = useState('');
  const [amActivated, setAmActivated] = useState(false);

  // 2. TikTok Views State
  const [ttViewUrl, setTtViewUrl] = useState('');
  const [ttViewQty, setTtViewQty] = useState(500);

  // 3. Reels Views State
  const [igViewUrl, setIgViewUrl] = useState('');
  const [igViewQty, setIgViewQty] = useState(500);

  // 4. TikTok Likes State
  const [ttLikeUrl, setTtLikeUrl] = useState('');
  const [ttLikeQty, setTtLikeQty] = useState(200);

  // HD State (Upload Image or Paste URL)
  const [hdFile, setHdFile] = useState<File | null>(null);
  const [hdUrl, setHdUrl] = useState('');
  const [hdPreview, setHdPreview] = useState<string | null>(null);
  const [hdResultImage, setHdResultImage] = useState<string | null>(null);
  const hdInputRef = useRef<HTMLInputElement>(null);

  // 7. Remove BG State (Upload or Paste URL)
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgUrl, setBgUrl] = useState('');
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgResultImage, setBgResultImage] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // 8. Cari Preset AM State
  const [amPresetTiktokUrl, setAmPresetTiktokUrl] = useState('');
  const [amPresetResults, setAmPresetResults] = useState<Array<{ name: string; link: string; type?: string }>>([]);

  // 9. Skip Link State
  const [skipInputUrl, setSkipInputUrl] = useState('');
  const [skipDestination, setSkipDestination] = useState<string | null>(null);

  // 10. Vote WA State
  const [waVoteUrl, setWaVoteUrl] = useState('');
  const [waVotePesan, setWaVotePesan] = useState('');

  // 11. React WA State
  const [waReactUrl, setWaReactUrl] = useState('');
  const [waReactionEmoji, setWaReactionEmoji] = useState('❤️');

  // 12. Suntik WA State
  const [waSuntikUrl, setWaSuntikUrl] = useState('');
  const [waSuntikQty, setWaSuntikQty] = useState(250);

  // Utility to paste from clipboard
  const handlePasteTo = async (setter: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setter(text.trim());
      }
    } catch {
      const text = prompt('Tempelkan tautan URL:');
      if (text) setter(text.trim());
    }
  };

  const copyToClipboard = async (text: string, label: string = 'Tautan') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    } catch {
      prompt('Salin teks berikut:', text);
    }
  };

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // 1. Alight Motion Actions
  const handleSendAmEmail = async () => {
    if (!amEmail.trim()) {
      setErrorMsg('Masukkan alamat email Alight Motion terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await sendAmEmail(amEmail);
      setSuccessMsg(res.message);
      setAmStep('verif');
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal mengirim email verifikasi.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifAmLink = async () => {
    if (!amVerifLink.trim()) {
      setErrorMsg('Salin dan tempelkan link verifikasi dari email Anda.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await verifAmLink(amEmail, amVerifLink);
      setSuccessMsg(res.message);
      setAmStep('activate');
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Verifikasi link gagal.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateAm = () => {
    setAmActivated(true);
    setSuccessMsg('Selamat! Akun Alight Motion Premium Anda Berhasil Diaktifkan!');
  };

  // 2. Boost TikTok Views
  const handleBoostTtView = async () => {
    if (!ttViewUrl.trim()) {
      setErrorMsg('Masukkan tautan video TikTok terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await boostTikTokView(ttViewUrl, ttViewQty);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal melakukan boost view TikTok.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Boost Instagram Reels Views
  const handleBoostIgView = async () => {
    if (!igViewUrl.trim()) {
      setErrorMsg('Masukkan tautan Reels Instagram terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await boostInstagramView(igViewUrl, igViewQty);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal melakukan boost view Reels Instagram.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Boost TikTok Likes
  const handleBoostTtLike = async () => {
    if (!ttLikeUrl.trim()) {
      setErrorMsg('Masukkan tautan video TikTok terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await boostTikTokLike(ttLikeUrl, ttLikeQty);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal melakukan boost like TikTok.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. HD Image
  const handleHdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHdFile(file);
      setHdPreview(URL.createObjectURL(file));
      setHdResultImage(null);
      resetMessages();
    }
  };

  const handleProcessHD = async () => {
    resetMessages();
    setIsLoading(true);
    try {
      let targetUrl = hdUrl.trim();
      if (hdFile) {
        try {
          targetUrl = await uploadImageForTools(hdFile);
        } catch {
          targetUrl = URL.createObjectURL(hdFile);
        }
      } else if (!targetUrl) {
        throw new Error('Pilih gambar dari galeri atau masukkan URL gambar terlebih dahulu.');
      }
      const res = await processHD(targetUrl);
      setHdResultImage(res.mediaUrl);
      setSuccessMsg('Gambar berhasil ditingkatkan ke resolusi HD maksimal tanpa pecah!');
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal memproses gambar HD.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Remove Background
  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgFile(file);
      setBgPreview(URL.createObjectURL(file));
      setBgResultImage(null);
      resetMessages();
    }
  };

  const handleProcessRemoveBg = async () => {
    resetMessages();
    setIsLoading(true);
    try {
      let targetUrl = bgUrl.trim();
      if (bgFile) {
        targetUrl = await uploadImageForTools(bgFile);
      } else if (!targetUrl) {
        throw new Error('Unggah file gambar atau masukkan tautan URL gambar terlebih dahulu.');
      }
      const res = await processRemoveBg(targetUrl);
      setBgResultImage(res.mediaUrl);
      setSuccessMsg('Background gambar berhasil dihapus transparan!');
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal menghapus background gambar.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Cari Preset AM
  const handleSearchAmPreset = async () => {
    if (!amPresetTiktokUrl.trim()) {
      setErrorMsg('Masukkan tautan video TikTok terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await searchAmPreset(amPresetTiktokUrl);
      setAmPresetResults(res.presets);
      setSuccessMsg(`Ditemukan ${res.presets.length} preset Alight Motion dari video ini!`);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Tidak ditemukan preset.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Skip Link
  const handleSkipLink = async () => {
    if (!skipInputUrl.trim()) {
      setErrorMsg('Masukkan tautan iklan/shortlink terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await skipLink(skipInputUrl);
      setSkipDestination(res.destination);
      setSuccessMsg('Link iklan berhasil di-skip ke tujuan langsung!');
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal melewati shortlink.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Vote WhatsApp
  const handleVoteWhatsApp = async () => {
    if (!waVoteUrl.trim() || !waVotePesan.trim()) {
      setErrorMsg('Masukkan tautan polling saluran WhatsApp dan opsi pesan yang ingin dipilih.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await voteWhatsApp(waVoteUrl, waVotePesan);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal melakukan vote WhatsApp.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 11. React WhatsApp
  const handleReactWhatsApp = async () => {
    if (!waReactUrl.trim()) {
      setErrorMsg('Masukkan tautan postingan channel WhatsApp terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await reactWhatsApp(waReactUrl, waReactionEmoji);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal mengirim reaksi emoji.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 12. Suntik Saluran WA
  const handleSuntikWA = async () => {
    if (!waSuntikUrl.trim()) {
      setErrorMsg('Masukkan tautan Saluran WhatsApp terlebih dahulu.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const res = await suntikChannelWA(waSuntikUrl, waSuntikQty);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(sanitizeErrorMessage(err.message || 'Gagal memproses suntik saluran.'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools =
    activeCategory === 'all'
      ? TOOLS_LIST
      : TOOLS_LIST.filter((t) => t.category === activeCategory);

  const activeToolMeta = TOOLS_LIST.find((t) => t.id === selectedTool)!;

  return (
    <div className="w-full flex flex-col gap-4 pb-28">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#141414] tracking-wide flex items-center gap-2 font-cyber">
            <Wrench className="w-4 h-4 text-[#d62828]" />
            <span>TOOLS & SPECIALIZED UTILITIES</span>
          </h2>
          <p className="text-xs text-[#6a6455]">
            Kumpulan 11 tools otomatis berbasis AI & server API premium
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] font-cyber whitespace-nowrap shrink-0">
          TOOLS VIP
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua (11 Tools)' },
          { id: 'alight', label: 'Alight Motion' },
          { id: 'boost', label: 'Sosmed Boost' },
          { id: 'media', label: 'Media & AI' },
          { id: 'whatsapp', label: 'Saluran WA' },
          { id: 'utility', label: 'Skip Link' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-[#ffd93d] text-[#141414] font-bold shadow-sm '
                : 'bg-[#fffdf5] text-[#6a6455] hover:text-[#141414] border-2 border-[#141414]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Quick Tool Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filteredTools.map((t) => {
          const isSelected = selectedTool === t.id;
          const isLocked = t.locked;
          return (
            <button
              key={t.id}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;
                setSelectedTool(t.id);
                resetMessages();
              }}
              className={`p-3 rounded-xl flex flex-col items-start gap-1.5 text-left transition-all relative ${
                isLocked
                  ? 'opacity-60 cursor-not-allowed bg-[#fffdf5] border-2 border-[#141414] select-none'
                  : isSelected
                  ? 'bg-[#fffdf5] border-2 border-[#141414] shadow-md '
                  : 'bg-[#fffdf5] hover:bg-[#fffdf5] border-2 border-[#141414]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-1 rounded-lg ${
                    isLocked
                      ? 'bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f]'
                      : 'bg-[#efe3c3] border-2 border-[#141414]'
                  }`}
                >
                  {isLocked ? <Lock className="w-4 h-4 text-[#c1121f]" /> : t.icon}
                </div>
                {isLocked ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-[#c1121f] bg-[#ffd6d2] px-1.5 py-0.5 rounded border-2 border-[#141414] font-mono">
                    <Lock className="w-2.5 h-2.5" />
                    KUNCI
                  </span>
                ) : (
                  isSelected && <span className="w-2 h-2 rounded-full bg-[#ffd93d] animate-ping" />
                )}
              </div>
              <span
                className={`text-xs font-semibold line-clamp-1 mt-0.5 ${
                  isLocked ? 'text-[#6a6455]' : 'text-[#141414]'
                }`}
              >
                {t.name}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isLocked ? 'text-[#c1121f] font-bold' : 'text-[#6a6455]'
                }`}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] text-xs flex items-start gap-2 shadow-lg animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#c1121f] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#c1121f]">Gagal Memproses</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-[#c9f2d4] border-2 border-[#141414] text-[#17803a] text-xs flex items-start gap-2 shadow-lg animate-fade-in">
          <Check className="w-4 h-4 shrink-0 text-[#17803a] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#17803a]">Berhasil</p>
            <p className="mt-0.5 leading-relaxed">{successMsg}</p>
          </div>
        </div>
      )}

      {/* ACTIVE TOOL VIEWPORT */}
      <div className="glass-card-glow rounded-2xl p-4 sm:p-5 flex flex-col gap-4 border-2 border-[#141414] shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#ffe9a0] border-2 border-[#141414]">
              {activeToolMeta.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141414] font-cyber tracking-wider">
                {activeToolMeta.name.toUpperCase()}
              </h3>
              <p className="text-[10px] text-[#6a6455]">{activeToolMeta.badge}</p>
            </div>
          </div>
          {activeToolMeta.locked ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#ffd6d2] text-[#c1121f] border-2 border-[#141414] flex items-center gap-1 shadow-sm">
              <Lock className="w-3 h-3 text-[#c1121f]" />
              TERKUNCI
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#c9f2d4] text-[#17803a] border-2 border-[#141414] flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></span>
              VIP ACTIVE
            </span>
          )}
        </div>

        {activeToolMeta.locked ? (
          <div className="py-10 px-4 flex flex-col items-center text-center gap-3 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#ffd6d2] border-2 border-[#141414] flex items-center justify-center text-[#c1121f] shadow-xl ">
              <Lock className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#c1121f] tracking-wider bg-[#ffd6d2] border-2 border-[#141414] px-3 py-1 rounded-full font-mono uppercase">
                Fitur Tidak Tersedia
              </span>
              <h3 className="text-base font-bold text-[#141414] mt-1 font-cyber">
                {activeToolMeta.name}
              </h3>
              <p className="text-xs text-[#6a6455] max-w-sm mt-1 leading-relaxed">
                Fitur suntik ini telah dikunci dan dinonaktifkan sementara oleh sistem. Silakan manfaatkan fitur aktif lainnya yang siap digunakan tanpa kendala.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="mt-3 py-3 px-8 rounded-xl bg-[#ffd6d2] border-2 border-[#141414] text-[#c1121f] font-bold text-xs cursor-not-allowed opacity-60 font-cyber tracking-widest uppercase select-none"
            >
              FITUR TIDAK TERSEDIA
            </button>
          </div>
        ) : (
          <>
            {/* 1. Alight Motion Premium */}
        {selectedTool === 'am_premium' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Dapatkan aktivasi Alight Motion Premium resmi. Masukkan email Anda, klik kirim link, lalu salin link verifikasi yang masuk ke inbox email Anda untuk diaktivasi.
            </p>

            {/* Step 1: Input Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">1. Alamat Email Akun:</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={amEmail}
                  onChange={(e) => setAmEmail(e.target.value)}
                  placeholder="contoh: user@gmail.com"
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendAmEmail}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs font-cyber tracking-wider shrink-0 shadow-md disabled:opacity-50"
                >
                  {isLoading && amStep === 'send' ? 'MENGIRIM...' : 'KIRIM LINK'}
                </button>
              </div>
            </div>

            {/* Step 2: Verification Link */}
            {amStep !== 'send' && (
              <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-[#141414] animate-fade-in">
                <label className="text-xs font-semibold text-[#4b463a]">
                  2. Salin & Tempel Link Verifikasi dari Email:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={amVerifLink}
                    onChange={(e) => setAmVerifLink(e.target.value)}
                    placeholder="https://alightmotion.com/verify/..."
                    className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handlePasteTo(setAmVerifLink)}
                    className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                  >
                    Paste
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleVerifAmLink}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#ffb703]   text-[#141414] font-bold text-xs font-cyber tracking-wide shadow-md disabled:opacity-50"
                  >
                    {isLoading ? 'MEMVERIFIKASI...' : 'VERIFIKASI LINK SEKARANG'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Activate Button */}
            {amStep === 'activate' && (
              <div className="pt-2 animate-pop-in">
                <button
                  type="button"
                  onClick={handleActivateAm}
                  disabled={amActivated}
                  className={`w-full py-3.5 px-4 rounded-xl font-cyber font-extrabold text-sm tracking-widest shadow-lg transition-all ${
                    amActivated
                      ? 'bg-[#4ade80] text-[#141414] '
                      : 'bg-[#4ade80] text-[#141414] hover:brightness-110 active:scale-95 '
                  }`}
                >
                  {amActivated ? '✓ ALIGHT MOTION PREMIUM AKTIF' : 'AKTIFKAN SEKARANG'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Boost View TikTok */}
        {selectedTool === 'boost_tt_view' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tingkatkan jumlah tayangan (views) video TikTok publik Anda secara otomatis hingga 1000 views per permintaan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Video TikTok:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={ttViewUrl}
                  onChange={(e) => setTtViewUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/... atau https://vt.tiktok.com/..."
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setTtViewUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#4b463a]">
                <span>Nominal Views:</span>
                <span className="font-bold text-[#d62828] font-cyber text-sm">{ttViewQty} Views</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={ttViewQty}
                onChange={(e) => setTtViewQty(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#6a6455] font-mono">
                <span>50</span>
                <span>500</span>
                <span>1000 (Maksimal)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBoostTtView}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES BOOST VIEWS...</span>
                </div>
              ) : (
                'BOOST VIEW TIKTOK SEKARANG'
              )}
            </button>
          </div>
        )}

        {/* 3. Boost View Reels Instagram */}
        {selectedTool === 'boost_ig_view' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tingkatkan jumlah penonton Reels Instagram publik Anda hingga 1000 views.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Reels Instagram:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={igViewUrl}
                  onChange={(e) => setIgViewUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/... atau https://www.instagram.com/p/..."
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setIgViewUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#4b463a]">
                <span>Nominal Views:</span>
                <span className="font-bold text-[#c2255c] font-cyber text-sm">{igViewQty} Views</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={igViewQty}
                onChange={(e) => setIgViewQty(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#6a6455] font-mono">
                <span>50</span>
                <span>500</span>
                <span>1000 (Maksimal)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBoostIgView}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ff8fb1]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES BOOST REELS...</span>
                </div>
              ) : (
                'BOOST VIEW REELS SEKARANG'
              )}
            </button>
          </div>
        )}

        {/* 4. Boost Like TikTok */}
        {selectedTool === 'boost_tt_like' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tingkatkan jumlah like video TikTok publik secara instan hingga 1000 like per permintaan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Video TikTok:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={ttLikeUrl}
                  onChange={(e) => setTtLikeUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/... atau https://vt.tiktok.com/..."
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setTtLikeUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#4b463a]">
                <span>Nominal Likes:</span>
                <span className="font-bold text-[#c2255c] font-cyber text-sm">{ttLikeQty} Likes</span>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                step="20"
                value={ttLikeQty}
                onChange={(e) => setTtLikeQty(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#6a6455] font-mono">
                <span>20</span>
                <span>200</span>
                <span>1000 (Maksimal)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBoostTtLike}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ff6b5e]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES BOOST LIKE...</span>
                </div>
              ) : (
                'BOOST LIKE TIKTOK SEKARANG'
              )}
            </button>
          </div>
        )}

        {/* 5. Wink (Upload Image -> HD or Animate) */}
        {/* HD Image Enhancer */}
        {selectedTool === 'hd_enhancer' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tingkatkan ketajaman, kejernihan, dan resolusi foto buram menjadi kualitas <b>HD Super-Resolution</b> tanpa mengurangi kualitas gambar.
            </p>

            <input
              type="file"
              ref={hdInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleHdFileChange}
            />

            {/* Upload Box */}
            <div
              onClick={() => hdInputRef.current?.click()}
              className="w-full p-4 rounded-xl border-2 border-dashed border-[#141414] hover:border-[#141414] bg-[#fffdf5] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {hdPreview ? (
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden flex items-center justify-center bg-[#efe3c3]">
                  <img
                    src={hdPreview}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-48 object-contain"
                  />
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#fffdf5] border-2 border-[#141414] text-[10px] text-[#d62828]">
                    Ganti Gambar
                  </span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 text-[#17803a] animate-pulse" />
                  <span className="text-xs font-semibold text-[#141414]">
                    Pilih Gambar dari Galeri (Maks 1 Gambar)
                  </span>
                  <span className="text-[10px] text-[#6a6455]">JPG, PNG, WEBP, JPEG</span>
                </>
              )}
            </div>

            {/* Alternative URL input */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={hdUrl}
                onChange={(e) => setHdUrl(e.target.value)}
                placeholder="Atau tempel tautan URL gambar..."
                className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handlePasteTo(setHdUrl)}
                className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
              >
                Paste
              </button>
            </div>

            {/* Single HD Process Button */}
            <button
              type="button"
              onClick={handleProcessHD}
              disabled={isLoading || (!hdFile && !hdUrl.trim())}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-extrabold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all uppercase"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES HD GAMBAR...</span>
                </div>
              ) : (
                'PROSES HD GAMBAR SEKARANG'
              )}
            </button>

            {/* Result HD Image with Download */}
            {hdResultImage && (
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#141414] animate-pop-in">
                <span className="text-xs font-bold text-[#17803a] font-cyber">HASIL GAMBAR HD SELESAI:</span>
                <div className="w-full max-h-80 rounded-xl overflow-hidden flex items-center justify-center bg-[#efe3c3] p-2 border-2 border-[#141414]">
                  <img
                    src={hdResultImage}
                    alt="HD Result"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-72 object-contain"
                  />
                </div>
                <a
                  href={hdResultImage}
                  download="foto_hd_super_resolution.jpg"
                  className="w-full py-3.5 rounded-xl bg-[#4ade80] text-[#141414] font-extrabold text-sm font-cyber tracking-wider flex items-center justify-center gap-2 shadow-lg "
                >
                  <Download className="w-4 h-4 text-[#141414]" />
                  <span>UNDUH GAMBAR SEKARANG (KUALITAS PENUH)</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* 7. Remove Background */}
        {selectedTool === 'remove_bg' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Hapus latar belakang foto objek, orang, atau produk secara presisi menjadi format PNG transparan tanpa mengurangi kualitas.
            </p>

            <input
              type="file"
              ref={bgInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleBgFileChange}
            />

            <div
              onClick={() => bgInputRef.current?.click()}
              className="w-full p-4 rounded-xl border-2 border-dashed border-[#141414] hover:border-[#141414] bg-[#fffdf5] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {bgPreview ? (
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden flex items-center justify-center bg-[#efe3c3]">
                  <img
                    src={bgPreview}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-48 object-contain"
                  />
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#fffdf5] border-2 border-[#141414] text-[10px] text-[#d62828]">
                    Ganti Gambar
                  </span>
                </div>
              ) : (
                <>
                  <Scissors className="w-8 h-8 text-[#0b7285]" />
                  <span className="text-xs font-semibold text-[#141414]">
                    Unggah Gambar (Maks 1 Gambar)
                  </span>
                  <span className="text-[10px] text-[#6a6455]">Atau masukkan URL di bawah</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={bgUrl}
                onChange={(e) => setBgUrl(e.target.value)}
                placeholder="Atau tempel URL gambar: https://..."
                className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handlePasteTo(setBgUrl)}
                className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
              >
                Paste
              </button>
            </div>

            <button
              type="button"
              onClick={handleProcessRemoveBg}
              disabled={isLoading || (!bgFile && !bgUrl.trim())}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>SEDANG MENGHAPUS BACKGROUND...</span>
                </div>
              ) : (
                'HAPUS BG (BACKGROUND) SEKARANG'
              )}
            </button>

            {bgResultImage && (
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#141414] animate-pop-in">
                <span className="text-xs font-bold text-[#0b7285] font-cyber">HASIL BACKGROUND TRANSPARAN:</span>
                <div className="w-full max-h-80 rounded-xl overflow-hidden flex items-center justify-center bg-[radial-gradient(#2a3b53_1px,transparent_1px)] [background-size:16px_16px] bg-[#fffdf5] p-2 border-2 border-[#141414]">
                  <img
                    src={bgResultImage}
                    alt="Transparent Result"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-72 object-contain"
                  />
                </div>
                <a
                  href={bgResultImage}
                  download="gambar_tanpa_background.png"
                  className="w-full py-3.5 rounded-xl bg-[#4ade80] text-[#141414] font-extrabold text-sm font-cyber tracking-wider flex items-center justify-center gap-2 shadow-lg "
                >
                  <Download className="w-4 h-4" />
                  <span>UNDUH GAMBAR TANPA BACKGROUND</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* 8. Cari Preset Alight Motion */}
        {selectedTool === 'find_am_preset' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Mencari dan mengekstrak tautan preset resmi <b>Alight Motion</b> (contoh: <span className="text-[#d62828] font-mono text-[11px]">https://alightcreative.com/am/share/...</span> atau XML Drive) dari komentar dan deskripsi video TikTok.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">
                Tautan Video TikTok atau Link Preset Alight Motion:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={amPresetTiktokUrl}
                  onChange={(e) => setAmPresetTiktokUrl(e.target.value)}
                  placeholder="https://vt.tiktok.com/... atau https://alightcreative.com/am/share/..."
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setAmPresetTiktokUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSearchAmPreset}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-extrabold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all uppercase"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MENCARI LINK PRESET ALIGHT MOTION...</span>
                </div>
              ) : (
                'CARI LINK PRESET SEKARANG'
              )}
            </button>

            {amPresetResults.length > 0 && (
              <div className="flex flex-col gap-2.5 pt-2 border-t-2 border-[#141414] animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1c5ed6] font-cyber">
                    LINK PRESET DITEMUKAN ({amPresetResults.length}):
                  </span>
                  <span className="text-[10px] text-[#17803a] font-mono">
                    ✓ Link Alight Motion Aktif
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {amPresetResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-2 shadow-md "
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#d62828] px-2 py-0.5 rounded-full bg-[#ffe9a0] border-2 border-[#141414] font-mono">
                          {item.type || 'Alight Motion Preset'}
                        </span>
                        <span className="text-[10px] text-[#6a6455] font-mono">#{idx + 1}</span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#efe3c3] border-2 border-[#141414]">
                        <p className="text-[11px] text-[#d62828] font-mono break-all select-all">
                          {item.link}
                        </p>
                      </div>

                      {/* 2 Tombol Sesuai Permintaan User: Salin Link & Buka Link */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.link, `Preset #${idx + 1}`)}
                          className="py-2 px-3 rounded-xl bg-[#ffe9a0] hover:bg-[#ffe9a0] text-[#d62828] text-xs font-bold border-2 border-[#141414] flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#d62828]" />
                          <span>SALIN LINK</span>
                        </button>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-[#ffd93d]   text-[#141414] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md  transition-all"
                        >
                          <span>BUKA LINK</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 9. Skip Link / Ad-Link Bypasser */}
        {selectedTool === 'skip_link' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Lewati iklan hitung mundur, safelink, sfl gl, linkvertise, dan shortlink lainnya langsung menuju ke URL tujuan akhir tanpa gangguan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Iklan / Shortlink:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={skipInputUrl}
                  onChange={(e) => setSkipInputUrl(e.target.value)}
                  placeholder="https://sfl.gl/... atau https://linkvertise.com/..."
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setSkipInputUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkipLink}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>SEDANG MEM-BYPASS IKLAN...</span>
                </div>
              ) : (
                'SKIP LINK IKLAN SEKARANG'
              )}
            </button>

            {skipDestination && (
              <div className="p-3.5 rounded-xl bg-[#fffdf5] border-2 border-[#141414] flex flex-col gap-2.5 animate-pop-in">
                <span className="text-xs font-bold text-[#4338ca] font-cyber">HASIL LINK TUJUAN AKHIR:</span>
                <p className="text-xs font-mono text-[#d62828] break-all p-2 rounded-lg bg-[#efe3c3] border-2 border-[#141414]">
                  {skipDestination}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(skipDestination, 'Link Tujuan')}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#ffe9a0] hover:bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link Tujuan</span>
                  </button>
                  <a
                    href={skipDestination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-[#ffd93d] text-[#141414] text-xs font-bold font-cyber flex items-center justify-center gap-1.5"
                  >
                    <span>Buka Tujuan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10. Vote WhatsApp */}
        {selectedTool === 'vote_wa' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Kirim suara (vote) pada polling saluran WhatsApp publik dengan memilih opsi pesan yang ditentukan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Postingan Polling Saluran WA:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={waVoteUrl}
                  onChange={(e) => setWaVoteUrl(e.target.value)}
                  placeholder="https://whatsapp.com/channel/.../123"
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setWaVoteUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Pilihan Opsi / Pesan Vote:</label>
              <input
                type="text"
                value={waVotePesan}
                onChange={(e) => setWaVotePesan(e.target.value)}
                placeholder="Masukkan teks opsi yang dipilih (misal: Pilihan 1)"
                className="w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleVoteWhatsApp}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MENGIRIM VOTE POLLING...</span>
                </div>
              ) : (
                'VOTE SALURAN WA SEKARANG'
              )}
            </button>
          </div>
        )}

        {/* 11. React Saluran WhatsApp */}
        {selectedTool === 'react_wa' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Beri reaksi emoji pada pesan atau postingan di saluran WhatsApp publik secara instan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Pesan Saluran WA:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={waReactUrl}
                  onChange={(e) => setWaReactUrl(e.target.value)}
                  placeholder="https://whatsapp.com/channel/.../456"
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setWaReactUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Pilih Emoji Reaksi:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['❤️', '👍', '🔥', '😂', '👏', '🎉', '🚀', '😍', '⭐', '⚡'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setWaReactionEmoji(emoji)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      waReactionEmoji === emoji
                        ? 'bg-[#ffe9a0] border-2 border-[#141414] scale-110 shadow-md '
                        : 'bg-[#fffdf5] border-2 border-[#141414] hover:bg-[#fffdf5]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={waReactionEmoji}
                onChange={(e) => setWaReactionEmoji(e.target.value)}
                placeholder="Atau ketik emoji kustom..."
                className="mt-1 w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2 text-xs text-[#141414] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleReactWhatsApp}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MENGIRIM REAKSI EMOJI...</span>
                </div>
              ) : (
                `KIRIM REAKSI ${waReactionEmoji} KE SALURAN WA`
              )}
            </button>
          </div>
        )}

        {/* 12. Suntik Saluran WhatsApp */}
        {selectedTool === 'suntik_wa' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#4b463a] leading-relaxed">
              Tingkatkan jumlah pengikut (followers) saluran WhatsApp Anda secara instan hingga 1000 pengikut.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#4b463a]">Tautan Saluran WhatsApp:</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={waSuntikUrl}
                  onChange={(e) => setWaSuntikUrl(e.target.value)}
                  placeholder="https://whatsapp.com/channel/0029Vb8dmsUElagkVPIw9X2P"
                  className="flex-1 bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] rounded-xl px-3.5 py-2.5 text-xs text-[#141414] outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handlePasteTo(setWaSuntikUrl)}
                  className="px-3 py-2.5 rounded-xl bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-xs font-semibold shrink-0"
                >
                  Paste
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#4b463a]">
                <span>Jumlah Pengikut:</span>
                <span className="font-bold text-[#17803a] font-cyber text-sm">
                  {waSuntikQty} Pengikut
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={waSuntikQty}
                onChange={(e) => setWaSuntikQty(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#6a6455] font-mono">
                <span>50</span>
                <span>250</span>
                <span>1000 (Maksimal)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSuntikWA}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4ade80]   text-[#141414] font-bold text-xs font-cyber tracking-wider shadow-lg  active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#141414]" />
                  <span>MEMPROSES SUNTIK SALURAN WA...</span>
                </div>
              ) : (
                'SUNTIK PENGIKUT SALURAN SEKARANG'
              )}
            </button>
          </div>
        )}
          </>
        )}
      </div>

      {/* Copy Toast */}
      {copiedText && (
        <div className="p-2.5 rounded-xl bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] text-xs font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
          <Check className="w-4 h-4 text-[#17803a]" />
          <span>{copiedText} berhasil disalin ke clipboard!</span>
        </div>
      )}
    </div>
  );
};
