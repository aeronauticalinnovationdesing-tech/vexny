import React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["hsl(38,92%,50%)", "hsl(160,60%,45%)", "hsl(220,70%,50%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium mb-1 text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === "number" && p.name?.includes("$") ? `$${p.value.toLocaleString()}` : p.value}</p>
      ))}
    </div>
  );
};

// 1. Ingresos vs Gastos últimos 7 días
export function IncomeExpenseChart({ transactions }) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  const data = days.map(day => {
    const key = format(day, "yyyy-MM-dd");
    const income = transactions.filter(t => t.type === "income" && t.date === key).reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === "expense" && t.date === key).reduce((s, t) => s + (t.amount || 0), 0);
    return { name: format(day, "EEE", { locale: es }), Ingresos: income, Gastos: expense };
  });

  const hasData = transactions.length > 0;
  if (!hasData) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Ingresos vs Gastos (7 días)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220,14%,90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Ingresos" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Gastos" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 2. Tareas por prioridad (donut)
export function TaskPriorityChart({ tasks }) {
  const data = [
    { name: "Crítica", value: tasks.filter(t => t.priority === "critical").length },
    { name: "Alta", value: tasks.filter(t => t.priority === "high").length },
    { name: "Media", value: tasks.filter(t => t.priority === "medium").length },
    { name: "Baja", value: tasks.filter(t => t.priority === "low").length },
  ].filter(d => d.value > 0);

  const PCOLORS = ["hsl(0,84%,60%)", "hsl(25,95%,53%)", "hsl(38,92%,50%)", "hsl(160,60%,45%)"];

  if (!data.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Tareas por Prioridad</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={PCOLORS[i % PCOLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Progreso de proyectos (horizontal bars)
export function ProjectProgressChart({ projects, tasks }) {
  const data = projects.filter(p => p.status === "active").slice(0, 5).map(p => {
    const pts = tasks.filter(t => t.project_id === p.id);
    const done = pts.filter(t => t.status === "completed").length;
    return {
      name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
      Progreso: pts.length > 0 ? Math.round((done / pts.length) * 100) : 0,
    };
  });

  if (!data.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Progreso de Proyectos</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" barSize={16}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220,14%,90%)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} formatter={v => [`${v}%`, "Progreso"]} />
          <Bar dataKey="Progreso" fill="hsl(38,92%,50%)" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. Flujo de caja acumulado (área)
export function CashFlowChart({ transactions }) {
  const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));
  let cumulative = 0;
  const data = days.map(day => {
    const key = format(day, "yyyy-MM-dd");
    const inc = transactions.filter(t => t.type === "income" && t.date === key).reduce((s, t) => s + (t.amount || 0), 0);
    const exp = transactions.filter(t => t.type === "expense" && t.date === key).reduce((s, t) => s + (t.amount || 0), 0);
    cumulative += inc - exp;
    return { name: format(day, "d MMM", { locale: es }), Balance: cumulative };
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Flujo de Caja (14 días)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220,14%,90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Balance" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#balanceGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 5. Estado de tareas (donut)
export function TaskStatusChart({ tasks }) {
  const data = [
    { name: "Pendiente", value: tasks.filter(t => t.status === "pending").length },
    { name: "En Progreso", value: tasks.filter(t => t.status === "in_progress").length },
    { name: "Revisión", value: tasks.filter(t => t.status === "review").length },
    { name: "Completada", value: tasks.filter(t => t.status === "completed").length },
  ].filter(d => d.value > 0);

  const SCOLORS = ["hsl(220,70%,60%)", "hsl(38,92%,50%)", "hsl(280,65%,60%)", "hsl(160,60%,45%)"];

  if (!data.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Estado de Tareas</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={SCOLORS[i % SCOLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}