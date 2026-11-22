import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  FileUp,
  Users,
  BrainCircuit,
  Cpu,
  MessageSquareHeart,
  HeartHandshake,
  PhoneCall,
  SlidersHorizontal,
  LogOut,
  X,
  ShieldCheck,
  Compass,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGuide } from '../contexts/GuideContext';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/pdf-reports', label: 'Unggah & Arsip PDF', icon: FileUp },
  { to: '/students', label: 'Mahasiswa', icon: Users },
  { to: '/predictions', label: 'Deteksi Risiko', icon: BrainCircuit },
  { to: '/ml-analytics', label: 'Pusat ML Historis', icon: Cpu },
  { to: '/follow-up', label: 'Pembinaan', icon: MessageSquareHeart },
  { to: '/welfare', label: 'Kesejahteraan', icon: HeartHandshake },
  { to: '/emergency-contacts', label: 'Kontak Darurat', icon: PhoneCall },
  { to: '/reports-settings', label: 'Laporan & Semester', icon: SlidersHorizontal },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isGuideActive, viewMode, currentStep, openGuide, openGuideForCurrentPage, cancelGuide } = useGuide();
  const location = useLocation();

  const initials = (user?.fullName || user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <aside className="w-[260px] h-full bg-white border-r border-[#ECEEF2] flex flex-col justify-between px-4 py-6 select-none">
      <div>
        {/* Brand Header (Finexy coral mark + Jobgio clean typography) */}
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coral-gradient text-white flex items-center justify-center shadow-coral">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[17px] font-extrabold tracking-tight text-obsidian block leading-none">
                StudentInsight
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                Monitoring UNKLAB
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links (Jobgio signature solid obsidian pill + white circular active icon) */}
        <nav data-guide="sidebar-nav" className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));
            const isGuidedTarget =
              isGuideActive && viewMode === 'tour' && currentStep.route === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-guide-id={item.to}
                onClick={onClose}
                className={`group flex items-center gap-3 px-2.5 py-2 rounded-full text-[13px] font-semibold transition-all duration-150 ${
                  isGuidedTarget
                    ? 'bg-obsidian text-white ring-2 ring-coral-500 ring-offset-2 shadow-coral'
                    : isActive
                    ? 'bg-obsidian text-white shadow-soft'
                    : 'text-slate-500 hover:bg-[#F4F5F7] hover:text-obsidian'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    isGuidedTarget
                      ? 'bg-coral-gradient text-white'
                      : isActive
                      ? 'bg-white text-obsidian'
                      : 'bg-[#F4F5F7] text-slate-500 group-hover:bg-white group-hover:text-obsidian'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Guide Trigger + User Card */}
      <div className="pt-4 border-t border-[#F0F1F4] space-y-2.5">
        {isGuideActive ? (
          <button
            type="button"
            onClick={() => {
              cancelGuide();
              onClose();
            }}
            className="w-full rounded-2xl px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition flex items-center justify-between text-xs font-bold"
          >
            <span className="inline-flex items-center gap-2">
              <X className="w-4 h-4" />
              Batalkan Mode Panduan
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100">Esc</span>
          </button>
        ) : (
          <div className="rounded-2xl p-3 bg-coral-50/70 border border-coral-200/70 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-coral-gradient text-white flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-obsidian leading-tight">Mode Panduan</p>
                <p className="text-[10px] text-slate-500 truncate">Buka bebas kapan saja</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openGuideForCurrentPage();
                }}
                className="px-2.5 py-1.5 rounded-full bg-obsidian text-white hover:bg-obsidian-hover text-[11px] font-bold transition"
              >
                Tur Aktif
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openGuide('handbook');
                }}
                className="px-2.5 py-1.5 rounded-full bg-white border border-coral-200 text-obsidian hover:bg-coral-50 text-[11px] font-bold inline-flex items-center justify-center gap-1 transition"
              >
                <BookOpen className="w-3 h-3 text-coral-600" />
                Panduan
              </button>
            </div>
          </div>
        )}
        <div className="bg-[#F7F8FA] rounded-3xl p-3.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-obsidian text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute bottom-0 right-0" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-obsidian truncate">{user?.fullName || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">Peran: User</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="w-8 h-8 rounded-full bg-white border border-[#E5E7EB] hover:bg-coral-50 hover:text-coral-600 hover:border-coral-200 text-slate-500 flex items-center justify-center transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-obsidian/40 backdrop-blur-xs" onClick={onClose} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
