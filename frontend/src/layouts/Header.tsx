import React from 'react';
import { Bell, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 border border-red-200">ADMIN</span>;
      case 'VILLAGE_DEAN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-700 border border-purple-200">VILLAGE DEAN</span>;
      case 'STAFF':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700 border border-blue-200">PETUGAS</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      {/* Title / Context info */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 leading-tight">{title || 'StudentInsight System'}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick status pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Aktif & Terlindungi</span>
        </div>

        {/* User preview */}
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800 leading-tight">{user?.fullName}</p>
            <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};
