import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileSidebar } from './MobileSidebar';
import { Topbar } from './Topbar';
import { CommandMenu } from './CommandMenu';

export const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Mobile sidebar sheet */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Main content area — fills entire remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMobileMenuToggle={() => setMobileOpen(true)} />

        {/* Scrollable content — full width, no max-width constraint */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div
            key={location.pathname}
            className="px-4 py-5 sm:px-6 sm:py-6 animate-page-enter w-full"
          >
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandMenu />
    </div>
  );
};
