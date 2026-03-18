import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSIONS = [
  { name: "Tokio", zone: "Asia/Tokyo", emoji: "🇯🇵", open: 8, close: 15, color: "from-purple-500 to-pink-500", openBg: "bg-purple-500/10", border: "border-purple-500/30" },
  { name: "Londres", zone: "Europe/London", emoji: "🇬🇧", open: 8, close: 17, color: "from-blue-500 to-cyan-500", openBg: "bg-blue-500/10", border: "border-blue-500/30" },
  { name: "NY", zone: "America/New_York", emoji: "🇺🇸", open: 9, close: 17, color: "from-emerald-500 to-green-500", openBg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { name: "Chicago", zone: "America/Chicago", emoji: "⏰", open: 8, close: 16, color: "from-amber-500 to-orange-500", openBg: "bg-amber-500/10", border: "border-amber-500/30" },
];

export default function TradingHours() {
  const [times, setTimes] = useState({});

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const newTimes = {};
      SESSIONS.forEach(s => {
        const time = new Intl.DateTimeFormat("es-CO", {
          timeZone: s.zone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);
        newTimes[s.zone] = time;
      });
      setTimes(newTimes);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Relojes principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SESSIONS.map((session) => {
          const time = times[session.zone] || "—:—";
          const [h, m] = time.split(":").map(Number);
          const isOpen = h >= session.open && h < session.close;
          const progress = ((h - session.open) / (session.close - session.open)) * 100;
          const displayProgress = Math.max(0, Math.min(100, progress));
          
          return (
            <div key={session.zone} className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 group",
              isOpen ? `${session.openBg} ${session.border} shadow-lg` : "bg-muted/40 border-border shadow-sm"
            )}>
              {/* Gradient background */}
              <div className={cn(
                "absolute inset-0 opacity-10 transition-all duration-300",
                `bg-gradient-to-br ${session.color}`
              )} />
              
              {/* Progress bar */}
              <div className={cn(
                "absolute bottom-0 left-0 h-1 transition-all duration-500",
                `bg-gradient-to-r ${session.color}`
              )} style={{ width: isOpen ? `${displayProgress}%` : "0%" }} />

              <div className="relative z-10">
                {/* Emoji + Nombre */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">{session.emoji}</span>
                  <div>
                    <p className="font-bold text-sm">{session.name}</p>
                    <p className={cn("text-[10px] font-semibold", isOpen ? "text-emerald-600 animate-pulse" : "text-muted-foreground")}>
                      {isOpen ? "🟢 ABIERTO" : "🔴 CERRADO"}
                    </p>
                  </div>
                </div>

                {/* Hora grande */}
                <div className="text-center mb-2">
                  <p className="text-3xl font-black font-mono tracking-tighter">{time}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{session.open}:00 - {session.close}:00</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card de info */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1">💡 Tip: Overlap de Londres-NY es el más volátil</p>
            <p className="text-[10px] text-muted-foreground">Horarios en tu zona (Bogotá) · Verifica tu broker para horarios exactos</p>
          </div>
        </div>
      </div>
    </div>
  );
}