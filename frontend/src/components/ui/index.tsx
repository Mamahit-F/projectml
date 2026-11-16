import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

// ── Toast Component ───────────────────────────────────────────
const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const colors = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error:   'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info:    'bg-blue-50 border-blue-400 text-blue-800',
};
const iconColors = { success: 'text-green-500', error: 'text-red-500', warning: 'text-yellow-500', info: 'text-blue-500' };

export const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const Icon = icons[toast.type];
  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg shadow-lg ${colors[toast.type]} min-w-[300px] max-w-[400px]`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <div className="flex-1">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.message && <p className="text-xs mt-1 opacity-80">{toast.message}</p>}
      </div>
      <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
  </div>
);

// ── Button ────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const btnStyles: Record<BtnVariant, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'hover:bg-gray-100 text-gray-600',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}) => {
  const sizeClass = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }[size];
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btnStyles[variant]} ${sizeClass} ${className}`}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
};

// ── Spinner ───────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return <div className={`${s} border-2 border-current border-t-transparent rounded-full animate-spin`} />;
};

// ── Badge ─────────────────────────────────────────────────────
type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' | 'orange';
const badgeColors: Record<BadgeColor, string> = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray:   'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
};
export const Badge: React.FC<{ color?: BadgeColor; children: React.ReactNode; className?: string }> = ({
  color = 'gray', children, className = ''
}) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[color]} ${className}`}>
    {children}
  </span>
);

// ── Modal ─────────────────────────────────────────────────────
export const Modal: React.FC<{
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${widths[size]} m-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────
export const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  color?: string; subtitle?: string; trend?: { value: number; label: string };
}> = ({ title, value, icon, color = 'indigo', subtitle, trend }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-${color}-100 text-${color}-600`}>{icon}</div>
    </div>
  </div>
);

// ── Empty State ───────────────────────────────────────────────
export const EmptyState: React.FC<{ message?: string; icon?: React.ReactNode }> = ({
  message = 'Tidak ada data', icon
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    {icon || <Info className="w-12 h-12 mb-3 opacity-40" />}
    <p className="text-sm">{message}</p>
  </div>
);

// ── Loading State ─────────────────────────────────────────────
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <Spinner size="lg" />
  </div>
);

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; helper?: string;
}
export const Input: React.FC<InputProps> = ({ label, error, helper, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      {...props}
      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
    {helper && !error && <p className="text-xs text-gray-400">{helper}</p>}
  </div>
);

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string | number; label: string }[];
}
export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      {...props}
      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
        error ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ── Textarea ──────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      {...props}
      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? 'border-red-400' : 'border-gray-300'
      } ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ── Confirm Dialog ────────────────────────────────────────────
export const ConfirmDialog: React.FC<{
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean;
}> = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Ya, Lanjutkan', danger }) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm">
    <p className="text-sm text-gray-600 mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={onCancel}>Batal</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
);
