import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GuideProvider } from '../contexts/GuideContext';
import {
  GuideFloatingButton,
  GuideOverlay,
  GuideWelcomeBanner,
} from '../components/guide/GuideOverlay';

export const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <GuideProvider>
      <div className="min-h-screen bg-[#F4F5F7] flex">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 sm:px-8 py-6 lg:py-8">
            <div className="max-w-[1440px] mx-auto">
              <GuideWelcomeBanner />
              <Outlet />
            </div>
          </main>
        </div>
        <GuideFloatingButton />
        <GuideOverlay />
      </div>
    </GuideProvider>
  );
};
