import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, BookOpen, Bot, StickyNote, ArrowRight } from "lucide-react";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import PriceManager from "@/components/dashboard/PriceManager";
import { IncomeExpenseChart, CashFlowChart } from "@/components/dashboard/DashboardCharts";
import MoneyGoalBars from "@/components/dashboard/MoneyGoalBars";
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
  const winTrades = tasks.filter(t => t.status === "completed").length;
  const lossTrades = tasks.filter(t => t.status === "cancelled").length;
  const totalTrades = tasks.length;
  const winRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 100) : 0;

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

      {/* Stats - solo si hay transacciones */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Balance Total" value={`$${balance.toLocaleString()}`} subtitle="capital neto" className="border-emerald-500/20" />
          <StatCard icon={TrendingUp} label="Ingresos" value={`$${totalIncome.toLocaleString()}`} subtitle="acumulado" />
          <StatCard icon={TrendingDown} label="Gastos" value={`$${totalExpense.toLocaleString()}`} subtitle="acumulado" />
          {tasks.length > 0 && <StatCard icon={BarChart2} label="Win Rate" value={`${winRate}%`} subtitle={`${winTrades}W / ${lossTrades}L`} />}
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 && tasks.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">¡Bienvenido a tu Trading Dashboard!</p>
          <p className="text-muted-foreground text-sm">Registra tu primer trade o transacción para ver métricas aquí.</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashFlowChart transactions={transactions} />
        <IncomeExpenseChart transactions={transactions} />
      </div>

      {/* Money goals + recent trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MoneyGoalBars transactions={transactions} bankAccounts={bankAccounts} />

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Registrar Trade", path: "/Tasks", icon: BarChart2 },
              { label: "Contabilidad", path: "/Accounting", icon: DollarSign },
              { label: "Informes", path: "/Reports", icon: TrendingUp },
              { label: "Notas de Trading", path: "/Notes", icon: StickyNote },
              { label: "Secretaria IA", path: "/Secretary", icon: Bot },
              { label: "Cursos", path: "/Courses", icon: BookOpen },
            ].map((action) => (
              <Link key={action.path + action.label} to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Notas Recientes</h2>
            <Link to="/Notes" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.slice(0, 3).map(note => (
              <div key={note.id} className="p-4 rounded-xl bg-muted/40 border border-border">
                <p className="text-sm font-medium truncate">{note.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}