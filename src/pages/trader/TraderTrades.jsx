import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, BarChart2, Trash2, Pencil, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PAIRS = ["BTC/USDT", "ETH/USDT", "EUR/USD", "GBP/USD", "S&P500", "NASDAQ", "ORO", "PETRÓLEO", "OTRO"];
const DIRECTIONS = [{ value: "income", label: "LONG 📈", color: "text-emerald-600" }, { value: "expense", label: "SHORT 📉", color: "text-red-600" }];
const SETUPS = ["Breakout", "Pullback", "Reversión", "Scalping", "Swing", "Tendencia", "Soporte/Resistencia", "Otro"];

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

const emptyForm = {
  description: "", amount: "", type: "income", category: "investment",
  date: format(new Date(), "yyyy-MM-dd"),
  tags: [], // pair stored in tags[0], setup in tags[1]
};

export default function TraderTrades() {
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [pair, setPair] = useState("BTC/USDT");
  const [setup, setSetup] = useState("Breakout");
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: trades = [] } = useQuery({
    queryKey: ["transactions", user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Transaction.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transactions"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditTx(null);
    setForm({ ...emptyForm });
    setPair("BTC/USDT");
    setSetup("Breakout");
  };

  const openEdit = (trade) => {
    setEditTx(trade);
    setForm({
      description: trade.description,
      amount: trade.amount,
      type: trade.type,
      category: trade.category || "investment",
      date: trade.date || format(new Date(), "yyyy-MM-dd"),
      tags: trade.tags || [],
    });
    setPair(trade.tags?.[0] || "BTC/USDT");
    setSetup(trade.tags?.[1] || "Breakout");
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, amount: Number(form.amount), tags: [pair, setup] };
    if (editTx) updateMutation.mutate({ id: editTx.id, data });
    else createMutation.mutate(data);
  };

  const wins = trades.filter(t => t.type === "income");
  const losses = trades.filter(t => t.type === "expense");
  const totalWin = wins.reduce((s, t) => s + (t.amount || 0), 0);
  const totalLoss = losses.reduce((s, t) => s + (t.amount || 0), 0);
  const pnl = totalWin - totalLoss;
  const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;

  const filtered = trades.filter(t => filterType === "all" || t.type === filterType);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold tracking-tight">Bitácora de Trades</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Registrar Trade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">P&L Total</p>
          <p className={cn("text-xl font-bold", pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
            {pnl >= 0 ? "+" : ""}{formatCOP(pnl)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="text-xl font-bold text-blue-600">{winRate}%</p>
          <p className="text-xs text-muted-foreground">{wins.length}W / {losses.length}L</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Ganancias</p>
          <p className="text-xl font-bold text-emerald-600">+{formatCOP(totalWin)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Pérdidas</p>
          <p className="text-xl font-bold text-red-600">-{formatCOP(totalLoss)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ v: "all", l: "Todos" }, { v: "income", l: "LONG ✅" }, { v: "expense", l: "SHORT ❌" }].map(f => (
          <button key={f.v} onClick={() => setFilterType(f.v)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterType === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Trades List */}
      <div className="space-y-2">
        {filtered.map(trade => (
          <div key={trade.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group hover:shadow-md transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              trade.type === "income" ? "bg-emerald-100" : "bg-red-100"
            )}>
              {trade.type === "income"
                ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{trade.description}</p>
                {trade.tags?.[0] && <Badge variant="outline" className="text-xs">{trade.tags[0]}</Badge>}
                {trade.tags?.[1] && <Badge variant="outline" className="text-xs bg-muted">{trade.tags[1]}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {trade.type === "income" ? "LONG" : "SHORT"}
                {trade.date && ` · ${format(new Date(trade.date), "d MMM yyyy", { locale: es })}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={cn("font-bold text-sm", trade.type === "income" ? "text-emerald-600" : "text-red-600")}>
                {trade.type === "income" ? "+" : "-"}{formatCOP(trade.amount)}
              </span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(trade)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(trade.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay trades registrados</p>
          </div>
        )}
      </div>

      {/* Trade Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editTx ? "Editar Trade" : "Registrar Nuevo Trade"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Descripción / Análisis</Label>
              <Input placeholder="Ej: Compra en soporte, stop loss en mínimo..." value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Par / Activo</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dirección</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>P&L (COP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" placeholder="0" className="pl-8" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Setup / Estrategia</Label>
              <Select value={setup} onValueChange={setSetup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editTx ? "Actualizar" : "Registrar Trade"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}