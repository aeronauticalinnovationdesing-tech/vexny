import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Bell, RefreshCw, Calendar, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMPACT_CONFIG = {
  High: { label: "ALTO", color: "bg-red-500", text: "text-red-600", border: "border-red-500/30", bg: "bg-red-500/5" },
  Medium: { label: "MEDIO", color: "bg-amber-500", text: "text-amber-600", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  Low: { label: "BAJO", color: "bg-blue-500", text: "text-blue-600", border: "border-blue-500/30", bg: "bg-blue-500/5" },
};

const FLAG_EMOJI = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺",
  CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳",
};

function NewsRow({ item }) {
  const cfg = IMPACT_CONFIG[item.impact] || IMPACT_CONFIG.Low;
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm", cfg.border, cfg.bg)}>
      <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[50px]">
        <span className="text-lg">{FLAG_EMOJI[item.currency] || "🌐"}</span>
        <span className="text-[10px] font-bold text-muted-foreground">{item.currency}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{item.title}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {item.time}
          </span>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white", cfg.color)}>
            {cfg.label}
          </span>
          {item.forecast && <span className="text-xs text-muted-foreground">Pron: <span className="font-medium text-foreground">{item.forecast}</span></span>}
          {item.previous && <span className="text-xs text-muted-foreground">Ant: <span className="font-medium">{item.previous}</span></span>}
          {item.actual && <span className={cn("text-xs font-bold", parseFloat(item.actual) >= parseFloat(item.forecast || 0) ? "text-emerald-600" : "text-red-600")}>Real: {item.actual}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ForexFactoryWidget({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("alerts");

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("forexFactoryNews", {});
      setData(res.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchNews(); }, []);

  const alerts = data?.alerts || [];
  const news = data?.news || [];
  const highImpact = news.filter(n => n.impact === "High");
  const mediumImpact = news.filter(n => n.impact === "Medium");

  if (compact) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-sm">Noticias Alto Impacto</span>
            {alerts.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{alerts.length}</span>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchNews} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.slice(0, 3).map((item, i) => <NewsRow key={i} item={item} />)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">Sin alertas de alto impacto próximas</p>
        )}
        {data?.mock && <p className="text-[10px] text-muted-foreground mt-2 text-center">⚠️ Datos de ejemplo (FF no disponible)</p>}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Calendario Económico</h3>
            <p className="text-xs text-muted-foreground">ForexFactory · Esta semana</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-8" onClick={fetchNews} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-red-600">{alerts.length} evento(s) de alto impacto próximas 24h</p>
            <p className="text-xs text-muted-foreground">Ten precaución al operar cerca de estas noticias</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-xl">
        {[
          { key: "alerts", label: `Alertas (${alerts.length})` },
          { key: "high", label: `Alto Impacto (${highImpact.length})` },
          { key: "medium", label: `Medio (${mediumImpact.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 text-xs py-1.5 rounded-lg font-medium transition-all",
              tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {(tab === "alerts" ? alerts : tab === "high" ? highImpact : mediumImpact).map((item, i) => (
            <NewsRow key={i} item={item} />
          ))}
          {(tab === "alerts" ? alerts : tab === "high" ? highImpact : mediumImpact).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Sin noticias en esta categoría</p>
          )}
        </div>
      )}
      {data?.mock && <p className="text-[10px] text-muted-foreground mt-2 text-center">⚠️ Datos de ejemplo (FF no disponible temporalmente)</p>}
    </div>
  );
}