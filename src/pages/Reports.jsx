import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, FolderKanban, CheckSquare, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "../components/dashboard/StatCard";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["hsl(38, 92%, 50%)", "hsl(160, 60%, 45%)", "hsl(220, 70%, 50%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const user = useCurrentUser();
  const { activeProfileId, activeProfile } = useProfile();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email, activeProfileId],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email, profile_id: activeProfileId }),
    enabled: !!user && !!activeProfileId,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email, activeProfileId],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email, profile_id: activeProfileId }),
    enabled: !!user && !!activeProfileId,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.email, activeProfileId],
    queryFn: () => base44.entities.Transaction.filter({ created_by: user.email, profile_id: activeProfileId }),
    enabled: !!user && !!activeProfileId,
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  // Task status data
  const taskStatusData = [
    { name: "Pendientes", value: tasks.filter(t => t.status === "pending").length },
    { name: "En Progreso", value: tasks.filter(t => t.status === "in_progress").length },
    { name: "Completadas", value: tasks.filter(t => t.status === "completed").length },
    { name: "Canceladas", value: tasks.filter(t => t.status === "cancelled").length },
  ].filter(d => d.value > 0);

  // Expense categories
  const categoryTotals = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    categoryTotals[t.category || "other"] = (categoryTotals[t.category || "other"] || 0) + (t.amount || 0);
  });
  const expenseData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const generatePDF = async () => {
    setGenerating(true);

    // Get AI analysis
    const dataContext = `
Perfil: ${activeProfile?.name || "VEXNY"}
Fecha: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
Proyectos: ${projects.length} totales, ${projects.filter(p => p.status === "active").length} activos, ${projects.filter(p => p.status === "completed").length} completados
Tareas: ${tasks.length} totales, ${tasks.filter(t => t.status === "completed").length} completadas, ${tasks.filter(t => t.status === "in_progress").length} en progreso, ${tasks.filter(t => t.status === "pending").length} pendientes
Ingresos: ${formatCOP(totalIncome)}
Gastos: ${formatCOP(totalExpense)}
Balance neto: ${formatCOP(totalIncome - totalExpense)}
Gastos por categoría: ${expenseData.map(d => `${d.name}: ${formatCOP(d.value)}`).join(", ")}
Proyectos activos: ${projects.filter(p => p.status === "active").map(p => p.name).join(", ") || "Ninguno"}
`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres el asesor estratégico de VEXNY. Genera un análisis ejecutivo conciso (máximo 4 párrafos) basado en estos datos reales. Sé directo, motivador y estratégico. NO uses markdown, solo texto plano:\n\n${dataContext}`,
    });

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    const addPage = () => {
      doc.addPage();
      y = 20;
    };

    const checkY = (needed = 10) => {
      if (y + needed > pageH - 20) addPage();
    };

    // ── HEADER ──
    doc.setFillColor(20, 20, 30);
    doc.rect(0, 0, pageW, 42, "F");
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 38, pageW, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("VEXNY", margin, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text("Informe Ejecutivo", margin, 27);
    doc.setFontSize(9);
    doc.text(`${activeProfile?.name || "General"} · ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, margin, 35);
    // right side
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CONFIDENCIAL", pageW - margin, 20, { align: "right" });
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    doc.text(user?.email || "", pageW - margin, 28, { align: "right" });
    y = 52;

    // ── KPI CARDS ──
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen Ejecutivo", margin, y);
    y += 8;

    const kpis = [
      { label: "Proyectos", value: String(projects.length), sub: `${projects.filter(p => p.status === "active").length} activos`, color: [37, 99, 235] },
      { label: "Tareas", value: String(tasks.length), sub: `${tasks.filter(t => t.status === "completed").length} completadas`, color: [16, 185, 129] },
      { label: "Ingresos", value: formatCOP(totalIncome), sub: "total acumulado", color: [16, 185, 129] },
      { label: "Gastos", value: formatCOP(totalExpense), sub: "total acumulado", color: [239, 68, 68] },
      { label: "Balance", value: formatCOP(totalIncome - totalExpense), sub: "neto", color: totalIncome - totalExpense >= 0 ? [245, 158, 11] : [239, 68, 68] },
      { label: "Completadas", value: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) : 0}%`, sub: "de tareas", color: [139, 92, 246] },
    ];

    const cardW = (contentW - 8) / 3;
    const cardH = 22;
    let kpiX = margin;
    let kpiY = y;
    kpis.forEach((kpi, i) => {
      if (i === 3) { kpiX = margin; kpiY += cardH + 4; }
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(kpiX, kpiY, cardW, cardH, 3, 3, "F");
      doc.setDrawColor(...kpi.color);
      doc.setLineWidth(0.8);
      doc.line(kpiX + 3, kpiY + 2, kpiX + 3, kpiY + cardH - 2);
      doc.setLineWidth(0.2);
      doc.setTextColor(...kpi.color);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.value, kpiX + 8, kpiY + 10);
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.label, kpiX + 8, kpiY + 16);
      doc.setTextColor(150, 150, 150);
      doc.text(kpi.sub, kpiX + 8, kpiY + 20);
      kpiX += cardW + 4;
    });
    y = kpiY + cardH + 10;

    // ── ANÁLISIS IA ──
    checkY(30);
    doc.setFillColor(245, 158, 11);
    doc.rect(margin, y, 3, 7, "F");
    doc.setTextColor(20, 20, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Análisis Estratégico IA", margin + 6, y + 5.5);
    y += 12;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const aiLines = doc.splitTextToSize(typeof aiAnalysis === "string" ? aiAnalysis : JSON.stringify(aiAnalysis), contentW);
    aiLines.forEach(line => {
      checkY(6);
      doc.text(line, margin, y);
      y += 5.2;
    });
    y += 6;

    // ── PROYECTOS ──
    if (projects.length > 0) {
      checkY(30);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, 3, 7, "F");
      doc.setTextColor(20, 20, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Proyectos", margin + 6, y + 5.5);
      y += 12;

      // Table header
      const cols = [55, 28, 28, 30, 35];
      const headers = ["Nombre", "Estado", "Prioridad", "Presupuesto", "Fecha Fin"];
      doc.setFillColor(20, 20, 30);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      let cx = margin + 3;
      headers.forEach((h, i) => { doc.text(h, cx, y + 5.5); cx += cols[i]; });
      y += 8;

      const statusLabels = { planning: "Planificación", active: "Activo", paused: "Pausado", completed: "Completado" };
      const priorityLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

      projects.slice(0, 15).forEach((p, idx) => {
        checkY(8);
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(margin, y, contentW, 7, "F");
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        cx = margin + 3;
        const row = [
          doc.splitTextToSize(p.name || "", cols[0] - 4)[0],
          statusLabels[p.status] || p.status,
          priorityLabels[p.priority] || p.priority || "-",
          p.budget ? formatCOP(p.budget) : "-",
          p.end_date ? format(new Date(p.end_date), "dd/MM/yyyy") : "-",
        ];
        row.forEach((cell, i) => { doc.text(String(cell), cx, y + 4.5); cx += cols[i]; });
        y += 7;
      });
      y += 8;
    }

    // ── TAREAS ──
    if (tasks.length > 0) {
      checkY(30);
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, y, 3, 7, "F");
      doc.setTextColor(20, 20, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Tareas", margin + 6, y + 5.5);
      y += 12;

      // status bars
      const statuses = [
        { label: "Completadas", count: tasks.filter(t => t.status === "completed").length, color: [16, 185, 129] },
        { label: "En Progreso", count: tasks.filter(t => t.status === "in_progress").length, color: [245, 158, 11] },
        { label: "Pendientes", count: tasks.filter(t => t.status === "pending").length, color: [100, 116, 139] },
        { label: "Revisión", count: tasks.filter(t => t.status === "review").length, color: [139, 92, 246] },
        { label: "Canceladas", count: tasks.filter(t => t.status === "cancelled").length, color: [239, 68, 68] },
      ];

      const barW = (contentW - 20) / statuses.length;
      const maxCount = Math.max(...statuses.map(s => s.count), 1);
      const barMaxH = 20;

      statuses.forEach((s, i) => {
        const bx = margin + i * (barW + 4);
        const bh = Math.max(2, (s.count / maxCount) * barMaxH);
        doc.setFillColor(...s.color);
        doc.roundedRect(bx, y + barMaxH - bh, barW, bh, 1, 1, "F");
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(s.count), bx + barW / 2, y + barMaxH - bh - 2, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(s.label, bx + barW / 2, y + barMaxH + 5, { align: "center" });
      });
      y += barMaxH + 12;

      // top pending tasks table
      const pending = tasks.filter(t => ["pending", "in_progress", "review"].includes(t.status)).slice(0, 10);
      if (pending.length > 0) {
        checkY(20);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Tareas pendientes / en curso:", margin, y);
        y += 6;
        pending.forEach((t, idx) => {
          checkY(6);
          doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 252 : 255);
          doc.rect(margin, y, contentW, 6.5, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(40, 40, 40);
          doc.text(doc.splitTextToSize(t.title || "", 100)[0], margin + 3, y + 4.5);
          const prioColors = { critical: [239,68,68], high: [245,158,11], medium: [59,130,246], low: [100,116,139] };
          const pc = prioColors[t.priority] || [100,116,139];
          doc.setFillColor(...pc);
          doc.roundedRect(pageW - margin - 25, y + 1.5, 22, 4, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6.5);
          doc.text((t.priority || "media").toUpperCase(), pageW - margin - 14, y + 4.5, { align: "center" });
          y += 6.5;
        });
      }
      y += 8;
    }

    // ── FINANZAS ──
    if (transactions.length > 0) {
      checkY(30);
      doc.setFillColor(139, 92, 246);
      doc.rect(margin, y, 3, 7, "F");
      doc.setTextColor(20, 20, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Finanzas", margin + 6, y + 5.5);
      y += 12;

      if (expenseData.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Gastos por Categoría:", margin, y);
        y += 6;
        expenseData.slice(0, 8).forEach((cat, idx) => {
          checkY(7);
          const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
          const barMaxW = contentW - 60;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          doc.text(cat.name, margin, y + 4);
          doc.setFillColor(230, 232, 240);
          doc.roundedRect(margin + 32, y, barMaxW, 6, 1, 1, "F");
          doc.setFillColor(COLORS[idx % COLORS.length].startsWith("hsl") ? 245 : 245, 158, 11);
          doc.setFillColor(idx % 2 === 0 ? 245 : 139, idx % 2 === 0 ? 158 : 92, idx % 2 === 0 ? 11 : 246);
          doc.roundedRect(margin + 32, y, Math.max(2, (pct / 100) * barMaxW), 6, 1, 1, "F");
          doc.setTextColor(80, 80, 80);
          doc.text(formatCOP(cat.value), margin + 32 + barMaxW + 3, y + 4.5);
          y += 9;
        });
      }
      y += 4;

      // Recent transactions
      const recent = transactions.slice(0, 8);
      checkY(20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Movimientos Recientes:", margin, y);
      y += 6;
      recent.forEach((tx, idx) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(margin, y, contentW, 6.5, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(doc.splitTextToSize(tx.description || "", 100)[0], margin + 3, y + 4.5);
        const amtColor = tx.type === "income" ? [16, 185, 129] : [239, 68, 68];
        doc.setTextColor(...amtColor);
        doc.setFont("helvetica", "bold");
        doc.text(`${tx.type === "income" ? "+" : "-"}${formatCOP(tx.amount)}`, pageW - margin - 3, y + 4.5, { align: "right" });
        y += 6.5;
      });
    }

    // ── FOOTER on all pages ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(20, 20, 30);
      doc.rect(0, pageH - 12, pageW, 12, "F");
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text("VEXNY · Informe confidencial generado automáticamente", margin, pageH - 4.5);
      doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4.5, { align: "right" });
    }

    doc.save(`informe-vexny-${activeProfile?.name || "general"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setGenerating(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
        </div>
        <Button onClick={generatePDF} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Generar Informe
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FolderKanban} label="Proyectos" value={projects.length} subtitle={`${projects.filter(p => p.status === "active").length} activos`} />
        <StatCard icon={CheckSquare} label="Tareas" value={tasks.length} subtitle={`${tasks.filter(t => t.status === "completed").length} completadas`} />
        <StatCard icon={Wallet} label="Balance" value={`$${(totalIncome - totalExpense).toLocaleString()}`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Estado de Tareas</h3>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Gastos por Categoría</h3>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
}