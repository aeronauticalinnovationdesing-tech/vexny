import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { FolderKanban, CheckSquare, Wallet, Sword, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/dashboard/StatCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import {
  IncomeExpenseChart, TaskPriorityChart,
  ProjectProgressChart, CashFlowChart, TaskStatusChart
} from "../components/dashboard/DashboardCharts";
import ProjectProgressBars from "../components/dashboard/ProjectProgressBars";
import MoneyGoalBars from "../components/dashboard/MoneyGoalBars";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const user = useCurrentUser();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.email],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email }, "-created_date", 100),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-today", user?.email],
    queryFn: () => base44.entities.CalendarEvent.filter({ date: format(new Date(), "yyyy-MM-dd"), created_by: user.email }),
    enabled: !!user,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts", user?.email],
    queryFn: () => base44.entities.BankAccount.filter({ created_by: user.email }, "-created_date", 20),
    enabled: !!user,
  });

  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sword className="w-6 h-6 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Comando Central</h1>
          </div>
          <p className="text-muted-foreground text-sm capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Proyectos Activos" value={projects.filter(p => p.status === "active").length} subtitle={`${projects.length} total`} />
        <StatCard icon={CheckSquare} label="Tareas Pendientes" value={activeTasks.length} subtitle={`${completedTasks.length} completadas`} />
        <StatCard icon={TrendingUp} label="Ingresos" value={`$${totalIncome.toLocaleString()}`} subtitle="acumulado" />
        <StatCard icon={TrendingDown} label="Gastos" value={`$${totalExpense.toLocaleString()}`} subtitle={`Balance: $${balance.toLocaleString()}`} />
      </div>

      {/* Row 1: Cash Flow + Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashFlowChart transactions={transactions} />
        <IncomeExpenseChart transactions={transactions} />
      </div>

      {/* Row 2: Task Status + Task Priority + Project Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <TaskStatusChart tasks={tasks} />
        <TaskPriorityChart tasks={tasks} />
        <ProjectProgressChart projects={projects} tasks={tasks} />
      </div>

      {/* Row 3: Project Progress Bars + Money Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProjectProgressBars projects={projects} tasks={tasks} />
        <MoneyGoalBars transactions={transactions} bankAccounts={bankAccounts} />
      </div>

      {/* Row 4: Recent Tasks + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Tareas Recientes</h2>
            <Link to="/Tasks" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <RecentActivity tasks={activeTasks} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Nuevo Proyecto", path: "/Projects", icon: FolderKanban },
              { label: "Nueva Tarea", path: "/Tasks", icon: CheckSquare },
              { label: "Registrar Movimiento", path: "/Accounting", icon: Wallet },
              { label: "Secretaria Virtual", path: "/Secretary", icon: Sword },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm font-semibold text-primary">💪 Mentalidad Gladiador</p>
            <p className="text-xs text-muted-foreground mt-1">
              "La victoria pertenece a los que perseveran."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}