import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, FileText, BrainCircuit, HeartHandshake } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal masuk. Periksa kembali username dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-soft border border-[#ECEEF2] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Visual Story Panel (Finexy Obsidian + Coral Accent) */}
        <div className="lg:col-span-5 bg-obsidian text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-coral-gradient opacity-25 blur-2xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-coral-gradient flex items-center justify-center shadow-coral mb-6">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">StudentInsight</h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Sistem Pemantauan Keamanan, Kedisiplinan, dan Kesejahteraan Mahasiswa di Luar Asrama Universitas Klabat.
            </p>
          </div>

          <div className="relative z-10 space-y-3 mt-10">
            {[
              { icon: FileText, title: 'Impor Otomatis Laporan PDF', desc: 'Baca ratusan data poin Sabat dari laporan resmi dalam hitungan detik.' },
              { icon: BrainCircuit, title: 'Deteksi Risiko Dinamis', desc: 'Pengelompokan risiko alami & proyeksi poin menjelang tutup absen semester.' },
              { icon: HeartHandshake, title: 'Pembinaan & Kesejahteraan', desc: 'Terhubung dengan catatan konseling, bantuan kesejahteraan, dan kontak wali.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-coral-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-50 text-coral-600 text-[11px] font-bold">
              Akses Tunggal • Peran User
            </span>
            <h2 className="text-2xl font-extrabold text-obsidian mt-3 tracking-tight">Masuk ke Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              Kelola unggahan laporan PDF, visualisasi poin, prediksi risiko, dan pembinaan mahasiswa.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username atau Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-obsidian/15 focus:border-obsidian transition"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-7 pt-5 border-t border-[#F0F1F4] flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Mode Pengembangan Lokal</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan akun lokal yang terkonfigurasi di server pengembangan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsername('user');
                  setPassword('password');
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#F4F5F7] hover:bg-obsidian hover:text-white text-xs font-semibold text-obsidian transition"
              >
                Isi Dev
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
