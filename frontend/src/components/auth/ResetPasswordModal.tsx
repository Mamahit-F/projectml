import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const strengthScore = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword) || newPassword.length >= 12) score++;
    return score;
  })();

  const strengthMeta =
    strengthScore <= 1
      ? { label: 'Lemah', bar: 'bg-red-500', text: 'text-red-600' }
      : strengthScore <= 2
      ? { label: 'Cukup', bar: 'bg-amber-500', text: 'text-amber-600' }
      : strengthScore === 3
      ? { label: 'Baik', bar: 'bg-sky-500', text: 'text-sky-600' }
      : { label: 'Kuat', bar: 'bg-emerald-500', text: 'text-emerald-600' };

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError('Masukkan password saat ini terlebih dahulu.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password baru harus terdiri dari minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Password baru harus berbeda dari password saat ini.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal memperbarui password. Periksa kembali password saat ini.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-obsidian/45 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#ECEEF2] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F1F4]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-coral-gradient text-white flex items-center justify-center shadow-coral shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-obsidian leading-tight">
                Reset Password Akun
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {user?.username || 'user'} • {user?.email || 'user@unklab.ac.id'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-[#F4F5F7] hover:bg-[#E5E7EB] text-slate-600 flex items-center justify-center transition shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-obsidian">
                  Password Berhasil Diperbarui
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Password akun Anda telah tersimpan dengan aman. Gunakan password baru pada sesi login berikutnya.
                </p>
              </div>
              <Button variant="primary" size="md" className="w-full" onClick={onClose}>
                Selesai
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    autoComplete="current-password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-obsidian transition"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password Baru
                  </label>
                  {newPassword && (
                    <span className={`text-[11px] font-bold ${strengthMeta.text}`}>
                      Kekuatan: {strengthMeta.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter (huruf, angka, simbol)"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-obsidian transition"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1 rounded-full transition-colors ${
                          strengthScore >= lvl ? strengthMeta.bar : 'bg-[#ECEEF2]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    required
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F7F8FA] border rounded-2xl text-obsidian placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition ${
                      confirmPassword.length > 0 && !passwordsMatch
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#E6E8EE] focus:border-obsidian focus:ring-obsidian/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-obsidian transition"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-[11px] mt-1 font-medium ${
                      passwordsMatch ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {passwordsMatch ? 'Password cocok.' : 'Konfirmasi password belum sama.'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="coral"
                  size="md"
                  className="flex-1"
                  loading={submitting}
                  icon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  Simpan Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
