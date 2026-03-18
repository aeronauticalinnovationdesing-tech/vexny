import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Rocket, FolderKanban, CheckSquare, DollarSign, Users, TrendingUp, Bot, BookOpen, ArrowRight } from "lucide-react";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import PriceManager from "@/components/dashboard/PriceManager";
import { IncomeExpenseChart, TaskStatusChart, ProjectProgressChart } from "@/components/dashboard/DashboardCharts";
import ProjectProgressBars from "@/components/dashboard/ProjectProgressBars";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function StartupDashboard() {
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

  const activeProjects = projects.filter(p => p.status === "active").length;
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // Runway: balance neto dividido entre el gasto mensual promedio
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const recentExpenses = transactions
    .filter(t => t.type === "expense" && t.date && new Date(t.date) >= oneMonthAgo)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const monthlyBurn = recentExpenses || (totalExpense / Math.max(1, 3)); // fallback: promedio 3 meses
  const runway = monthlyBurn > 0 && netBalance > 0 ? Math.round(netBalance / monthlyBurn) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Rocket className="w-6 h-6 text-violet-500" />
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Startup HQ</h1>
        </div>
        <p className="text-muted-foreground text-sm capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <TrialBanner profile="startup" />
      <PriceManager />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Proyectos Activos" value={activeProjects} subtitle={`${projects.length} total`} />
        <StatCard icon={CheckSquare} label="Tareas Pendientes" value={activeTasks.length} subtitle={`${completedTasks.length} completadas`} />
        <StatCard icon={DollarSign} label="Ingresos" value={`$${totalIncome.toLocaleString()}`} subtitle={`Balance: $${netBalance.toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Burn Rate" value={`$${Math.round(monthlyBurn).toLocaleString()}/mes`} subtitle={runway > 0 ? `~${runway} meses runway` : "Sin runway positivo"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <IncomeExpenseChart transactions={transactions} />
        </div>
        <TaskStatusChart tasks={tasks} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProjectProgressBars projects={projects} tasks={tasks} />
        <ProjectProgressChart projects={projects} tasks={tasks} />
      </div>

      {/* Recent tasks + quick access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Tareas del Equipo</h2>
            <Link to="/Tasks" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeTasks.slice(0, 6).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === "critical" ? "bg-red-500" :
                  task.priority === "high" ? "bg-orange-500" :
                  task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.status} · {task.priority}</p>
                </div>
              </div>
            ))}
            {activeTasks.length === 0 && <p className="text-muted-foreground text-sm">No hay tareas pendientes.</p>}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Proyectos", path: "/Projects", icon: FolderKanban },
              { label: "Tareas", path: "/Tasks", icon: CheckSquare },
              { label: "Finanzas", path: "/Accounting", icon: DollarSign },
              { label: "Equipo", path: "/Accounting", icon: Users },
              { label: "Secretaria IA", path: "/Secretary", icon: Bot },
              { label: "Cursos", path: "/Courses", icon: BookOpen },
            ].map((action) => (
              <Link key={action.label} to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}