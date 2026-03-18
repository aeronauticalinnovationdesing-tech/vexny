import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, BookOpen, Bot, StickyNote, ArrowRight, Brain, Target, Zap } from "lucide-react";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import PriceManager from "@/components/dashboard/PriceManager";
import { IncomeExpenseChart, CashFlowChart } from "@/components/dashboard/DashboardCharts";
import MoneyGoalBars from "@/components/dashboard/MoneyGoalBars";
import ForexFactoryWidget from "@/components/trader/ForexFactoryWidget";
import AccountTypeBadge from "@/components/trader/AccountTypeBadge";
import { ProfitLossChart } from "@/components/trader/AdvancedMetrics";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TraderDashboard() {
  const user = useCurrentUser();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.email, "trader"],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email, profile_id: "trader" }, "-created_date", 100),
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email, "trader"],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email, profile_id: "trader" }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: tradesNew = [] } = useQuery({
    queryKey: ["trades", user?.email],
    queryFn: () => base44.entities.Trade.filter({ created_by: user.email }, "-date", 100),
    enabled: !!user,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts", user?.email, "trader"],
    queryFn: () => base44.entities.BankAccount.filter({ created_by: user.email, profile_id: "trader" }),
    enabled: !!user,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", user?.email, "trader"],
    queryFn: () => base44.entities.Note.filter({ created_by: user.email, profile_id: "trader" }, "-created_date", 5),
    enabled: !!user,
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  // New Trade entity metrics
  const tradeWins = tradesNew.filter(t => t.result === "win");
  const tradeLosses = tradesNew.filter(t => t.result === "loss");
  const tradePnl = tradesNew.reduce((s, t) => s + (t.pnl || 0), 0);
  const tradeWinRate = tradesNew.length > 0 ? Math.round((tradeWins.length / tradesNew.length) * 100) : 0;
  const avgRR = tradesNew.filter(t => t.risk_reward).length > 0
    ? (tradesNew.filter(t => t.risk_reward).reduce((s, t) => s + t.risk_reward, 0) / tradesNew.filter(t => t.risk_reward).length).toFixed(2)
    : null;
  const profitFactor = tradeLosses.reduce((s,t)=>s+Math.abs(t.pnl||0),0) > 0
    ? (tradeWins.reduce((s,t)=>s+(t.pnl||0),0) / tradeLosses.reduce((s,t)=>s+Math.abs(t.pnl||0),0)).toFixed(2)
    : null;

  // Legacy
  const winTrades = tasks.filter(t => t.status === "completed").length;
  const lossTrades = tasks.filter(t => t.status === "cancelled").length;
  const totalTrades = tasks.length;
  const winRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 100) : 0;

  const useNewTrades = tradesNew.length > 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Trading Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <TrialBanner profile="trader" />
      <PriceManager />

      {/* Stats Pro */}
      {(useNewTrades || transactions.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-card rounded-xl border border-emerald-500/20 p-4 col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground mb-1">P&L Total</p>
            <p className={`text-2xl font-bold ${(useNewTrades ? tradePnl : balance) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {(useNewTrades ? tradePnl : balance) >= 0 ? "+" : ""}${(useNewTrades ? tradePnl : balance).toFixed(2)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-blue-600">{useNewTrades ? tradeWinRate : winRate}%</p>
            <p className="text-xs text-muted-foreground">{useNewTrades ? tradeWins.length : winTrades}W · {useNewTrades ? tradeLosses.length : lossTrades}L</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Trades</p>
            <p className="text-2xl font-bold">{useNewTrades ? tradesNew.length : totalTrades}</p>
          </div>
          {avgRR && <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg RR</p>
            <p className="text-2xl font-bold text-violet-600">{avgRR}</p>
          </div>}
          {profitFactor && <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
            <p className="text-2xl font-bold text-amber-600">{profitFactor}</p>
          </div>}
        </div>
      )}

      {!useNewTrades && transactions.length === 0 && tasks.length === 0 && (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">¡Bienvenido a tu Trading Dashboard!</p>
          <p className="text-muted-foreground text-sm mb-4">Registra tu primer trade para ver métricas y análisis aquí.</p>
          <Link to="/Tasks" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <BarChart2 className="w-4 h-4" /> Ir al Journal Pro
          </Link>
        </div>
      )}

      {/* Chart + Noticias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {useNewTrades ? (
            <ProfitLossChart transactions={tradesNew.map(t => ({ ...t, type: t.result === "win" ? "income" : "expense", amount: Math.abs(t.pnl || 0) }))} />
          ) : (
            <CashFlowChart transactions={transactions} />
          )}
        </div>
        <ForexFactoryWidget compact={true} />
      </div>

      {/* Quick Access + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="font-semibold">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Journal Pro", path: "/Tasks", icon: BarChart2, desc: "Registra y analiza trades" },
              { label: "Análisis IA", path: "/Tasks", icon: Brain, desc: "Estrategia con IA" },
              { label: "Contabilidad", path: "/Accounting", icon: DollarSign, desc: "Capital y P&L" },
              { label: "Informes", path: "/Reports", icon: TrendingUp, desc: "Exportar reportes" },
              { label: "Secretaria IA", path: "/Secretary", icon: Bot, desc: "Asistente trader" },
            ].map((action) => (
              <Link key={action.label} to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <action.icon className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        {notes.length > 0 ? (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Notas Recientes</h2>
              <Link to="/Notes" className="text-primary text-xs font-medium flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {notes.slice(0, 4).map(note => (
                <div key={note.id} className="p-3 rounded-xl bg-muted/40 border border-border">
                  <p className="text-sm font-medium truncate">{note.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MoneyGoalBars transactions={transactions} bankAccounts={bankAccounts} />
        )}
      </div>
    </div>
  );
}