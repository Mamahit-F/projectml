import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
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
      setError(err.response?.data?.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-700/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">StudentInsight</h1>
          <p className="text-xs text-slate-500 mt-1">Smart Student Monitoring & Disciplinary Prediction System</p>
          <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">Universitas Klabat</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username atau Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full justify-center bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl shadow-md font-medium text-sm mt-2"
          >
            Masuk ke Sistem
          </Button>
        </form>

        {/* Quick Demo Pickers */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 text-center">
            Pilihan Cepat Akun Demo
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('admin', 'password')}
              className="p-2 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-center transition"
            >
              <p className="text-xs font-bold text-slate-800">Admin</p>
              <p className="text-[10px] text-slate-400">admin</p>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('staff', 'password')}
              className="p-2 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-center transition"
            >
              <p className="text-xs font-bold text-slate-800">Petugas</p>
              <p className="text-[10px] text-slate-400">staff</p>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('dean', 'password')}
              className="p-2 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-lg text-center transition"
            >
              <p className="text-xs font-bold text-slate-800">Village Dean</p>
              <p className="text-[10px] text-slate-400">dean</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
