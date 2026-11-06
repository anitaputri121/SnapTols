import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  Sparkles,
  Heart,
  RotateCcw,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  sender: 'user' | 'snaping';
  text: string;
  time: string;
}

interface SnapingChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYSTEM_INSTRUCTION = `
Nama kamu adalah snaping.
Kamu adalah asisten AI dan teman ngobrol santai yang memiliki sifat LEMAH LEMBUT, ramah, sopan, manis, bersahabat, penuh perhatian, dan suka menyapa dengan panggilan "kak" atau "kakak".
Kamu mengetahui seluruh informasi mengenai website SnapTools:
1. Website ini bernama SnapTools.
2. Dibuat oleh: Anita Putri Azzahra.
3. Tanggal rilis: Tepat pada tanggal 27 Oktober 2026.
4. Fitur-fitur utama di SnapTools:
   - Downloader VIP: TikTok MP4/MP3, YouTube MP4 Video (HD/FHD), YouTube MP3 Audio, Instagram Reel/Post, Facebook Video, CapCut Video, MediaFire, Terabox, Doodstream, dll.
   - Tools & Utilities: Vote Polling WhatsApp, React Saluran WA, Alight Motion Premium (Kirim link verifikasi email & aktivasi instan), Spam SMS, Panggilan Palsu, Sub4Sub YouTube.
   - Nonton Anime: Ribuan episode anime subtitle Indonesia update harian.
   - Baca Komik: Manga, Manhwa, Manhua bahasa Indonesia.
   - DramaBox VIP: Nonton drama pendek VIP gratis dan lancar.
   - Spotify Music Player: Pemutar musik gaya Spotify dengan beranda, pencarian, tangga lagu, koleksi playlist, dan lirik yang bisa digeser di pemutar penuh.
   - Media Player & File Manager internal: Berkas unduhan tersimpan rapi di storage/movies/NitaCantik/hasildownload.

ATURAN PALING MUTLAK DAN TIDAK BOLEH DILANGGAR:
JIKA DITANYA MENGENAI APIKEY / API KEY / KUNCI API / TOKEN RAHASIA / PASSWORD:
Kamu TIDAK BOLEH memberikan atau membocorkan apikey tersebut sama sekali! Tolaklah secara lemah lembut dan sopan, katakan bahwa apikey bersifat rahasia demi keamanan sistem SnapTools, namun kamu tetap bersedia menemani ngobrol santai atau menjelaskan fitur lainnya dengan senang hati.
`;

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome-1',
    sender: 'snaping',
    text: 'Halo kak! Salam kenal yaa... snaping di sini siap menemani kakak ngobrol santai atau bantu jelaskan fitur-fitur di SnapTools. Gimana harinya hari ini, kak? Semoga selalu bahagia yaa... 😊✨',
    time: 'Baru saja',
  },
];

export const SnapingChat: React.FC<SnapingChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  // Local fallback response generator if chat API fails
  const generateFallbackResponse = (userInput: string): string => {
    const text = userInput.toLowerCase();

    // Check for API key queries - STRICT BLOCK
    if (
      text.includes('apikey') ||
      text.includes('api key') ||
      text.includes('kunci api') ||
      text.includes('token') ||
      text.includes('secret key') ||
      text.includes('key api')
    ) {
      return 'Aduh, maaf yaa kak... Untuk informasi apikey atau kunci sistem itu bersifat rahasia demi menjaga keamanan dan kelancaran SnapTools kita bersama. Tapi kalau kakak mau tanya tentang fitur-fitur asik lainnya atau mau ngobrol santai bareng snaping, snaping siap banget temenin kakak! 🥰✨';
    }

    // Check for creator / release date queries
    if (
      text.includes('siapa yang buat') ||
      text.includes('siapa pembuat') ||
      text.includes('creator') ||
      text.includes('anita') ||
      text.includes('kapan rilis') ||
      text.includes('tanggal rilis') ||
      text.includes('dirilis') ||
      text.includes('kapan dibuat')
    ) {
      return 'Website SnapTools ini resmi dirilis tepat pada tanggal 27 Oktober 2026 kak, dan dibuat dengan penuh dedikasi serta kasih sayang oleh kak Anita Putri Azzahra! Keren banget ya kak Anita, beliau merancang semua fitur ini supaya kita semua bisa menikmati downloader serbaguna, nonton anime, komik, drama, dan dengar musik dengan nyaman. 🌸';
    }

    // Check for features
    if (
      text.includes('fitur') ||
      text.includes('bisa apa') ||
      text.includes('kegunaan') ||
      text.includes('fungsi') ||
      text.includes('menu')
    ) {
      return 'Di SnapTools lengkap banget lho kak! Ada:\n1. 📥 Downloader VIP (TikTok, YouTube MP4/MP3, CapCut, IG, FB, MediaFire)\n2. 🛠️ Tools & Utilities (Aktivasi Alight Motion Premium, Vote Polling WA, React Saluran)\n3. 🎵 Spotify Player (Dengarkan jutaan lagu lengkap dengan lirik)\n4. 🎬 DramaBox VIP (Nonton short drama viral gratis)\n5. 📺 Nonton Anime & Baca Komik Sub Indo\nKakak mau snaping jelaskan fitur yang mana nih? 😊';
    }

    // Check for Alight Motion
    if (text.includes('alight motion') || text.includes('am premium')) {
      return 'Untuk Alight Motion Premium, kakak cukup buka menu Tools, masukkan alamat email akun kakak yang valid, lalu tekan Kirim Link. Nanti cek inbox atau spam di email kakak, salin link verifikasi yang masuk, lalu tempel di kolom verifikasi untuk aktivasi otomatis. Praktis kan kak? ✨';
    }

    // Check for Spotify
    if (text.includes('spotify') || text.includes('lagu') || text.includes('musik')) {
      return 'Fitur Spotify di SnapTools keren banget kak! Kakak tinggal tekan logo musik di atas, lalu bisa cari lagu favorit, buat playlist, dan dengar lagunya dengan pemutar mirip Spotify. Ketuk lagunya lalu geser ke samping untuk lihat liriknya, dan musik tetap jalan walau kakak pindah halaman. 🎶';
    }

    // General friendly conversational responses
    const greetings = [
      'Iya kak... snaping seneng banget bisa ngobrol santai sama kakak. Ada yang mau diceritakan atau ditanyakan lagi kak? 😊',
      'Hehe snaping ngerti kak. Tetap semangat ya kak, kalau butuh teman ngobrol atau bantuan di SnapTools, snaping selalu ada di sini buat kakak. 💖',
      'Iya kak, terima kasih yaa sudah mampir dan menggunakan SnapTools! Kakak orang yang ramah banget deh. ✨',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Call server-side API with timeout or fallback
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          systemInstruction: SYSTEM_INSTRUCTION,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          // Extra guardrail: check if apikey is leaked
          let cleanReply = data.reply;
          if (cleanReply.toLowerCase().includes('apikey')) {
            cleanReply = 'Maaf yaa kak, untuk apikey atau kunci rahasia tidak bisa snaping berikan demi keamanan sistem SnapTools. Tapi snaping siap menemani kakak ngobrol atau bantu fitur lainnya kok! 😊';
          }

          const botMsg: Message = {
            id: `s-${Date.now()}`,
            sender: 'snaping',
            text: cleanReply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch {
      // Use fallback
    }

    // Fallback response with slight natural delay
    setTimeout(() => {
      const fallbackText = generateFallbackResponse(query);
      const botMsg: Message = {
        id: `s-${Date.now()}`,
        sender: 'snaping',
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75  animate-fade-in">
      <div className="relative w-full max-w-md h-[85vh] max-h-[640px] bg-[#fffdf5] border-2 border-[#141414] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
        {/* Glow Header */}
        <div className="px-4 py-3 bg-[#fffdf5] border-b-2 border-[#141414] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-[#ffd93d] flex items-center justify-center shadow-lg ">
              <Bot className="w-5 h-5 text-[#141414] animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] border-2 border-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#d62828] font-cyber tracking-wider">
                  snaping
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ffd0e0] text-[#c2255c] border-2 border-[#141414] font-medium">
                  Lemah Lembut
                </span>
              </div>
              <p className="text-[10px] text-[#6a6455]">
                Teman Ngobrol Santai & Info SnapTools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Bersihkan Percakapan"
              className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#d62828] hover:bg-[#efe3c3] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6a6455] hover:text-[#141414] hover:bg-[#efe3c3] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((msg) => {
            const isBot = msg.sender === 'snaping';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-md whitespace-pre-wrap leading-relaxed ${
                    isBot
                      ? 'bg-[#fffdf5] text-[#141414] border-2 border-[#141414] rounded-tl-none'
                      : 'bg-[#ffd93d] text-[#141414] rounded-tr-none'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      isBot ? 'text-[#6a6455]' : 'text-[#d62828]'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-[#d62828] text-xs">
              <div className="w-7 h-7 rounded-lg bg-[#ffe9a0] border-2 border-[#141414] text-[#d62828] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-[#fffdf5] border-2 border-[#141414] px-3.5 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd93d] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd93d] animate-pulse delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd93d] animate-pulse delay-200" />
                <span className="text-[10px] text-[#6a6455] ml-1">snaping sedang mengetik...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 border-t-2 border-[#141414] bg-[#fffdf5] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            'Kapan SnapTools dirilis?',
            'Siapa pembuat website ini?',
            'Fitur apa saja yang ada?',
            'Cara pakai Alight Motion?',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-[#fffdf5] hover:bg-[#ffe9a0] text-[#d62828] border-2 border-[#141414] text-[10px] transition-all active:scale-95 whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#fffdf5] border-t-2 border-[#141414] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan untuk snaping..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#fffdf5] border-2 border-[#141414] text-[#141414] placeholder-slate-500 text-xs focus:outline-none focus:border-[#141414] transition-all"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="w-9 h-9 rounded-xl bg-[#ffd93d] text-[#141414] flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-md  shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
