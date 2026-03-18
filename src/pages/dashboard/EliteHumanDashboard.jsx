import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Zap, Target, Activity, StickyNote, Wallet, Calendar, Lightbulb, Bot, ArrowRight, CheckCircle, Flame } from "lucide-react";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import PriceManager from "@/components/dashboard/PriceManager";
import { TaskPriorityChart, TaskStatusChart } from "@/components/dashboard/DashboardCharts";
import MoneyGoalBars from "@/components/dashboard/MoneyGoalBars";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const QUOTES = [
  "Disciplina es elegir entre lo que quieres ahora y lo que más quieres.",
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "Tu única competencia eres tú mismo de ayer.",
  "No cuentes los días, haz que los días cuenten.",
  "Los campeones no son hechos en los gimnasios. Son hechos de algo profundo dentro de ellos.",
];

export default function EliteHumanDashboard() {
  const user = useCurrentUser();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email, "elite_human"],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email, profile_id: "elite_human" }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email, "elite_human"],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email, profile_id: "elite_human" }, "-created_date", 20),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.email, "elite_human"],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email, profile_id: "elite_human" }, "-created_date", 100),
    enabled: !!user,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts", user?.email, "elite_human"],
    queryFn: () => base44.entities.BankAccount.filter({ created_by: user.email, profile_id: "elite_human" }),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-today", user?.email],
    queryFn: () => base44.entities.CalendarEvent.filter({ date: format(new Date(), "yyyy-MM-dd"), created_by: user.email }),
    enabled: !!user,
  });

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
  const activeProjects = projects.filter(p => p.status === "active").length;
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header with quote */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Buen día, {user?.full_name?.split(" ")[0] || "Guerrero"} ⚡
          </h1>
        </div>
        <p className="text-muted-foreground text-sm capitalize mb-3">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
        <p className="text-sm italic text-amber-600 dark:text-amber-400 font-medium">"{quote}"</p>
      </div>

      <TrialBanner profile="elite_human" />
      <PriceManager />

      {/* Stats - solo si hay datos */}
      {(tasks.length > 0 || projects.length > 0 || transactions.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Metas Activas" value={pendingTasks} subtitle="por completar" />
          <StatCard icon={CheckCircle} label="Logros" value={completedTasks} subtitle={`${completionRate}% tasa de éxito`} />
          <StatCard icon={Activity} label="Proyectos Vitales" value={activeProjects} subtitle="en progreso" />
          <StatCard icon={Flame} label="Balance" value={`$${(totalIncome - totalExpense).toLocaleString()}`} subtitle="patrimonio neto" />
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && projects.length === 0 && transactions.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">¡Comienza tu transformación!</p>
          <p className="text-muted-foreground text-sm">Crea tu primera meta o proyecto para ver tus métricas aquí.</p>
        </div>
      )}

      {/* Today's focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">🎯 Metas de Hoy</h2>
            <Link to="/Tasks" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.priority === "high" || t.priority === "critical").slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === "critical" ? "bg-red-500" : "bg-amber-500"
                }`} />
                <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.status}</span>
              </div>
            ))}
            {tasks.filter(t => t.priority === "high" || t.priority === "critical").length === 0 && (
              <p className="text-muted-foreground text-sm">No hay metas de alta prioridad.</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">📅 Eventos de Hoy</h2>
            <Link to="/Calendar" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Calendario <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">Día libre — úsalo con intención.</p>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    {ev.time && <p className="text-xs text-muted-foreground">{ev.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TaskStatusChart tasks={tasks} />
        <TaskPriorityChart tasks={tasks} />
      </div>

      {/* Money goals + quick access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MoneyGoalBars transactions={transactions} bankAccounts={bankAccounts} />

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Mis Metas", path: "/Tasks", icon: Target },
              { label: "Proyectos Vitales", path: "/Projects", icon: Activity },
              { label: "Diario / Notas", path: "/Notes", icon: StickyNote },
              { label: "Finanzas Personales", path: "/Accounting", icon: Wallet },
              { label: "Aprendizaje", path: "/Courses", icon: Lightbulb },
              { label: "Secretaria IA", path: "/Secretary", icon: Bot },
            ].map((action) => (
              <Link key={action.label} to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-amber-500" />
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