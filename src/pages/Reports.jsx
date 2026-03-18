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
Perfil VEXNY: ${activeProfile?.label || "General"}
Fecha: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}

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
- Top gastos: ${expenseData.slice(0, 3).map(d => `${d.name}: ${formatCOP(d.value)}`).join(", ")}
`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres el asesor estratégico de VEXNY. Con estos datos reales genera un análisis ejecutivo profundo en 5 párrafos: 1) Resumen ejecutivo general, 2) Análisis de proyectos y ejecución, 3) Productividad y gestión de tareas, 4) Salud financiera y recomendaciones, 5) Acciones prioritarias para los próximos 30 días. Sé directo, estratégico y específico. Sin markdown, solo texto plano:\n\n${ctx}`,
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
    doc.text("VEXNY", PW / 2, PH * 0.38, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text("Informe Ejecutivo Completo", PW / 2, PH * 0.38 + 14, { align: "center" });

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(11);
    doc.text(activeProfile?.label || "Perfil General", PW / 2, PH * 0.38 + 26, { align: "center" });
    doc.text(format(new Date(), "d 'de' MMMM yyyy", { locale: es }), PW / 2, PH * 0.38 + 35, { align: "center" });

    doc.setTextColor(245, 158, 11);
    doc.setFontSize(8);
    doc.text("CONFIDENCIAL · Generado automáticamente por VEXNY IA", PW / 2, PH - 20, { align: "center" });
    doc.setTextColor(120, 120, 120);
    doc.text(user?.email || "", PW / 2, PH - 14, { align: "center" });

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
    doc.text(format(new Date(), "d 'de' MMMM yyyy", { locale: es }), PW - M, 17, { align: "right" });
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

    // ─────── PROYECTOS ───────
    checkY(20);
    y = pdfSection(doc, "Análisis de Proyectos", [37,99,235], M, y, PH);

    // Gráfica proyectos por estado
    if (imgBarProject) {
      addImg(imgBarProject, CW * 0.7, 45, true);
    }

    // Tabla proyectos
    if (projects.length > 0) {
      checkY(20);
      const statusLabels = { planning: "Planificación", active: "Activo", paused: "Pausado", completed: "Completado" };
      const prioLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };
      const prioColors = { critical: [239,68,68], high: [245,158,11], medium: [59,130,246], low: [100,116,139] };
      const cols = [58, 28, 22, 34, 30];
      const hdrs = ["Proyecto", "Estado", "Prioridad", "Presupuesto", "Fin"];

      doc.setFillColor(20,20,30);
      doc.rect(M, y, CW, 8, "F");
      doc.setTextColor(255,255,255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      hdrs.forEach((h,i) => { doc.text(h, cx, y+5.5); cx += cols[i]; });
      y += 8;

      projects.slice(0, 20).forEach((p, idx) => {
        checkY(7.5);
        doc.setFillColor(idx%2===0?247:255, idx%2===0?248:255, idx%2===0?251:255);
        doc.rect(M, y, CW, 7, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40,40,40);
        cx = M + 3;
        const pc = prioColors[p.priority] || [100,116,139];
        const row = [
          doc.splitTextToSize(p.name||"", cols[0]-4)[0],
          statusLabels[p.status] || p.status,
          prioLabels[p.priority] || "-",
          p.budget ? formatCOP(p.budget) : "-",
          p.end_date ? format(new Date(p.end_date),"dd/MM/yy") : "-",
        ];
        row.forEach((cell, i) => {
          if (i === 2 && p.priority) {
            doc.setFillColor(...pc);
            doc.roundedRect(cx-1, y+1.5, cols[i]-2, 4.5, 1,1,"F");
            doc.setTextColor(255,255,255);
            doc.setFontSize(6.5);
            doc.text(String(cell), cx + (cols[i]-4)/2, y+5, { align:"center" });
            doc.setFontSize(7.5);
            doc.setTextColor(40,40,40);
          } else {
            doc.text(String(cell), cx, y+4.8);
          }
          cx += cols[i];
        });
        y += 7;
      });
      y += 10;
    }

    // ─────── TAREAS ───────
    checkY(20);
    y = pdfSection(doc, "Análisis de Tareas y Productividad", [16,185,129], M, y, PH);

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

    // Barras de estado
    const statuses = [
      { label: "Completadas", count: tasks.filter(t=>t.status==="completed").length, c:[16,185,129] },
      { label: "En Progreso", count: tasks.filter(t=>t.status==="in_progress").length, c:[245,158,11] },
      { label: "Pendientes", count: tasks.filter(t=>t.status==="pending").length, c:[100,116,139] },
      { label: "Revisión", count: tasks.filter(t=>t.status==="review").length, c:[139,92,246] },
      { label: "Canceladas", count: tasks.filter(t=>t.status==="cancelled").length, c:[239,68,68] },
    ];
    const bW = (CW - 20) / statuses.length;
    const maxC = Math.max(...statuses.map(s=>s.count),1);
    const barH = 22;
    checkY(barH + 15);
    statuses.forEach((s,i) => {
      const bx = M + i*(bW+4);
      const bh = Math.max(2, (s.count/maxC)*barH);
      doc.setFillColor(...s.c);
      doc.roundedRect(bx, y+barH-bh, bW, bh, 1,1,"F");
      doc.setTextColor(40,40,40);
      doc.setFontSize(7);
      doc.setFont("helvetica","bold");
      doc.text(String(s.count), bx+bW/2, y+barH-bh-2, {align:"center"});
      doc.setFont("helvetica","normal");
      doc.text(s.label, bx+bW/2, y+barH+5, {align:"center"});
    });
    y += barH + 14;

    // Tareas activas (tabla)
    const activeTasks = tasks.filter(t=>["pending","in_progress","review"].includes(t.status)).slice(0,15);
    if (activeTasks.length > 0) {
      checkY(20);
      doc.setFontSize(9);
      doc.setFont("helvetica","bold");
      doc.setTextColor(40,40,40);
      doc.text("Tareas Activas", M, y); y += 7;
      const prioColors2 = { critical:[239,68,68], high:[245,158,11], medium:[59,130,246], low:[100,116,139] };
      activeTasks.forEach((t,idx) => {
        checkY(7);
        doc.setFillColor(idx%2===0?247:255,idx%2===0?248:255,idx%2===0?251:255);
        doc.rect(M, y, CW, 6.5, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica","normal");
        doc.setTextColor(40,40,40);
        doc.text(doc.splitTextToSize(t.title||"",130)[0], M+3, y+4.5);
        const pc = prioColors2[t.priority]||[100,116,139];
        doc.setFillColor(...pc);
        doc.roundedRect(PW-M-22, y+1.2, 20, 4, 1,1,"F");
        doc.setTextColor(255,255,255);
        doc.setFontSize(6);
        doc.text((t.priority||"media").toUpperCase(), PW-M-12, y+4.5, {align:"center"});
        y += 6.5;
      });
      y += 8;
    }

    // ─────── FINANZAS ───────
    checkY(20);
    y = pdfSection(doc, "Análisis Financiero", [139,92,246], M, y, PH);

    // Gráficas financieras
    if (imgLineFinance) {
      checkY(55);
      doc.setFontSize(8);
      doc.setFont("helvetica","bold");
      doc.setTextColor(60,60,60);
      doc.text("Ingresos vs Gastos por Mes", M, y); y += 4;
      addImg(imgLineFinance, CW, 50);
    }
    if (imgAreaBalance) {
      checkY(55);
      doc.setFontSize(8);
      doc.setFont("helvetica","bold");
      doc.setTextColor(60,60,60);
      doc.text("Balance Acumulado", M, y); y += 4;
      addImg(imgAreaBalance, CW, 45);
    }
    if (imgBarExpense) {
      checkY(55);
      doc.setFontSize(8);
      doc.setFont("helvetica","bold");
      doc.setTextColor(60,60,60);
      doc.text("Gastos por Categoría", M, y); y += 4;
      addImg(imgBarExpense, CW, 48);
    }

    // Tabla de categorías
    if (expenseData.length > 0) {
      checkY(20);
      doc.setFontSize(9);
      doc.setFont("helvetica","bold");
      doc.setTextColor(40,40,40);
      doc.text("Desglose por Categoría", M, y); y += 7;
      expenseData.slice(0,10).forEach((cat, idx) => {
        checkY(8);
        const pct = totalExpense > 0 ? (cat.value/totalExpense)*100 : 0;
        const bMaxW = CW - 70;
        doc.setFillColor(idx%2===0?247:255,idx%2===0?248:255,idx%2===0?251:255);
        doc.rect(M, y, CW, 7, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica","normal");
        doc.setTextColor(50,50,50);
        doc.text(cat.name, M+3, y+5);
        doc.setFillColor(225,228,235);
        doc.roundedRect(M+38, y+1.5, bMaxW, 4, 1,1,"F");
        const barColor = COLORS[idx % COLORS.length];
        const [r,g,b] = barColor.startsWith('#') ? [parseInt(barColor.slice(1,3),16),parseInt(barColor.slice(3,5),16),parseInt(barColor.slice(5,7),16)] : [245,158,11];
        doc.setFillColor(r,g,b);
        doc.roundedRect(M+38, y+1.5, Math.max(2, (pct/100)*bMaxW), 4, 1,1,"F");
        doc.setTextColor(80,80,80);
        doc.text(`${pct.toFixed(1)}%`, M+38+bMaxW+3, y+5);
        doc.setFont("helvetica","bold");
        doc.text(formatCOP(cat.value), PW-M-3, y+5, {align:"right"});
        y += 7;
      });
      y += 8;
    }

    // Movimientos recientes
    const recent = [...transactions].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,15);
    if (recent.length > 0) {
      checkY(20);
      doc.setFontSize(9);
      doc.setFont("helvetica","bold");
      doc.setTextColor(40,40,40);
      doc.text("Movimientos Recientes", M, y); y += 7;
      const tCols = [55, 28, 28, 38, 28];
      const tHdrs = ["Descripción","Tipo","Categoría","Monto","Fecha"];
      doc.setFillColor(20,20,30);
      doc.rect(M, y, CW, 7.5, "F");
      doc.setTextColor(255,255,255);
      doc.setFontSize(7);
      doc.setFont("helvetica","bold");
      let tx = M+3;
      tHdrs.forEach((h,i) => { doc.text(h, tx, y+5); tx += tCols[i]; });
      y += 7.5;
      recent.forEach((t, idx) => {
        checkY(7);
        doc.setFillColor(idx%2===0?247:255,idx%2===0?248:255,idx%2===0?251:255);
        doc.rect(M, y, CW, 6.5, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica","normal");
        doc.setTextColor(40,40,40);
        tx = M+3;
        const amtColor = t.type==="income"?[16,185,129]:[239,68,68];
        const row = [
          doc.splitTextToSize(t.description||"",50)[0],
          t.type==="income"?"Ingreso":"Gasto",
          t.category||"-",
          `${t.type==="income"?"+":"-"}${formatCOP(t.amount)}`,
          t.date ? format(new Date(t.date),"dd/MM/yy") : "-",
        ];
        row.forEach((cell, i) => {
          if (i===3) doc.setTextColor(...amtColor);
          else doc.setTextColor(40,40,40);
          doc.text(String(cell), tx, y+4.5);
          tx += tCols[i];
        });
        y += 6.5;
      });
      y += 8;
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
            <p className="text-sm text-muted-foreground">{activeProfile?.label} · {format(new Date(), "MMMM yyyy", { locale: es })}</p>
          </div>
        </div>
        <Button onClick={generatePDF} disabled={generating} size="lg" className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? "Generando PDF..." : "Exportar Informe Completo"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:"Proyectos", val: projects.length, sub:`${projects.filter(p=>p.status==="active").length} activos`, icon: FolderKanban, color:"text-blue-500" },
          { label:"Tareas", val: tasks.length, sub:`${completionRate}% completadas`, icon: CheckSquare, color:"text-green-500" },
          { label:"Ingresos", val: formatCOP(totalIncome), sub:"total", icon: TrendingUp, color:"text-green-500" },
          { label:"Gastos", val: formatCOP(totalExpense), sub:"total", icon: TrendingDown, color:"text-red-500" },
          { label:"Balance", val: formatCOP(balance), sub: balance>=0?"superávit":"déficit", icon: Wallet, color: balance>=0?"text-primary":"text-red-500" },
          { label:"Productividad", val:`${completionRate}%`, sub:"tareas hechas", icon: Activity, color:"text-purple-500" },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
            <k.icon className={`w-5 h-5 ${k.color}`} />
            <div className="text-lg font-bold leading-tight">{k.val}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Fila 1: Estado Tareas + Prioridad Tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={refPieTask} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-primary" />Estado de Tareas</h3>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value})=>`${name}: ${value}`} labelLine>
                  {taskStatusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[230px] flex items-center justify-center text-muted-foreground text-sm">Sin datos de tareas</div>}
        </div>

        <div ref={refPiePriority} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Prioridad de Tareas</h3>
          {taskPriorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={taskPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} label={({name,value})=>`${name}: ${value}`}>
                  {taskPriorityData.map((_,i)=><Cell key={i} fill={["#ef4444","#f97316","#3b82f6","#10b981"][i]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[230px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>}
        </div>
      </div>

      {/* Fila 2: Proyectos por estado */}
      <div ref={refBarProject} className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FolderKanban className="w-4 h-4 text-primary" />Estado de Proyectos</h3>
        {projectStatusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectStatusData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,90%)"/>
              <XAxis dataKey="name" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:12}} allowDecimals={false}/>
              <Tooltip/>
              <Bar dataKey="value" name="Proyectos" radius={[6,6,0,0]}>
                {projectStatusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sin datos de proyectos</div>}
      </div>

      {/* Fila 3: Ingresos vs Gastos (Line) */}
      <div ref={refLineFinance} className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" />Ingresos vs Gastos Mensuales</h3>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,90%)"/>
              <XAxis dataKey="month" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>formatCOP(v).replace("COP","").trim()}/>
              <Tooltip formatter={v=>formatCOP(v)}/>
              <Legend/>
              <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2.5} dot={{r:4}} name="Ingresos"/>
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2.5} dot={{r:4}} name="Gastos"/>
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="h-[230px] flex items-center justify-center text-muted-foreground text-sm">Sin datos financieros mensuales</div>}
      </div>

      {/* Fila 4: Balance Acumulado (Area) + Gastos por Categoría (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={refAreaBalance} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Balance Acumulado</h3>
          {balanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,90%)"/>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} tickFormatter={v=>formatCOP(v).replace("COP","").trim()}/>
                <Tooltip formatter={v=>formatCOP(v)}/>
                <Area type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2.5} fill="url(#balGrad)" name="Balance"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>}
        </div>

        <div ref={refBarExpense} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />Gastos por Categoría</h3>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,90%)"/>
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>formatCOP(v).replace("COP","").trim()}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={70}/>
                <Tooltip formatter={v=>formatCOP(v)}/>
                <Bar dataKey="value" name="Gasto" radius={[0,4,4,0]}>
                  {expenseData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sin datos de gastos</div>}
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { activeProfileId } = useProfile();
  if (activeProfileId === "drone_pilot") return <DronePilotReport />;
  return <GenericReport />;
}