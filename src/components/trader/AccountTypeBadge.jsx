import React from "react";
import { cn } from "@/lib/utils";

const ACCOUNT_CONFIG = {
  fondeo: { label: "Cuenta Fondeo", emoji: "🏦", color: "bg-violet-500/10 text-violet-700 border-violet-500/30" },
  capital_propio: { label: "Capital Propio", emoji: "💰", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  futuros: { label: "Futuros", emoji: "📈", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  forex: { label: "Forex", emoji: "💱", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  cripto: { label: "Cripto", emoji: "₿", color: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
};

export default function AccountTypeBadge({ type, size = "sm" }) {
  const cfg = ACCOUNT_CONFIG[type] || ACCOUNT_CONFIG.capital_propio;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
      cfg.color
    )}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

export { ACCOUNT_CONFIG };