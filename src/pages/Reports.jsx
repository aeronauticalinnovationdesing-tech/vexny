import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/lib/ProfileContext";
import DronePilotReport from "./reports/DronePilotReport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, Loader2, FolderKanban, CheckSquare,
  Wallet, TrendingUp, TrendingDown, Target, Activity,
  BarChart2, PieChart as PieChartIcon, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

// ── Captura de DOM a imagen ──
const captureEl = async (ref) => {
  if (!ref?.current) return null;
  try {
    const canvas = await html2canvas(ref.current, {
      backgroundColor: "#ffffff", scale: 2, logging: false,
      useCORS: true, allowTaint: true,
    });
    return canvas.toDataURL("image/png");
  } catch { return null; }
};

// ── Sección en PDF ──
const pdfSection = (doc, title, color, margin, y, pageH) => {
  if (y + 20 > pageH - 20) { doc.addPage(); y = 22; }
  doc.setFillColor(...color);
  doc.rect(margin, y, 3, 8, "F");
  doc.setTextColor(20, 20, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin + 7, y + 6);
  return y + 14;
};

function GenericReport() {
   const [generating, setGenerating] = useState(false);
   const user = useCurrentUser();
   const { activeProfileId, activeProfile } = useProfile();
   const isDronePilot = activeProfileId === "drone_pilot";

  // Refs para todas las gráficas
  const refPieTask = useRef(null);
  const refBarExpense = useRef(null);
  const refLineFinance = useRef(null);
  const refBarProject = useRef(null);
  const refPiePriority = useRef(null);
  const refAreaBalance = useRef(null);

  // ── Queries ──
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

  // ── Métricas ──
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) : 0;

  // Chart 1: Estado de Tareas (Pie)
  const taskStatusData = [
    { name: "Pendientes", value: tasks.filter(t => t.status === "pending").length },
    { name: "En Progreso", value: tasks.filter(t => t.status === "in_progress").length },
    { name: "Completadas", value: tasks.filter(t => t.status === "completed").length },
    { name: "Revisión", value: tasks.filter(t => t.status === "review").length },
    { name: "Canceladas", value: tasks.filter(t => t.status === "cancelled").length },
  ].filter(d => d.value > 0);

  // Chart 2: Prioridad de Tareas (Pie)
  const taskPriorityData = [
    { name: "Crítica", value: tasks.filter(t => t.priority === "critical").length },
    { name: "Alta", value: tasks.filter(t => t.priority === "high").length },
    { name: "Media", value: tasks.filter(t => t.priority === "medium").length },
    { name: "Baja", value: tasks.filter(t => t.priority === "low").length },
  ].filter(d => d.value > 0);

  // Chart 3: Gastos por Categoría (Bar)
  const categoryTotals = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    categoryTotals[t.category || "other"] = (categoryTotals[t.category || "other"] || 0) + (t.amount || 0);
  });
  const expenseData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Chart 4: Estado de Proyectos (Bar)
  const projectStatusData = [
    { name: "Planificación", value: projects.filter(p => p.status === "planning").length },
    { name: "Activos", value: projects.filter(p => p.status === "active").length },
    { name: "Pausados", value: projects.filter(p => p.status === "paused").length },
    { name: "Completados", value: projects.filter(p => p.status === "completed").length },
  ].filter(d => d.value > 0);

  // Chart 5: Ingresos vs Gastos por mes (Line)
  const monthlyMap = {};
  transactions.forEach(t => {
    if (!t.date) return;
    const month = format(new Date(t.date), "MMM yy", { locale: es });
    if (!monthlyMap[month]) monthlyMap[month] = { month, ingresos: 0, gastos: 0 };
    if (t.type === "income") monthlyMap[month].ingresos += t.amount || 0;
    else monthlyMap[month].gastos += t.amount || 0;
  });
  const monthlyData = Object.values(monthlyMap).slice(-6);

  // Chart 6: Balance acumulado (Area)
  let cumulative = 0;
  const balanceData = monthlyData.map(m => {
    cumulative += m.ingresos - m.gastos;
    return { month: m.month, balance: cumulative };
  });

  // ── Generar PDF ──
  const generatePDF = async () => {
    setGenerating(true);

    // Capturar TODAS las gráficas visibles
    const [imgPieTask, imgBarExpense, imgLineFinance, imgBarProject, imgPiePriority, imgAreaBalance] = await Promise.all([
      captureEl(refPieTask),
      captureEl(refBarExpense),
      captureEl(refLineFinance),
      captureEl(refBarProject),
      captureEl(refPiePriority),
      captureEl(refAreaBalance),
    ]);

    // IA análisis especializado
     const ctx = `
    Usuario: ${user?.full_name || "Usuario"}
    Email: ${user?.email || "N/A"}
    Perfil VEXNY: ${activeProfile?.label || "General"}
    Período: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}

    PROYECTOS (${projects.length} total):
    - Activos: ${projects.filter(p => p.status === "active").length}
    - Planificación: ${projects.filter(p => p.status === "planning").length}
    - Completados: ${projects.filter(p => p.status === "completed").length}
    - Pausados: ${projects.filter(p => p.status === "paused").length}

    TAREAS (${tasks.length} total):
    - Completadas: ${tasks.filter(t => t.status === "completed").length} (${completionRate}%)
    - En progreso: ${tasks.filter(t => t.status === "in_progress").length}
    - Pendientes: ${tasks.filter(t => t.status === "pending").length}
    - Críticas: ${tasks.filter(t => t.priority === "critical").length}
    - Alta prioridad: ${tasks.filter(t => t.priority === "high").length}

    FINANZAS:
    - Ingresos totales: ${formatCOP(totalIncome)}
    - Gastos totales: ${formatCOP(totalExpense)}
    - Balance neto: ${formatCOP(balance)}
    - Margen: ${totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0}%
    - Top 3 categorías de gasto: ${expenseData.slice(0, 3).map(d => `${d.name}: ${formatCOP(d.value)}`).join(", ")}

    RESUMEN DE ACTIVIDAD:
    - Proyectos con presupuesto: ${projects.filter(p => p.budget).length}
    - Tareas vencidas/pendientes: ${tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== "completed").length}
    - Transacciones registradas: ${transactions.length}
    `;

     const aiAnalysis = await base44.integrations.Core.InvokeLLM({
       prompt: `Eres el asesor estratégico de VEXNY para ${user?.full_name || "el usuario"}. Con estos datos reales PERSONALIZADOS genera un análisis ejecutivo profundo en 5 párrafos: 1) Resumen de desempeño actual, 2) Análisis de ejecución de proyectos, 3) Productividad y gestión de tareas, 4) Salud financiera y recomendaciones, 5) 3 acciones prioritarias para los próximos 30 días. Sé directo, estratégico, específico y PERSONALIZADO. Sin markdown, solo texto plano:\n\n${ctx}`,
     });

    // ── Construir PDF ──
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 16;
    const CW = PW - M * 2;
    let y = 0;

    const newPage = () => { doc.addPage(); y = 22; };
    const checkY = (needed = 15) => { if (y + needed > PH - 18) newPage(); };
    const addImg = (img, w, h, center = false) => {
      checkY(h + 4);
      const x = center ? M + (CW - w) / 2 : M;
      doc.addImage(img, "PNG", x, y, w, h);
      y += h + 5;
    };

    // ─────── PORTADA ───────
    doc.setFillColor(14, 14, 22);
    doc.rect(0, 0, PW, PH, "F");
    doc.setFillColor(245, 158, 11);
    doc.rect(0, PH * 0.55, PW, 5, "F");

    doc.setTextColor(245, 158, 11);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text("VEXNY", PW / 2, PH * 0.35, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text("Informe Ejecutivo Personalizado", PW / 2, PH * 0.35 + 14, { align: "center" });

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(11);
    doc.text(user?.full_name || "Usuario", PW / 2, PH * 0.35 + 30, { align: "center" });
    doc.setFontSize(9);
    doc.text(activeProfile?.label || "Perfil General", PW / 2, PH * 0.35 + 38, { align: "center" });
    doc.setFontSize(8);
    doc.text(format(new Date(), "d 'de' MMMM yyyy", { locale: es }), PW / 2, PH * 0.35 + 45, { align: "center" });

    doc.setTextColor(245, 158, 11);
    doc.setFontSize(7);
    doc.text("INFORME CONFIDENCIAL", PW / 2, PH - 22, { align: "center" });
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text(user?.email || "email@example.com", PW / 2, PH - 15, { align: "center" });
    doc.text(format(new Date(), "HH:mm", { locale: es }), PW / 2, PH - 8, { align: "center" });

    // ─────── PÁGINA 2: KPIs ───────
    newPage();
    doc.setFillColor(14, 14, 22);
    doc.rect(0, 0, PW, 28, "F");
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 25, PW, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN EJECUTIVO", M, 17);
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${user?.full_name || "Usuario"} · ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, PW - M, 17, { align: "right" });
    y = 36;

    const kpis = [
      { label: "Proyectos Totales", val: String(projects.length), sub: `${projects.filter(p=>p.status==="active").length} activos`, c: [37,99,235] },
      { label: "Tareas Completadas", val: `${completionRate}%`, sub: `${tasks.filter(t=>t.status==="completed").length} de ${tasks.length}`, c: [16,185,129] },
      { label: "Ingresos", val: formatCOP(totalIncome), sub: "total acumulado", c: [16,185,129] },
      { label: "Gastos", val: formatCOP(totalExpense), sub: "total acumulado", c: [239,68,68] },
      { label: "Balance Neto", val: formatCOP(balance), sub: balance >= 0 ? "superávit" : "déficit", c: balance>=0?[245,158,11]:[239,68,68] },
      { label: "Margen", val: totalIncome>0?`${Math.round((balance/totalIncome)*100)}%`:"N/A", sub: "sobre ingresos", c: [139,92,246] },
    ];

    const kW = (CW - 10) / 3;
    const kH = 26;
    kpis.forEach((k, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const kx = M + col * (kW + 5);
      const ky = y + row * (kH + 5);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(kx, ky, kW, kH, 3, 3, "F");
      doc.setDrawColor(...k.c);
      doc.setLineWidth(0.8);
      doc.line(kx + 3, ky + 3, kx + 3, ky + kH - 3);
      doc.setLineWidth(0.2);
      doc.setTextColor(...k.c);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(k.val, kx + 8, ky + 11);
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(k.label, kx + 8, ky + 17);
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.text(k.sub, kx + 8, ky + 21.5);
    });
    y += kH * 2 + 18;

    // ─────── ANÁLISIS IA ───────
    checkY(30);
    y = pdfSection(doc, "Análisis Estratégico IA", [245,158,11], M, y, PH);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(45, 45, 45);
    const aiText = typeof aiAnalysis === "string" ? aiAnalysis : JSON.stringify(aiAnalysis);
    const aiLines = doc.splitTextToSize(aiText, CW);
    aiLines.forEach(line => {
      checkY(5.5);
      doc.text(line, M, y);
      y += 5;
    });
    y += 8;

    // ─────── GRÁFICAS ───────
    checkY(20);
    
    // Gráfica proyectos
    if (imgBarProject) {
      checkY(55);
      addImg(imgBarProject, CW * 0.7, 45, true);
    }

    // 2 gráficas de tareas lado a lado
    if (imgPieTask || imgPiePriority) {
      checkY(65);
      const halfW = (CW - 6) / 2;
      const imgH = halfW * 0.85;
      if (imgPieTask) {
        doc.addImage(imgPieTask, "PNG", M, y, halfW, imgH);
      }
      if (imgPiePriority) {
        doc.addImage(imgPiePriority, "PNG", M + halfW + 6, y, halfW, imgH);
      }
      y += imgH + 7;
    }

    // Gráficas financieras
    if (imgLineFinance) {
      checkY(55);
      addImg(imgLineFinance, CW, 50);
    }
    if (imgAreaBalance) {
      checkY(55);
      addImg(imgAreaBalance, CW, 45);
    }
    if (imgBarExpense) {
      checkY(55);
      addImg(imgBarExpense, CW, 48);
    }

    // ─────── FOOTER en todas las páginas ───────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(14, 14, 22);
      doc.rect(0, PH-13, PW, 13, "F");
      doc.setFillColor(245,158,11);
      doc.rect(0, PH-13, PW, 2, "F");
      doc.setTextColor(150,150,150);
      doc.setFontSize(7);
      doc.setFont("helvetica","normal");
      doc.text("VEXNY · Informe confidencial generado con IA", M, PH-5);
      doc.setTextColor(245,158,11);
      doc.text(`Página ${i} de ${totalPages}`, PW-M, PH-5, {align:"right"});
    }

    doc.save(`informe-vexny-${activeProfile?.label||"general"}-${format(new Date(),"yyyy-MM-dd")}.pdf`);
    setGenerating(false);
  };

  // ── RENDER ──
   return (
     <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <FileText className="w-6 h-6 text-primary flex-shrink-0" />
           <div className="min-w-0">
             <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Informes</h1>
             <p className="text-xs sm:text-sm text-muted-foreground truncate">{activeProfile?.label} · {format(new Date(), "MMMM yyyy", { locale: es })}</p>
           </div>
         </div>
         <Button onClick={generatePDF} disabled={generating} className="gap-2 w-full sm:w-auto">
           {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
           <span className="hidden sm:inline">{generating ? "Generando PDF..." : "Exportar Informe Completo"}</span>
           <span className="sm:hidden">{generating ? "Generando..." : "Exportar"}</span>
         </Button>
       </div>






    </div>
  );
}

import DroneCompanyReport from "./reports/DroneCompanyReport";

export default function Reports() {
  const { activeProfileId } = useProfile();
  if (activeProfileId === "drone_pilot") return <DronePilotReport />;
  if (activeProfileId === "drone_company") return <DroneCompanyReport />;
  return <GenericReport />;
}