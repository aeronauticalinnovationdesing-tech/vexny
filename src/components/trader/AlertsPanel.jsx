import React, { useState, useMemo } from "react";
import { Bell, AlertCircle, TrendingUp, TrendingDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAIRS = ["BTC/USDT", "ETH/USDT", "EUR/USD", "GBP/USD", "S&P500", "NASDAQ", "ORO", "PETRÓLEO"];

export default function AlertsPanel({ transactions, onAddAlert }) {
  const [showDialog, setShowDialog] = useState(false);
  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trader_alerts") || "[]");
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState({ pair: "BTC/USDT", type: "above", price: "", triggerType: "price" });

  const saveAlerts = (newAlerts) => {
    setAlerts(newAlerts);
    localStorage.setItem("trader_alerts", JSON.stringify(newAlerts));
  };

  const addAlert = () => {
    if (!form.price) return;
    const newAlert = { id: Date.now(), ...form, price: Number(form.price), created: new Date() };
    saveAlerts([...alerts, newAlert]);
    setForm({ pair: "BTC/USDT", type: "above", price: "", triggerType: "price" });
    setShowDialog(false);
  };

  const deleteAlert = (id) => {
    saveAlerts(alerts.filter(a => a.id !== id));
  };

  const recentTrades = useMemo(() => {
    const last10 = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    const winStreak = last10.filter(t => t.type === "income").length;
    const drawdown = last10.filter(t => t.type === "expense").length;
    return { winStreak, drawdown };
  }, [transactions]);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-lg">Alertas Inteligentes</h3>
          </div>
          <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> Nueva Alerta
          </Button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay alertas configuradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.pair}</p>
                  <p className="text-xs text-muted-foreground">{a.type === "above" ? "Cuando suba a" : "Cuando baje a"} ${a.price.toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteAlert(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-3">
          <p className="text-xs text-emerald-600 font-medium">Racha de Ganancias</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{recentTrades.winStreak}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl border border-red-500/20 p-3">
          <p className="text-xs text-red-600 font-medium">Última Caída</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{recentTrades.drawdown}</p>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Alerta de Precio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Par/Activo</label>
              <Select value={form.pair} onValueChange={v => setForm({ ...form, pair: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Condición</label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Cuando suba a</SelectItem>
                  <SelectItem value="below">Cuando baje a</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Precio USD</label>
              <Input type="number" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={addAlert}>Crear Alerta</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}