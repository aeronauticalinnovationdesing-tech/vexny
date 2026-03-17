import React, { useMemo } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Zap, Target } from "lucide-react";

const formatCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

export function ProfitLossChart({ transactions }) {
  const data = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    return sorted.map(t => {
      const pnl = t.type === "income" ? t.amount : -t.amount;
      cumulative += pnl;
      return { date: new Date(t.date).toLocaleDateString("es-CO", { month: "short", day: "numeric" }), pnl: cumulative, amount: pnl };
    });
  }, [transactions]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-lg mb-4">Curva de Ganancias/Pérdidas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }} />
          <Bar dataKey="amount" fill="rgba(34, 197, 94, 0.1)" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="pnl" stroke="#22c55e" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WinRateAnalysis({ trades }) {
  const data = useMemo(() => {
    const daily = {};
    trades.forEach(t => {
      const day = new Date(t.date).toLocaleDateString("es-CO", { month: "short", day: "numeric" });
      if (!daily[day]) daily[day] = { wins: 0, losses: 0, pnl: 0 };
      if (t.type === "income") {
        daily[day].wins++;
        daily[day].pnl += t.amount;
      } else {
        daily[day].losses++;
        daily[day].pnl -= t.amount;
      }
    });
    return Object.entries(daily).map(([date, d]) => ({ date, ...d, winRate: (d.wins / (d.wins + d.losses) * 100).toFixed(0) }));
  }, [trades]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-lg mb-4">Win Rate Diario</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }} />
          <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceMetrics({ transactions }) {
  const stats = useMemo(() => {
    const wins = transactions.filter(t => t.type === "income");
    const losses = transactions.filter(t => t.type === "expense");
    const totalWin = wins.reduce((s, t) => s + t.amount, 0);
    const totalLoss = losses.reduce((s, t) => s + t.amount, 0);
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : totalWin > 0 ? "∞" : "0";
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(0) : 0;
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(0) : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞";

    return { totalWin, totalLoss, profitFactor, avgWin, avgLoss, riskRewardRatio, winCount: wins.length, lossCount: losses.length };
  }, [transactions]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-yellow-500" /><span className="text-xs text-muted-foreground">Profit Factor</span></div>
        <p className="text-2xl font-bold text-yellow-600">{stats.profitFactor}</p>
        <p className="text-xs text-muted-foreground mt-1">Ratio ganancias/pérdidas</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Risk/Reward</span></div>
        <p className="text-2xl font-bold text-blue-600">{stats.riskRewardRatio}</p>
        <p className="text-xs text-muted-foreground mt-1">Promedio ganancia vs pérdida</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Promedio Ganancia</span></div>
        <p className="text-xl font-bold text-emerald-600">{formatCOP(stats.avgWin)}</p>
        <p className="text-xs text-muted-foreground mt-1">{stats.winCount} operaciones</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs text-muted-foreground">Promedio Pérdida</span></div>
        <p className="text-xl font-bold text-red-600">{formatCOP(stats.avgLoss)}</p>
        <p className="text-xs text-muted-foreground mt-1">{stats.lossCount} operaciones</p>
      </div>
    </div>
  );
}