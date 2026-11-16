import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, QrCode, ClipboardCheck,
  AlertTriangle, BrainCircuit, HeartHandshake, FileText,
  UserCog, Settings, ShieldAlert, LogOut, GraduationCap, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { to: '/students', label: 'Mahasiswa', icon: <Users className="w-5 h-5" /> },
  { to: '/events', label: 'Kegiatan Ibadah', icon: <Calendar className="w-5 h-5" /> },
  { to: '/attendance/scan', label: 'Pindai QR', icon: <QrCode className="w-5 h-5" /> },
  { to: '/attendance', label: 'Presensi', icon: <ClipboardCheck className="w-5 h-5" /> },
  { to: '/violations', label: 'Poin Pelanggaran', icon: <AlertTriangle className="w-5 h-5" /> },
  { to: '/predictions', label: 'Prediksi Risiko ML', icon: <BrainCircuit className="w-5 h-5" />, roles: ['ADMIN', 'VILLAGE_DEAN'] },
  { to: '/welfare', label: 'Kesejahteraan', icon: <HeartHandshake className="w-5 h-5" /> },
  { to: '/follow-up', label: 'Evaluasi & Binaan', icon: <GraduationCap className="w-5 h-5" />, roles: ['ADMIN', 'VILLAGE_DEAN'] },
  { to: '/emergency-contacts', label: 'Kontak Darurat', icon: <ShieldAlert className="w-5 h-5" />, roles: ['ADMIN', 'VILLAGE_DEAN'] },
  { to: '/reports', label: 'Laporan & Ekspor', icon: <FileText className="w-5 h-5" /> },
  { to: '/residence-categories', label: 'Kategori Tempat Tinggal', icon: <MapPin className="w-5 h-5" />, roles: ['ADMIN'] },
  { to: '/attendance-rules', label: 'Aturan Presensi', icon: <Settings className="w-5 h-5" />, roles: ['ADMIN'] },
  { to: '/users', label: 'Kelola Pengguna', icon: <UserCog className="w-5 h-5" />, roles: ['ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-30 select-none shadow-xl">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
          SI
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">StudentInsight</h1>
          <p className="text-[10px] text-indigo-400 font-medium">Universitas Klabat</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-200 flex items-center justify-center text-xs font-semibold uppercase">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </aside>
  );
};
