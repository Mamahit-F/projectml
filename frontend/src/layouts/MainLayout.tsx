import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GuideProvider } from '../contexts/GuideContext';
import {
  GuideFloatingButton,
  GuideOverlay,
  GuideWelcomeBanner,
} from '../components/guide/GuideOverlay';
import {
  JagoFloatingButton,
  JagoWorkspace,
} from '../components/assistant/JagoAssistant';

export const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [jagoOpen, setJagoOpen] = useState(false);
  const location = useLocation();

  const closeJago = useCallback(() => setJagoOpen(false), []);

  // Automatically close Jago whenever the user navigates to another route
  useEffect(() => {
    setJagoOpen(false);
  }, [location.pathname]);

  return (
    <GuideProvider>
      <div className="min-h-screen bg-[#F4F5F7] flex">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onMenuSelect={closeJago}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 sm:px-8 py-6 lg:py-8">
            <div className="max-w-[1440px] mx-auto">
              <GuideWelcomeBanner />
              <Outlet />
            </div>
          </main>
        </div>

        <JagoFloatingButton isOpen={jagoOpen} onOpen={() => setJagoOpen(true)} />
        {jagoOpen && (
          <JagoWorkspace
            onClose={closeJago}
            onOpenMobileSidebar={() => setMobileOpen(true)}
          />
        )}
        {!jagoOpen && <GuideFloatingButton />}
        <GuideOverlay />
      </div>
    </GuideProvider>
  );
};
