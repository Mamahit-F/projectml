import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X, Search, Check } from 'lucide-react';
import { studentService } from '../../services/studentService';
import type { Student } from '../../types';

// --- Button (Obsidian & Coral Finexy/Jobgio Style) ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'coral' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-obsidian text-white hover:bg-obsidian-hover shadow-sm',
    coral: 'bg-coral-gradient text-white hover:opacity-95 shadow-coral',
    secondary: 'bg-white text-obsidian border border-[#E5E7EB] hover:bg-[#F7F8FA]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-[#F2F4F7] hover:text-obsidian',
  };
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-xs font-semibold gap-2',
    lg: 'px-5 py-3 text-sm font-semibold gap-2',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-full transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// --- Risk Badge (Finexy dot-indicator pill style) ---
export const RiskBadge: React.FC<{ risk?: string; size?: 'sm' | 'md' }> = ({ risk = 'SAFE', size = 'sm' }) => {
  const key = (risk || 'SAFE').toUpperCase();
  const styles: Record<string, { bg: string; dot: string; label: string }> = {
    SAFE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70', dot: 'bg-emerald-500', label: 'Aman (0 Poin)' },
    LOW: { bg: 'bg-sky-50 text-sky-700 border-sky-200/70', dot: 'bg-sky-500', label: 'Risiko Rendah' },
    MEDIUM: { bg: 'bg-amber-50 text-amber-700 border-amber-200/70', dot: 'bg-amber-500', label: 'Risiko Sedang' },
    HIGH: { bg: 'bg-coral-50 text-coral-700 border-coral-200/80', dot: 'bg-coral-500', label: 'Risiko Tinggi' },
  };
  const cfg = styles[key] || styles.SAFE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${cfg.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// --- Generic Pill Badge ---
export const Badge: React.FC<{
  children: React.ReactNode;
  color?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'coral' | 'dark';
  dot?: boolean;
}> = ({ children, color = 'slate', dot = false }) => {
  const map = {
    slate: { cls: 'bg-[#F2F4F7] text-slate-700', dot: 'bg-slate-400' },
    green: { cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    amber: { cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    red: { cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    blue: { cls: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
    coral: { cls: 'bg-coral-50 text-coral-600', dot: 'bg-coral-500' },
    dark: { cls: 'bg-obsidian text-white', dot: 'bg-coral-400' },
  };
  const c = map[color];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.cls}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div>
    {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
    <input
      className={`w-full px-3.5 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition ${className}`}
      {...props}
    />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div>
    {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
    <select
      className={`w-full px-3.5 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// --- Textarea ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => (
  <div>
    {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
    <textarea
      className={`w-full px-3.5 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition ${className}`}
      {...props}
    />
  </div>
);

// --- Modal ---
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, size = 'md', children }) => {
  if (!open) return null;
  const maxW = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/40 backdrop-blur-xs">
      <div className={`bg-white w-full ${maxW} rounded-3xl shadow-2xl border border-[#ECEEF2] overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F1F4]">
          <div>
            <h3 className="text-base font-bold text-obsidian">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F5F7] hover:bg-[#E5E7EB] text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- Loading & Empty States ---
export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Memuat data...' }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2.5">
    <Loader2 className="w-6 h-6 animate-spin text-coral-500" />
    <span className="text-xs font-medium">{message}</span>
  </div>
);

export const EmptyState: React.FC<{ message: string; action?: React.ReactNode }> = ({ message, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
    <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-400">
      <Search className="w-5 h-5" />
    </div>
    <p className="text-xs font-medium text-slate-500 max-w-sm">{message}</p>
    {action}
  </div>
);

// --- Live Searchable Student Picker (handles 621+ / 1000+ students effortlessly) ---
interface StudentSearchSelectProps {
  label?: string;
  value: number | null;
  onChange: (studentId: number, student: Student) => void;
  placeholder?: string;
}

export const StudentSearchSelect: React.FC<StudentSearchSelectProps> = ({
  label = 'Cari & Pilih Mahasiswa',
  value,
  onChange,
  placeholder = 'Ketik Nama atau Nomor Registrasi (NIM)...',
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await studentService.getAll({
          search: query || undefined,
          size: 15,
          sortBy: 'latestSabbathPoints',
          direction: 'desc',
        });
        setOptions(res.content || []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (value && (!selected || selected.id !== value)) {
      studentService.getById(value).then(setSelected).catch(() => {});
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={open ? query : selected ? `${selected.fullName} (${selected.nim})` : query}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full bg-white rounded-2xl border border-[#E6E8EE] shadow-xl max-h-60 overflow-y-auto p-1.5">
          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400">Mencari mahasiswa...</div>
          ) : options.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">Mahasiswa tidak ditemukan.</div>
          ) : (
            options.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s);
                  onChange(s.id, s);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition ${
                  value === s.id ? 'bg-obsidian text-white' : 'hover:bg-[#F4F5F7] text-obsidian'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.fullName}</p>
                  <p className={`text-[10px] ${value === s.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.nim} • {s.studyProgram} • {s.latestSabbathPoints} Poin
                  </p>
                </div>
                {value === s.id && <Check className="w-3.5 h-3.5 shrink-0 text-coral-400" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
