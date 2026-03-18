import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, X, RefreshCw, Shield, User, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/lib/ProfileContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const profileContext = useProfile();
  const { activeProfile = null, selectProfile = () => {} } = profileContext || {};

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me()
  });

  // Verificar si la prueba ha expirado y si tiene suscripción activa
  const { data: userSubs = [] } = useQuery({
    queryKey: ["subscription", activeProfile?.id, user?.email],
    queryFn: () => {
      if (!user?.email || !activeProfile?.id) return [];
      return base44.entities.Subscription.filter({ profile: activeProfile.id, created_by: user.email });
    },
    enabled: !!activeProfile?.id && !!user?.email
  });

  const { data: globalSubs = [] } = useQuery({
    queryKey: ["subscription-global", activeProfile?.id],
    queryFn: () => activeProfile?.id ? base44.entities.Subscription.filter({ profile: activeProfile.id }) : Promise.resolve([]),
    enabled: !!activeProfile?.id
  });

  const userSub = userSubs[0] || null;
  const globalSub = globalSubs[0] || null;
  const sub = userSub || globalSub || null;

  const trialHours = sub?.trial_hours ?? 48;
  const trialKey = `trial_start_${activeProfile?.id}`;
  const trialStartDate = user?.[trialKey];

  const isTrialExpired = trialStartDate && sub && !sub.is_active && (() => {
    const trialEnd = new Date(trialStartDate).getTime() + trialHours * 60 * 60 * 1000;
    return Date.now() > trialEnd;
  })();

  const isPaidSubscribed = userSub?.is_active === true;
  const isRestricted = isTrialExpired && user?.role !== "admin";

  useEffect(() => {
    if (onMobileClose) onMobileClose();
  }, [location.pathname]);

  const initials = user?.full_name ?
  user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() :
  "?";

  const navItems = activeProfile?.nav || [];
  const ProfileIcon = activeProfile?.icon;

  const SidebarContent =
  <aside className={cn(
    "h-full bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border",
    collapsed ? "w-[72px]" : "w-[240px]"
  )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 text-lg rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0">
            🤺
          </div>
          {!collapsed &&
        <div className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-tight text-white">VEXNY</span>
              {isPaidSubscribed &&
          <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <span className="text-xl">🗡️</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      ¡Premium activo!
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
          }
            </div>
        }
        </div>
        {onMobileClose &&
      <button onClick={onMobileClose} className="text-sidebar-foreground/50 hover:text-sidebar-foreground lg:hidden">
            <X className="w-5 h-5" />
          </button>
      }
      </div>

      {/* Active Profile Badge */}
      {activeProfile && !collapsed &&
    <div className="px-3 pt-3">
          <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${activeProfile.color} bg-opacity-20`}
        style={{ background: `${activeProfile.accent}18` }}>
        
            {ProfileIcon && <ProfileIcon className="w-4 h-4 flex-shrink-0" style={{ color: activeProfile.accent }} />}
            <span className="text-xs font-semibold truncate" style={{ color: activeProfile.accent }}>
              {activeProfile.label}
            </span>
          </div>
        </div>
    }

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
        const isActive = location.pathname === item.path;
        const isSubscriptionPage = item.path === "/Subscription";
        const isBlocked = isRestricted && !isSubscriptionPage;

        if (isBlocked) {
          return (
            <TooltipProvider key={`${item.path}-${idx}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-50",
                      "text-sidebar-foreground/50 bg-sidebar-accent/30"
                    )}>
                    
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && <Lock className="w-3 h-3 ml-auto flex-shrink-0" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Activa tu suscripción para acceder
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>);

        }

        return (
          <Link
            key={`${item.path}-${idx}`}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive ?
              "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}>
            
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>);

      })}
      </nav>

      {/* Change Profile */}
      <div className="px-3 pb-2 space-y-1">
        {user?.role === "admin" &&
      <Link
        to="/Admin"
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors",
          location.pathname === "/Admin" ?
          "bg-primary text-primary-foreground" :
          "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent"
        )}
        title="Panel de administración">
        
            <Shield className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Administración</span>}
          </Link>
      }
        <button
        onClick={() => selectProfile(null)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
          collapsed && "justify-center"
        )}
        title="Cambiar perfil">
        
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Cambiar perfil</span>}
        </button>
      </div>

      {/* Profile Section */}
      <div className="border-t border-sidebar-border p-3 flex-shrink-0">
        {!collapsed ?
      <div className="space-y-1">
            <Link
          to="/Profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors",
            location.pathname === "/Profile" ?
            "bg-primary text-primary-foreground" :
            "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent"
          )}
          title="Mi perfil">
          
              <User className="w-4 h-4 flex-shrink-0" />
              <span>Mi Perfil</span>
            </Link>
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.full_name || "Usuario"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email || ""}</p>
              </div>
            </div>
          </div> :

      <div className="flex flex-col items-center gap-2">
            <Link
          to="/Profile"
          className={cn(
            "text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors",
            location.pathname === "/Profile" && "text-primary"
          )}
          title="Mi perfil">
          
              <User className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
      }
      </div>

      {/* Collapse toggle */}
      <button
      onClick={() => setCollapsed(!collapsed)}
      className="hidden lg:flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors flex-shrink-0">
      
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>;


  return (
    <>
      <div className="hidden lg:block h-screen sticky top-0 z-50">
        {SidebarContent}
      </div>
      {mobileOpen &&
      <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={onMobileClose} />
          <div className="relative h-full z-10">
            {SidebarContent}
          </div>
        </div>
      }
    </>);

}