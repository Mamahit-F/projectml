import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Menu, MessageCircle, X } from 'lucide-react';
import { assistantService, type JagoChatTurn } from '../../services/assistantService';
import { useGuide } from '../../contexts/GuideContext';

const STORAGE_KEY = 'si_jago_history_v1';

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  fallbackNotice?: boolean;
}

const QUICK_PROMPTS = [
  {
    title: 'Algoritma ML apa yang digunakan?',
    subtitle: 'Penjelasan model aktif & cara kerjanya',
    prompt: 'Algoritma machine learning apa yang digunakan di sistem ini?',
  },
  {
    title: 'Apakah sudah ada mahasiswa dibina?',
    subtitle: 'Cek langsung data live sesi pembinaan',
    prompt: 'Apakah sudah ada mahasiswa yang dilakukan pembinaan?',
  },
  {
    title: 'Cek prediksi mahasiswa S22210541',
    subtitle: 'Lihat poin historis, klaster & estimasi',
    prompt: 'Cek kondisi dan prediksi mahasiswa NIM S22210541',
  },
  {
    title: 'Bagaimana alur unggah & hapus PDF?',
    subtitle: 'Panduan sinkronisasi data mahasiswa',
    prompt: 'Bagaimana cara kerja unggah dan hapus PDF di sistem ini?',
  },
];

function loadHistory(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string');
  } catch {
    return [];
  }
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Parse **bold** (including nested `code`), `code`, and *italic* safely without dangerouslySetInnerHTML
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      const inner = tok.slice(2, -2);
      const innerParts = inner.split(/(`[^`]+`)/g).map((part, j) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={j} className="px-1.5 py-0.5 rounded bg-[#F4F5F7] text-xs font-mono font-semibold text-obsidian">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={j}>{part}</React.Fragment>
        )
      );
      return (
        <strong key={i} className="font-bold text-obsidian">
          {innerParts}
        </strong>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-[#F4F5F7] text-xs font-mono text-obsidian">
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <em key={i} className="italic text-slate-600">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

const CleanMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading block (# / ## / ###)
    if (/^#{1,3}\s+/.test(trimmed)) {
      blocks.push(
        <h4 key={`h-${i}`} className="text-sm font-extrabold text-obsidian pt-1">
          {renderInlineMarkdown(trimmed.replace(/^#{1,3}\s+/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet list block
    if (/^[-•*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 text-slate-700">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list block
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1.5 text-slate-700">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Normal paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^[-•*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={`p-${i}`} className="text-obsidian leading-7">
        {renderInlineMarkdown(paraLines.join(' '))}
      </p>
    );
  }

  return <div className="space-y-2.5 text-sm">{blocks}</div>;
};

/* ===================== 1. SMALL ROUND FLOATING BUTTON ===================== */
export const JagoFloatingButton: React.FC<{ isOpen: boolean; onOpen: () => void }> = ({
  isOpen,
  onOpen,
}) => {
  const { isGuideActive } = useGuide();

  if (isOpen || isGuideActive) return null;

  return (
    <div className="fixed bottom-20 right-5 z-40 group flex items-center">
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all mr-2.5 px-3 py-1.5 rounded-full bg-obsidian text-white text-xs font-semibold whitespace-nowrap shadow-soft">
        Tanya Jago
      </span>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Buka Asisten AI Jago"
        className="w-14 h-14 rounded-full bg-coral-gradient text-white shadow-coral hover:scale-105 active:scale-95 transition flex items-center justify-center relative"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-obsidian" />
        </span>
      </button>
    </div>
  );
};

/* ===================== 2. FULL-CONTENT WORKSPACE (SIDEBAR STAYS VISIBLE) ===================== */
export const JagoWorkspace: React.FC<{
  onClose: () => void;
  onOpenMobileSidebar: () => void;
}> = ({ onClose, onOpenMobileSidebar }) => {
  const [messages, setMessages] = useState<StoredMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore storage quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const historyForApi: JagoChatTurn[] = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const userMsg: StoredMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await assistantService.chat(trimmed, historyForApi);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          fallbackNotice: res.engine === 'LOCAL_FALLBACK',
        },
      ]);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        'Maaf, Jago belum bisa menghubungi server saat ini. Pastikan backend berjalan lalu coba lagi.';
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: errMsg,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleNewChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <section
      aria-label="Asisten AI Jago"
      className="fixed inset-0 lg:left-[260px] z-30 bg-white flex flex-col"
    >
      {/* Minimal Header */}
      <header className="h-14 px-4 sm:px-8 border-b border-[#ECEEF2] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Buka menu Sidebar"
            className="lg:hidden w-9 h-9 rounded-full hover:bg-[#F4F5F7] text-obsidian flex items-center justify-center transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-coral-gradient text-white font-extrabold text-xs flex items-center justify-center shrink-0">
            J
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-extrabold text-obsidian">Jago</span>
            <span className="text-xs text-slate-400">Asisten StudentInsight</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              type="button"
              onClick={handleNewChat}
              className="px-3.5 py-1.5 rounded-full bg-[#F7F8FA] hover:bg-[#ECEEF2] text-xs font-semibold text-obsidian transition"
            >
              Obrolan Baru
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Tutup Jago (Esc)"
            aria-label="Tutup Jago"
            className="w-9 h-9 rounded-full hover:bg-[#F4F5F7] text-slate-500 hover:text-obsidian flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto w-full min-h-full flex flex-col">
          {!hasMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-6">
              <div className="space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-coral-gradient text-white font-extrabold text-lg flex items-center justify-center shadow-coral">
                  J
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-obsidian">
                  Ada yang bisa Jago bantu?
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Tanyakan apa saja seputar sistem StudentInsight, data mahasiswa, status pembinaan, laporan PDF, atau analisis Machine Learning.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl pt-2">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.title}
                    type="button"
                    onClick={() => sendMessage(qp.prompt)}
                    className="text-left px-4 py-3 rounded-2xl bg-[#F7F8FA] hover:bg-coral-50 border border-[#ECEEF2] hover:border-coral-200 transition"
                  >
                    <p className="text-xs font-bold text-obsidian">{qp.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{qp.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-7">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[82%] px-4 py-2.5 rounded-3xl rounded-br-md bg-[#F4F5F7] text-obsidian text-sm leading-relaxed font-medium whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-coral-gradient text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      J
                    </div>
                    <div className="flex-1 min-w-0">
                      <CleanMarkdown text={m.text} />
                      {m.fallbackNotice && (
                        <p className="text-[11px] text-slate-400 mt-2">
                          Mode cadangan lokal (server AI sedang sibuk / API key belum aktif)
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="flex items-center gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-coral-gradient text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    J
                  </div>
                  <p className="text-sm text-slate-400 animate-pulse">
                    Jago sedang memeriksa data sistem...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Simple Clean Input Bar (Only text field + send button) */}
      <footer className="px-4 sm:px-6 pb-5 pt-2 bg-white shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-[#F7F8FA] border border-[#E6E8EE] focus-within:bg-white focus-within:border-obsidian rounded-full pl-5 pr-2 py-2 transition">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Tanya Jago tentang StudentInsight..."
              className="flex-1 bg-transparent text-sm text-obsidian placeholder-slate-400 focus:outline-none py-1 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Kirim pesan"
              className="w-10 h-10 rounded-full bg-obsidian hover:bg-coral-500 disabled:opacity-40 text-white flex items-center justify-center transition shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Jago hanya menjawab seputar sistem StudentInsight • Klik menu di Sidebar atau tekan Esc untuk menutup
          </p>
        </form>
      </footer>
    </section>
  );
};
