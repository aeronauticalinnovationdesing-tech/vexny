import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FolderKanban, CheckSquare, 
  Wallet, Calendar, StickyNote, Bot, FileText,
  ChevronLeft, ChevronRight, Sword
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/Dashboard" },
  { icon: FolderKanban, label: "Proyectos", path: "/Projects" },
  { icon: CheckSquare, label: "Tareas", path: "/Tasks" },
  { icon: StickyNote, label: "Notas", path: "/Notes" },
  { icon: Wallet, label: "Contabilidad", path: "/Accounting" },
  { icon: Calendar, label: "Calendario", path: "/Calendar" },
  { icon: Bot, label: "Secretaria", path: "/Secretary" },
  { icon: FileText, label: "Informes", path: "/Reports" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={cn(
      "h-screen sticky top-0 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border z-50",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Sword className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-white">VEXNY</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}