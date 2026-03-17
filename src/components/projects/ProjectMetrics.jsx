import React from "react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import { Clock, CheckSquare, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isAfter } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectMetrics({ project, tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const overdue = tasks.filter(t =>
    t.due_date && t.status !== "completed" && t.status !== "cancelled" && isAfter(new Date(), new Date(t.due_date))
  ).length;

  const totalHours = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const loggedHours = tasks.reduce((s, t) => s + (t.logged_hours || 0), 0);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const budgetUsed = project.budget > 0 ? Math.round(((project.spent || 0) / project.budget) * 100) : 0;

  const priorityData = [
    { name: "Crítica", value: tasks.filter(t => t.priority === "critical").length, fill: "#EF4444" },
    { name: "Alta", value: tasks.filter(t => t.priority === "high").length, fill: "#F97316" },
    { name: "Media", value: tasks.filter(t => t.priority === "medium").length, fill: "#F59E0B" },
    { name: "Baja", value: tasks.filter(t => t.priority === "low").length, fill: "#22C55E" },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: "Backlog", value: tasks.filter(t => t.status === "backlog").length },
    { name: "Pendiente", value: tasks.filter(t => t.status === "pending").length },
    { name: "Progreso", value: tasks.filter(t => t.status === "in_progress").length },
    { name: "Revisión", value: tasks.filter(t => t.status === "review").length },
    { name: "Listo", value: tasks.filter(t => t.status === "completed").length },
  ];

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Progreso General", value: `${progress}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Tareas Vencidas", value: overdue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Horas Registradas", value: `${loggedHours}h`, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
          { label: "Tareas en Progreso", value: inProgress, icon: Zap, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(m => (
          <div key={m.label} className={cn("rounded-xl p-4 flex items-start gap-3", m.bg)}>
            <m.icon className={cn("w-4 h-4 mt-0.5", m.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={cn("text-xl font-bold", m.color)}>{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Progress Bars */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h4 className="font-semibold text-sm">Estado del Proyecto</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Tareas completadas</span>
                <span className="font-medium">{completed}/{total}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            {project.budget > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Presupuesto utilizado</span>
                  <span className={cn("font-medium", budgetUsed > 90 && "text-red-600")}>{budgetUsed}%</span>
                </div>
                <Progress value={budgetUsed} className={cn("h-2", budgetUsed > 90 && "[&>div]:bg-red-500")} />
                <p className="text-xs text-muted-foreground mt-1">
                  ${(project.spent || 0).toLocaleString()} de ${project.budget.toLocaleString()}
                </p>
              </div>
            )}
            {totalHours > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Horas utilizadas</span>
                  <span className="font-medium">{loggedHours}h / {totalHours}h</span>
                </div>
                <Progress value={totalHours > 0 ? (loggedHours / totalHours) * 100 : 0} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Status Chart */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h4 className="font-semibold text-sm mb-3">Tareas por Estado</h4>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">Sin tareas</div>
          )}
        </div>
      </div>

      {/* Milestones */}
      {(project.milestones || []).length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h4 className="font-semibold text-sm mb-3">Hitos del Proyecto</h4>
          <div className="space-y-2">
            {project.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                <div className={cn("w-3 h-3 rounded-full border-2 flex-shrink-0",
                  m.completed ? "bg-primary border-primary" : "border-muted-foreground"
                )} />
                <span className={cn("text-sm flex-1", m.completed && "line-through text-muted-foreground")}>{m.title}</span>
                {m.date && <span className="text-xs text-muted-foreground">{format(new Date(m.date), "d MMM", { locale: es })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}