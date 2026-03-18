import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import RouteAnimation from "./RouteAnimation";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card sticky top-0 z-40 pt-safe">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground text-xl"
          >
            ⚔️
          </button>
          <span className="text-base font-bold tracking-tight">VEXNY</span>
        </header>

        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          <AnimatePresence mode="wait">
            <RouteAnimation key={location.pathname}>
              <Outlet />
            </RouteAnimation>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNavigation />
    </div>
  );
}