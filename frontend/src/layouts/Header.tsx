import React from 'react';
import { Compass, Menu, ShieldCheck, X } from 'lucide-react';
import { useGuide } from '../contexts/GuideContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { isGuideActive, openGuideForCurrentPage, cancelGuide } = useGuide();

  return (
    <header className="sticky top-0 z-30 lg:hidden bg-[#F4F5F7]/90 backdrop-blur-md px-4 py-3 border-b border-[#ECEEF2]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-coral-gradient text-white flex items-center justify-center shadow-coral">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-sm font-extrabold text-obsidian">StudentInsight</span>
        </div>
        <div className="flex items-center gap-2">
          {isGuideActive ? (
            <button
              type="button"
              onClick={cancelGuide}
              className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Batal
            </button>
          ) : (
            <button
              type="button"
              onClick={openGuideForCurrentPage}
              className="px-3 py-1.5 rounded-full bg-white border border-[#ECEEF2] text-obsidian text-xs font-bold inline-flex items-center gap-1.5 shadow-card"
            >
              <Compass className="w-3.5 h-3.5 text-coral-500" />
              Panduan
            </button>
          )}
          <button
            type="button"
            aria-label="Buka menu navigasi"
            onClick={onMenuClick}
            className="w-9 h-9 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center text-obsidian shadow-card"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
