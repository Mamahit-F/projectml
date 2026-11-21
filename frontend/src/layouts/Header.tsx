import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 lg:hidden bg-[#F4F5F7]/90 backdrop-blur-md px-4 py-3 border-b border-[#ECEEF2]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-coral-gradient text-white flex items-center justify-center shadow-coral">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-sm font-extrabold text-obsidian">StudentInsight</span>
        </div>
        <button
          type="button"
          aria-label="Buka menu navigasi"
          onClick={onMenuClick}
          className="w-9 h-9 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center text-obsidian shadow-card"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
