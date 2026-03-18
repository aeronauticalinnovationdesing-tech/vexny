import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, BarChart2, Trash2, Pencil, Brain, Camera, Star, CheckCircle2, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProfitLossChart, WinRateAnalysis, PerformanceMetrics } from "@/components/trader/AdvancedMetrics";
import ForexFactoryWidget from "@/components/trader/ForexFactoryWidget";
import StrategyAnalyzer from "@/components/trader/StrategyAnalyzer";
import AccountTypeBadge, { ACCOUNT_CONFIG } from "@/components/trader/AccountTypeBadge";
import ProfessionalCharts from "@/components/trader/ProfessionalCharts";
import FeatureGate from "@/components/subscription/FeatureGate";

const PAIRS_FOREX = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "GBP/JPY", "EUR/JPY"];
const PAIRS_CRIPTO = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT"];
const PAIRS_FUTUROS = ["ES (S&P500)", "NQ (NASDAQ)", "YM (DOW)", "GC (ORO)", "CL (PETRÓLEO)", "ZB (Bonos T)", "^GSPC (S&P 500)"];
const PAIRS_OTROS = ["ORO/USD", "PLATA/USD", "DJI", "DAX", "NIKKEI", "S&P 500"];

const SETUPS = ["Breakout", "Pullback", "Reversión", "Scalping", "Swing", "Tendencia", "S/R", "Fibonacci", "EMA Cross", "RSI Divergence", "Order Block", "FVG", "ICT/SMC", "Otro"];
const SESSIONS = ["Asia", "Londres", "New York", "Overlap", "Otra"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const ACCOUNT_TYPES = ["fondeo", "capital_propio", "futuros", "forex", "cripto"];

const RESULT_CONFIG = {
  win: { label: "WIN", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  loss: { label: "LOSS", icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
  breakeven: { label: "BE", icon: Minus, color: "text-amber-600", bg: "bg-amber-500/10" },
};

const emptyForm = {
  pair: "EUR/USD", direction: "long", account_type: "capital_propio", broker_account: "",
  setup: "Breakout", entry_price: "", exit_price: "", stop_loss: "", take_profit: "",
  lot_size: "", pnl: "", pnl_pct: "", pips: "", result: "win",
  date: format(new Date(), "yyyy-MM-dd"), session: "New York", timeframe: "H1",
  emotion_rating: 3, discipline_rating: 3, notes: "", followed_plan: true, confluences: [],
};

function getRRFromForm(form) {
  const e = parseFloat(form.entry_price);
  const sl = parseFloat(form.stop_loss);
  const tp = parseFloat(form.take_profit);
  if (!e || !sl || !tp) return null;
  const risk = Math.abs(e - sl);
  const reward = Math.abs(tp - e);
  return risk > 0 ? (reward / risk).toFixed(2) : null;
}

function getPairsForAccountType(type) {
  if (type === "forex") return PAIRS_FOREX;
  if (type === "cripto") return PAIRS_CRIPTO;
  if (type === "futuros") return PAIRS_FUTUROS;
  return [...PAIRS_FOREX, ...PAIRS_CRIPTO, ...PAIRS_FUTUROS, ...PAIRS_OTROS];
}

function RatingStars({ value, onChange, label }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star className={cn("w-5 h-5 transition-colors", n <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TradeCard({ trade, onEdit, onDelete }) {
  const cfg = RESULT_CONFIG[trade.result] || RESULT_CONFIG.win;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border group hover:shadow-md transition-all">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
        <Icon className={cn("w-5 h-5", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm">{trade.pair}</span>
          <Badge variant="outline" className={cn("text-[10px]", trade.direction === "long" ? "border-emerald-500/50 text-emerald-700" : "border-red-500/50 text-red-700")}>
            {trade.direction === "long" ? "▲ LONG" : "▼ SHORT"}
          </Badge>
          <AccountTypeBadge type={trade.account_type} />
          {trade.setup && <Badge variant="outline" className="text-[10px]">{trade.setup}</Badge>}
          {trade.timeframe && <Badge variant="outline" className="text-[10px] bg-muted">{trade.timeframe}</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {trade.date && <span>{format(new Date(trade.date), "d MMM yyyy", { locale: es })}</span>}
          {trade.session && <span>· {trade.session}</span>}
          {trade.risk_reward && <span>· RR: {trade.risk_reward}:1</span>}
          {trade.broker_account && <span>· {trade.broker_account}</span>}
          {trade.emotion_rating && <span>· 😌 {trade.emotion_rating}/5</span>}
        </div>
        {trade.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{trade.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("font-bold text-base", cfg.color)}>
          {trade.pnl != null ? `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl}` : cfg.label}
        </p>
        {trade.pnl_pct != null && (
          <p className={cn("text-xs", trade.pnl_pct >= 0 ? "text-emerald-600" : "text-red-600")}>
            {trade.pnl_pct >= 0 ? "+" : ""}{trade.pnl_pct}%
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(trade)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(trade.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function TraderJournal() {
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterResult, setFilterResult] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [activeTab, setActiveTab] = useState("journal");
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { activeProfileId } = useProfile();

  const { data: trades = [] } = useQuery({
    queryKey: ["trades", user?.email],
    queryFn: () => base44.entities.Trade.filter({ created_by: user.email }, "-date"),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Trade.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trades"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trade.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trades"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Trade.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trades"] }),
  });

  const closeForm = () => { setShowForm(false); setEditTrade(null); setForm({ ...emptyForm }); };
  const openEdit = (t) => { setEditTrade(t); setForm({ ...emptyForm, ...t }); setShowForm(true); };

  const handleSave = (e) => {
    e.preventDefault();
    const rr = getRRFromForm(form);
    const data = {
      ...form,
      entry_price: form.entry_price ? parseFloat(form.entry_price) : null,
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
      take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
      lot_size: form.lot_size ? parseFloat(form.lot_size) : null,
      pnl: form.pnl ? parseFloat(form.pnl) : null,
      pnl_pct: form.pnl_pct ? parseFloat(form.pnl_pct) : null,
      pips: form.pips ? parseFloat(form.pips) : null,
      risk_reward: rr ? parseFloat(rr) : null,
      profile_id: activeProfileId,
    };
    if (editTrade) updateMutation.mutate({ id: editTrade.id, data });
    else createMutation.mutate(data);
  };

  const filtered = trades.filter(t => {
    const matchResult = filterResult === "all" || t.result === filterResult;
    const matchAccount = filterAccount === "all" || t.account_type === filterAccount;
    return matchResult && matchAccount;
  });

  const wins = trades.filter(t => t.result === "win");
  const losses = trades.filter(t => t.result === "loss");
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
  const avgRR = trades.filter(t => t.risk_reward).length > 0
    ? (trades.filter(t => t.risk_reward).reduce((s, t) => s + t.risk_reward, 0) / trades.filter(t => t.risk_reward).length).toFixed(2)
    : "—";

  const dominantAccountType = useMemo(() => {
    if (!trades.length) return "capital_propio";
    const counts = {};
    trades.forEach(t => { counts[t.account_type] = (counts[t.account_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "capital_propio";
  }, [trades]);

  const rr = getRRFromForm(form);
  const availablePairs = getPairsForAccountType(form.account_type);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">Trading Journal Pro</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Registrar Trade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">P&L Total</p>
          <p className={cn("text-2xl font-bold", totalPnl >= 0 ? "text-emerald-600" : "text-red-600")}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-blue-600">{winRate}%</p>
          <p className="text-xs text-muted-foreground">{wins.length}W · {losses.length}L</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
          <p className="text-2xl font-bold">{trades.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg RR</p>
          <p className="text-2xl font-bold text-violet-600">{avgRR}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Tipo Cuenta</p>
          <AccountTypeBadge type={dominantAccountType} size="md" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-5 sm:w-auto sm:flex gap-0 sm:gap-1 h-auto sm:h-auto p-0 sm:p-1 bg-muted/50 sm:bg-muted">
          <TabsTrigger value="charts" className="text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-none sm:rounded-md first:rounded-l-md sm:first:rounded-md last:rounded-r-md sm:last:rounded-md">📈 <span className="hidden sm:inline">Charts</span></TabsTrigger>
          <TabsTrigger value="journal" className="text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-none sm:rounded-md">📓 <span className="hidden sm:inline">Bitácora</span></TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-none sm:rounded-md">📊 <span className="hidden sm:inline">Analytics</span></TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-none sm:rounded-md">🧠 <span className="hidden sm:inline">IA</span></TabsTrigger>
          <TabsTrigger value="news" className="text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-none sm:rounded-md first:rounded-l-md sm:first:rounded-md last:rounded-r-md sm:last:rounded-md">📰 <span className="hidden sm:inline">News</span></TabsTrigger>
        </TabsList>

        {/* CHARTS TAB */}
        <TabsContent value="charts" className="mt-4">
          <FeatureGate featureName="TradingView Charts">
            <TradingViewLite />
          </FeatureGate>
        </TabsContent>

        {/* JOURNAL TAB */}
        <TabsContent value="journal" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[{ v: "all", l: "Todos" }, { v: "win", l: "✅ WIN" }, { v: "loss", l: "❌ LOSS" }, { v: "breakeven", l: "➡️ BE" }].map(f => (
              <button key={f.v} onClick={() => setFilterResult(f.v)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterResult === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                {f.l}
              </button>
            ))}
            <div className="ml-auto">
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Tipo cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {ACCOUNT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{ACCOUNT_CONFIG[t]?.emoji} {ACCOUNT_CONFIG[t]?.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map(t => (
              <TradeCard key={t.id} trade={t} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-14">
                <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">Sin trades registrados</p>
                <p className="text-sm text-muted-foreground">Empieza registrando tu primera operación</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ProfitLossChart transactions={trades.map(t => ({ ...t, type: t.result === "win" ? "income" : "expense", amount: Math.abs(t.pnl || 0), date: t.date }))} />
            <WinRateAnalysis trades={trades.map(t => ({ ...t, type: t.result === "win" ? "income" : "expense", amount: Math.abs(t.pnl || 0) }))} />
          </div>
          <PerformanceMetrics transactions={trades.map(t => ({ type: t.result === "win" ? "income" : "expense", amount: Math.abs(t.pnl || 0) }))} />
        </TabsContent>

        {/* STRATEGY AI TAB */}
        <TabsContent value="strategy" className="mt-4">
          <FeatureGate featureName="AI Strategy Analyzer">
            <StrategyAnalyzer trades={trades} accountType={dominantAccountType} />
          </FeatureGate>
        </TabsContent>

        {/* NEWS TAB */}
        <TabsContent value="news" className="mt-4">
          <ForexFactoryWidget />
        </TabsContent>
      </Tabs>

      {/* Trade Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTrade ? "Editar Trade" : "Registrar Nueva Operación"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Tipo de cuenta y broker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Cuenta / Mercado</Label>
                <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v, pair: getPairsForAccountType(v)[0] || form.pair })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{ACCOUNT_CONFIG[t]?.emoji} {ACCOUNT_CONFIG[t]?.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Broker / Cuenta Fondeo</Label>
                <Input value={form.broker_account} onChange={e => setForm({ ...form, broker_account: e.target.value })}
                  placeholder="FTMO, Binance, IC Markets..." />
              </div>
            </div>

            {/* Par, dirección, resultado */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Par / Activo</Label>
                <Select value={form.pair} onValueChange={v => setForm({ ...form, pair: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availablePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dirección</Label>
                <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">▲ LONG</SelectItem>
                    <SelectItem value="short">▼ SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resultado</Label>
                <Select value={form.result} onValueChange={v => setForm({ ...form, result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win">✅ WIN</SelectItem>
                    <SelectItem value="loss">❌ LOSS</SelectItem>
                    <SelectItem value="breakeven">➡️ BREAKEVEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Precios */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Entrada</Label>
                <Input type="number" step="any" placeholder="0.00" value={form.entry_price}
                  onChange={e => setForm({ ...form, entry_price: e.target.value })} />
              </div>
              <div>
                <Label>Salida</Label>
                <Input type="number" step="any" placeholder="0.00" value={form.exit_price}
                  onChange={e => setForm({ ...form, exit_price: e.target.value })} />
              </div>
              <div>
                <Label>Stop Loss</Label>
                <Input type="number" step="any" placeholder="0.00" value={form.stop_loss}
                  onChange={e => setForm({ ...form, stop_loss: e.target.value })} />
              </div>
              <div>
                <Label>Take Profit</Label>
                <Input type="number" step="any" placeholder="0.00" value={form.take_profit}
                  onChange={e => setForm({ ...form, take_profit: e.target.value })} />
              </div>
            </div>
            {rr && <p className="text-xs text-emerald-600 font-medium">⚡ Risk/Reward calculado: {rr}:1</p>}

            {/* P&L, Lote, Pips */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>P&L (USD)</Label>
                <Input type="number" step="any" placeholder="±0.00" value={form.pnl}
                  onChange={e => setForm({ ...form, pnl: e.target.value })} />
              </div>
              <div>
                <Label>P&L (%)</Label>
                <Input type="number" step="any" placeholder="±0.0%" value={form.pnl_pct}
                  onChange={e => setForm({ ...form, pnl_pct: e.target.value })} />
              </div>
              <div>
                <Label>Pips / Puntos</Label>
                <Input type="number" step="any" placeholder="0" value={form.pips}
                  onChange={e => setForm({ ...form, pips: e.target.value })} />
              </div>
            </div>

            {/* Setup, Sesión, TF */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Setup</Label>
                <Select value={form.setup} onValueChange={v => setForm({ ...form, setup: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sesión</Label>
                <Select value={form.session} onValueChange={v => setForm({ ...form, session: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Timeframe</Label>
                <Select value={form.timeframe} onValueChange={v => setForm({ ...form, timeframe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            {/* Ratings emocionales */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-muted/40">
              <RatingStars label="Estado emocional" value={form.emotion_rating} onChange={v => setForm({ ...form, emotion_rating: v })} />
              <RatingStars label="Disciplina" value={form.discipline_rating} onChange={v => setForm({ ...form, discipline_rating: v })} />
            </div>

            {/* Seguí el plan */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="followed_plan" checked={form.followed_plan}
                onChange={e => setForm({ ...form, followed_plan: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="followed_plan" className="cursor-pointer">Seguí mi plan de trading</Label>
            </div>

            {/* Notas */}
            <div>
              <Label>Notas / Análisis</Label>
              <textarea
                className="w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Describe el análisis, emociones, lecciones aprendidas..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editTrade ? "Actualizar" : "Registrar Trade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}