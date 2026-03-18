import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import {
  Download, Loader2, Plane, Shield, Wrench, AlertTriangle,
  Clock, Users, FileText, Activity, CheckCircle, XCircle, BarChart2
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4"];

const captureEl = async (ref) => {
  if (!ref?.current) return null;
  try {
    const canvas = await html2canvas(ref.current, {
      backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true,
    });
    return canvas.toDataURL("image/png");
  } catch { return null; }
};

const pdfHeader = (doc, title, PW, PH, M) => {
  doc.setFillColor(10, 20, 40);
  doc.rect(0, 0, PW, 26, "F");
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 23, PW, 3, "F");
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VEXNY · PILOTO DE DRON", M, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(title, M, 20);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "d 'de' MMMM yyyy", { locale: es }), PW - M, 20, { align: "right" });
};

const pdfSec = (doc, title, color, M, y, PH) => {
  if (y + 20 > PH - 18) { doc.addPage(); y = 30; }
  doc.setFillColor(...color);
  doc.rect(M, y, 3, 9, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, M + 7, y + 6.5);
  doc.setFillColor(...color, 30);
  return y + 14;
};

const kpiBox = (doc, label, val, sub, color, kx, ky, kW, kH) => {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kx, ky, kW, kH, 3, 3, "F");
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.line(kx + 3, ky + 3, kx + 3, ky + kH - 3);
  doc.setLineWidth(0.2);
  doc.setTextColor(...color);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(String(val), kx + 8, ky + 10);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(label, kx + 8, ky + 16);
  doc.setTextColor(130, 130, 130);
  doc.setFont("helvetica", "normal");
  doc.text(sub, kx + 8, ky + 20.5);
};

export default function DronePilotReport() {
  const [generating, setGenerating] = useState(false);
  const user = useCurrentUser();



  // ── Data queries ──
  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots", user?.email],
    queryFn: () => base44.entities.Pilot.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: drones = [] } = useQuery({
    queryKey: ["drones", user?.email],
    queryFn: () => base44.entities.Drone.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: smsReports = [] } = useQuery({
    queryKey: ["smsReports", user?.email],
    queryFn: () => base44.entities.SMSReport.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: policies = [] } = useQuery({
    queryKey: ["policies", user?.email],
    queryFn: () => base44.entities.MaintenancePolicy.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const { data: missions = [] } = useQuery({
    queryKey: ["missions_drone", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email, profile_id: "drone_pilot" }),
    enabled: !!user,
  });
  const { data: flights = [] } = useQuery({
    queryKey: ["flights_drone", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email, profile_id: "drone_pilot" }),
    enabled: !!user,
  });

  // ── Métricas clave ──
  const totalFlightHours = pilots.reduce((s, p) => s + (p.hours_flown || 0), 0);
  const activePilots = pilots.filter(p => p.status === "activo").length;
  const dronesOperative = drones.filter(d => d.maintenance_status === "operativo").length;
  const totalDroneHours = drones.reduce((s, d) => s + (d.flight_hours || 0), 0);

  // Vencimientos críticos (próximos 30 días o ya vencidos)
  const today = new Date();
  const criticalPilots = pilots.filter(p => {
    if (!p.rac_100_expiry_date) return false;
    const exp = new Date(p.rac_100_expiry_date);
    const days = differenceInDays(exp, today);
    return days <= 30;
  });
  const criticalDrones = drones.filter(d => {
    if (!d.registration_expiry) return false;
    const days = differenceInDays(new Date(d.registration_expiry), today);
    return days <= 30;
  });
  const criticalPolicies = policies.filter(p => {
    if (!p.expiry_date) return false;
    const days = differenceInDays(new Date(p.expiry_date), today);
    return days <= 30;
  });

  // Incidentes SMS
  const incidents = smsReports.filter(r => r.incident_reported);
  const totalFlightMinutes = smsReports.reduce((s, r) => s + (r.flight_duration_minutes || 0), 0);

  // Chart: Estado pilotos
  const pilotStatusData = [
    { name: "Activos", value: pilots.filter(p => p.status === "activo").length },
    { name: "Inactivos", value: pilots.filter(p => p.status === "inactivo").length },
    { name: "Suspendidos", value: pilots.filter(p => p.status === "suspendido").length },
  ].filter(d => d.value > 0);

  // Chart: Estado drones
  const droneStatusData = [
    { name: "Operativos", value: drones.filter(d => d.maintenance_status === "operativo").length },
    { name: "En Mantenimiento", value: drones.filter(d => d.maintenance_status === "en_mantenimiento").length },
    { name: "No Operativos", value: drones.filter(d => d.maintenance_status === "no_operativo").length },
  ].filter(d => d.value > 0);

  // Chart: Área de vuelo SMS
  const flightAreaData = [
    { name: "Rural", value: smsReports.filter(r => r.area_type === "rural").length },
    { name: "Suburbana", value: smsReports.filter(r => r.area_type === "suburbana").length },
    { name: "Urbana", value: smsReports.filter(r => r.area_type === "urbana").length },
  ].filter(d => d.value > 0);

  // Chart: SMS por mes (últimos 6)
  const smsMonthMap = {};
  smsReports.forEach(r => {
    if (!r.report_date) return;
    const m = format(new Date(r.report_date), "MMM yy", { locale: es });
    if (!smsMonthMap[m]) smsMonthMap[m] = { mes: m, vuelos: 0, incidentes: 0, minutos: 0 };
    smsMonthMap[m].vuelos++;
    if (r.incident_reported) smsMonthMap[m].incidentes++;
    smsMonthMap[m].minutos += r.flight_duration_minutes || 0;
  });
  const smsMonthData = Object.values(smsMonthMap).slice(-6);

  // Chart: Pólizas por cobertura
  const policyTypeData = [
    { name: "Básica", value: policies.filter(p => p.coverage_type === "basica").length },
    { name: "Completa", value: policies.filter(p => p.coverage_type === "completa").length },
    { name: "Premium", value: policies.filter(p => p.coverage_type === "premium").length },
  ].filter(d => d.value > 0);

  // Chart: Horas de vuelo por dron
  const droneHoursData = drones
    .filter(d => d.flight_hours > 0)
    .map(d => ({ name: d.model || d.serial_number, horas: d.flight_hours || 0 }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 8);

  // ── GENERAR PDF ──
  const generatePDF = async () => {
    setGenerating(true);

    const [imgPilot, imgDrone, imgArea, imgSms, imgPolicies, imgHours] = [null, null, null, null, null, null];

    // Análisis IA especializado para dron
    const pilotRac = pilots.map(p => `${p.full_name} [${p.license_category}] – Vence RAC: ${p.rac_100_expiry_date || "N/A"} – ${p.hours_flown || 0}h`).join("\n");
    const droneList = drones.map(d => `${d.model} (${d.serial_number}) – ${d.maintenance_status} – ${d.flight_hours || 0}h – Vence registro: ${d.registration_expiry || "N/A"}`).join("\n");
    const smsSummary = `Total reportes: ${smsReports.length}, Incidentes: ${incidents.length}, Minutos totales: ${totalFlightMinutes}, Área urbana: ${smsReports.filter(r => r.area_type === "urbana").length}, Rural: ${smsReports.filter(r => r.area_type === "rural").length}`;

    const ctx = `
OPERACIÓN DE DRONES – INFORME RAC 100
Fecha: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
Generado por: ${user?.full_name || user?.email}

PILOTOS (${pilots.length} total, ${activePilots} activos):
${pilotRac || "Sin pilotos registrados"}
Pilotos con RAC 100 por vencer (≤30 días): ${criticalPilots.length}

FLOTA DE DRONES (${drones.length} total, ${dronesOperative} operativos):
${droneList || "Sin drones registrados"}
Drones con registro por vencer: ${criticalDrones.length}
Total horas flota: ${totalDroneHours}h

REPORTES SMS (${smsReports.length} total):
${smsSummary}
Tasa de incidentes: ${smsReports.length > 0 ? ((incidents.length / smsReports.length) * 100).toFixed(1) : 0}%

PÓLIZAS MANTENIMIENTO (${policies.length} total):
Pólizas vencidas o próximas a vencer: ${criticalPolicies.length}

MISIONES (${missions.length} total):
Activas: ${missions.filter(m => m.status === "active").length}
Completadas: ${missions.filter(m => m.status === "completed").length}
`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un experto en operaciones de drones bajo la regulación RAC 100 de Colombia (UAEAC). Con los siguientes datos reales de la operación, genera un análisis ejecutivo técnico-operacional en 5 secciones (texto plano, sin markdown, sin asteriscos):

1. ESTADO OPERACIONAL GENERAL: evalúa la salud de la flota y el equipo humano
2. CUMPLIMIENTO REGULATORIO RAC 100: analiza vencimientos críticos, pilotos con documentación próxima a vencer, estado de registros
3. ANÁLISIS DE SEGURIDAD Y SMS: evaluá la tasa de incidentes, zonas de vuelo, tendencias de riesgo
4. ESTADO DE FLOTA Y MANTENIMIENTO: análisis de horas de vuelo, drones en mantenimiento, pólizas
5. RECOMENDACIONES PRIORITARIAS: mínimo 5 acciones concretas para los próximos 30 días

Datos:
${ctx}`,
      model: "claude_sonnet_4_6",
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 16;
    const CW = PW - M * 2;
    let y = 0;

    const checkY = (n = 15) => { if (y + n > PH - 18) { doc.addPage(); y = 30; pdfHeader(doc, "", PW, PH, M); } };
    const addImg = (img, w, h, cx = false) => {
      checkY(h + 4);
      const ix = cx ? M + (CW - w) / 2 : M;
      doc.addImage(img, "PNG", ix, y, w, h);
      y += h + 5;
    };

    // ─── PORTADA ───
    doc.setFillColor(10, 20, 40);
    doc.rect(0, 0, PW, PH, "F");
    // Línea azul cielo
    doc.setFillColor(14, 165, 233);
    doc.rect(0, PH * 0.52, PW, 6, "F");
    // Ícono dron (círculo)
    doc.setFillColor(14, 165, 233);
    doc.circle(PW / 2, PH * 0.30, 18, "F");
    doc.setFillColor(10, 20, 40);
    doc.circle(PW / 2, PH * 0.30, 12, "F");
    doc.setFillColor(14, 165, 233);
    doc.circle(PW / 2, PH * 0.30, 4, "F");

    doc.setTextColor(14, 165, 233);
    doc.setFontSize(34);
    doc.setFont("helvetica", "bold");
    doc.text("VEXNY", PW / 2, PH * 0.44, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "normal");
    doc.text("Informe Operacional de Drones", PW / 2, PH * 0.44 + 13, { align: "center" });
    doc.setTextColor(180, 200, 220);
    doc.setFontSize(10);
    doc.text("RAC 100 · Aeronáutica Civil de Colombia", PW / 2, PH * 0.44 + 23, { align: "center" });
    doc.text(format(new Date(), "d 'de' MMMM yyyy", { locale: es }), PW / 2, PH * 0.44 + 32, { align: "center" });
    doc.setTextColor(14, 165, 233);
    doc.setFontSize(7.5);
    doc.text("CONFIDENCIAL · Generado automáticamente con IA por VEXNY", PW / 2, PH - 20, { align: "center" });
    doc.setTextColor(120, 140, 160);
    doc.text(user?.email || "", PW / 2, PH - 14, { align: "center" });

    // ─── PÁG 2: KPIs ───
    doc.addPage(); y = 30;
    pdfHeader(doc, "RESUMEN OPERACIONAL EJECUTIVO", PW, PH, M);

    const kpis = [
      { label: "Pilotos Activos", val: `${activePilots}/${pilots.length}`, sub: "certificados RAC 100", c: [14, 165, 233] },
      { label: "Horas de Vuelo", val: `${totalFlightHours}h`, sub: "total equipo", c: [16, 185, 129] },
      { label: "Drones Operativos", val: `${dronesOperative}/${drones.length}`, sub: "flota disponible", c: [245, 158, 11] },
      { label: "Horas Flota", val: `${totalDroneHours}h`, sub: "total acumulado", c: [139, 92, 246] },
      { label: "Reportes SMS", val: smsReports.length, sub: `${incidents.length} incidentes`, c: incidents.length > 0 ? [239, 68, 68] : [16, 185, 129] },
      { label: "Alertas Críticas", val: criticalPilots.length + criticalDrones.length + criticalPolicies.length, sub: "vencimientos ≤30 días", c: (criticalPilots.length + criticalDrones.length + criticalPolicies.length) > 0 ? [239, 68, 68] : [16, 185, 129] },
    ];

    const kW = (CW - 10) / 3;
    const kH = 28;
    kpis.forEach((k, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      kpiBox(doc, k.label, k.val, k.sub, k.c, M + col * (kW + 5), y + row * (kH + 5), kW, kH);
    });
    y += kH * 2 + 20;

    // Alertas críticas en PDF
    const allAlerts = [
      ...criticalPilots.map(p => ({
        tipo: "PILOTO",
        nombre: p.full_name,
        detalle: `RAC 100 vence: ${p.rac_100_expiry_date}`,
        urgente: isPast(new Date(p.rac_100_expiry_date)),
        c: [239, 68, 68],
      })),
      ...criticalDrones.map(d => ({
        tipo: "DRON",
        nombre: `${d.model} (${d.serial_number})`,
        detalle: `Registro vence: ${d.registration_expiry}`,
        urgente: isPast(new Date(d.registration_expiry)),
        c: [245, 158, 11],
      })),
      ...criticalPolicies.map(p => ({
        tipo: "PÓLIZA",
        nombre: p.policy_number,
        detalle: `Vence: ${p.expiry_date}`,
        urgente: isPast(new Date(p.expiry_date)),
        c: [239, 68, 68],
      })),
    ];

    if (allAlerts.length > 0) {
      checkY(20);
      doc.setFillColor(255, 243, 205);
      doc.roundedRect(M, y, CW, 8, 2, 2, "F");
      doc.setTextColor(180, 80, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`⚠  ${allAlerts.length} ALERTAS CRÍTICAS – ACCIÓN REQUERIDA`, M + 4, y + 5.5);
      y += 11;
      allAlerts.slice(0, 10).forEach((a, idx) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 248 : 245, idx % 2 === 0 ? 240 : 240);
        doc.rect(M, y, CW, 6.5, "F");
        doc.setFillColor(...a.c);
        doc.roundedRect(M + 1, y + 1.2, 14, 4.5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.text(a.tipo, M + 8, y + 4.3, { align: "center" });
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(7);
        doc.text(a.nombre, M + 18, y + 4.5);
        doc.setTextColor(100, 100, 100);
        doc.text(a.detalle, M + 18, y + 4.5 + 0, { align: "left" });
        // Right side
        doc.setTextColor(a.urgente ? 180 : 100, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.text(a.urgente ? "VENCIDO" : "POR VENCER", PW - M - 3, y + 4.5, { align: "right" });
        y += 6.5;
      });
      y += 10;
    }

    // ─── ANÁLISIS IA ───
    checkY(30);
    y = pdfSec(doc, "Análisis Operacional Estratégico (IA)", [14, 165, 233], M, y, PH);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const aiText = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
    // Dividir por secciones numeradas para resaltarlas
    const aiLines = doc.splitTextToSize(aiText, CW);
    aiLines.forEach(line => {
      checkY(5.5);
      const trimmed = line.trim();
      const isTitle = /^\d+\.\s+[A-ZÁÉÍÓÚ]/.test(trimmed);
      if (isTitle) {
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(14, 165, 233);
        doc.setFontSize(8.5);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(45, 45, 45);
        doc.setFontSize(8);
      }
      doc.text(line, M, y);
      y += 5;
    });
    y += 10;

    // ─── PILOTOS ───
    checkY(20);
    y = pdfSec(doc, "Estado del Equipo de Pilotos", [14, 165, 233], M, y, PH);

    if (imgPilot) { addImg(imgPilot, CW * 0.6, 44, true); }

    // Tabla pilotos
    if (pilots.length > 0) {
      checkY(20);
      const pHdrs = ["Piloto", "Categoría", "Fase RAC 100", "Horas", "Vence RAC", "Estado"];
      const pCols = [44, 26, 28, 16, 22, 18];
      doc.setFillColor(10, 20, 40);
      doc.rect(M, y, CW, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      pHdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += pCols[i]; });
      y += 7.5;

      const phaseLabel = { solicitud: "Solicitud", evaluacion: "Evaluación", capacitacion: "Capacitación", examen: "Examen", certificacion: "Certificación", licencia_emitida: "Licenciado" };
      const catLabel = { operador_remoto: "Op. Remoto", piloto_basico: "Básico", piloto_avanzado: "Avanzado" };

      pilots.slice(0, 25).forEach((p, idx) => {
        checkY(7);
        const expDate = p.rac_100_expiry_date ? new Date(p.rac_100_expiry_date) : null;
        const daysLeft = expDate ? differenceInDays(expDate, today) : 999;
        const expired = daysLeft < 0;
        const warn = daysLeft >= 0 && daysLeft <= 30;
        doc.setFillColor(expired ? 255 : idx % 2 === 0 ? 247 : 255, expired ? 235 : idx % 2 === 0 ? 249 : 255, expired ? 235 : idx % 2 === 0 ? 252 : 255);
        doc.rect(M, y, CW, 6.5, "F");
        cx = M + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const stColor = p.status === "activo" ? [16, 185, 129] : p.status === "suspendido" ? [239, 68, 68] : [100, 116, 139];
        const racColor = expired ? [239, 68, 68] : warn ? [245, 158, 11] : [16, 185, 129];
        const rows = [
          doc.splitTextToSize(p.full_name || "", pCols[0] - 3)[0],
          catLabel[p.license_category] || p.license_category || "-",
          phaseLabel[p.rac_100_phase] || p.rac_100_phase || "-",
          `${p.hours_flown || 0}h`,
          p.rac_100_expiry_date ? format(new Date(p.rac_100_expiry_date), "dd/MM/yy") : "-",
          p.status || "-",
        ];
        rows.forEach((cell, i) => {
          if (i === 4) doc.setTextColor(...racColor);
          else if (i === 5) doc.setTextColor(...stColor);
          else doc.setTextColor(40, 40, 40);
          doc.text(String(cell), cx, y + 4.5);
          cx += pCols[i];
        });
        y += 6.5;
      });
      y += 10;
    }

    // ─── DRONES ───
    checkY(20);
    y = pdfSec(doc, "Flota de Drones y Estado Operativo", [16, 185, 129], M, y, PH);

    if (imgDrone || imgHours) {
      checkY(52);
      const halfW = (CW - 5) / 2;
      if (imgDrone) doc.addImage(imgDrone, "PNG", M, y, halfW, 45);
      if (imgHours) doc.addImage(imgHours, "PNG", M + halfW + 5, y, halfW, 45);
      y += 50;
    }

    // Tabla drones
    if (drones.length > 0) {
      checkY(20);
      const dHdrs = ["Modelo", "Serie", "Estado", "Horas", "Reg. Vence", "Seguro Vence"];
      const dCols = [34, 30, 24, 14, 22, 24];
      doc.setFillColor(10, 20, 40);
      doc.rect(M, y, CW, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      dHdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += dCols[i]; });
      y += 7.5;

      const stColors = { operativo: [16, 185, 129], en_mantenimiento: [245, 158, 11], no_operativo: [239, 68, 68] };
      const stLabels = { operativo: "Operativo", en_mantenimiento: "Mantenimiento", no_operativo: "No Operativo" };

      drones.slice(0, 20).forEach((d, idx) => {
        checkY(7);
        const regExp = d.registration_expiry ? new Date(d.registration_expiry) : null;
        const regDays = regExp ? differenceInDays(regExp, today) : 999;
        doc.setFillColor(idx % 2 === 0 ? 247 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(M, y, CW, 6.5, "F");
        cx = M + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const sc = stColors[d.maintenance_status] || [100, 116, 139];
        const rc = regDays < 0 ? [239, 68, 68] : regDays <= 30 ? [245, 158, 11] : [40, 40, 40];
        const rows = [
          doc.splitTextToSize(d.model || "-", dCols[0] - 2)[0],
          doc.splitTextToSize(d.serial_number || "-", dCols[1] - 2)[0],
          stLabels[d.maintenance_status] || d.maintenance_status,
          `${d.flight_hours || 0}h`,
          d.registration_expiry ? format(new Date(d.registration_expiry), "dd/MM/yy") : "-",
          d.insurance_expiry ? format(new Date(d.insurance_expiry), "dd/MM/yy") : "-",
        ];
        rows.forEach((cell, i) => {
          if (i === 2) doc.setTextColor(...sc);
          else if (i === 4) doc.setTextColor(...rc);
          else doc.setTextColor(40, 40, 40);
          doc.text(String(cell), cx, y + 4.5);
          cx += dCols[i];
        });
        y += 6.5;
      });
      y += 10;
    }

    // ─── SMS / SEGURIDAD ───
    checkY(20);
    y = pdfSec(doc, "Sistema de Gestión de Seguridad (SMS)", [239, 68, 68], M, y, PH);

    // Gráficas SMS
    if (imgSms || imgArea) {
      checkY(55);
      const halfW = (CW - 5) / 2;
      if (imgSms) doc.addImage(imgSms, "PNG", M, y, halfW, 48);
      if (imgArea) doc.addImage(imgArea, "PNG", M + halfW + 5, y, halfW, 48);
      y += 53;
    }

    // Métricas SMS
    const smsKpis = [
      { label: "Total Reportes", val: smsReports.length, c: [14, 165, 233] },
      { label: "Incidentes", val: incidents.length, c: [239, 68, 68] },
      { label: "Tasa Incidentes", val: `${smsReports.length > 0 ? ((incidents.length / smsReports.length) * 100).toFixed(1) : 0}%`, c: incidents.length > 0 ? [239, 68, 68] : [16, 185, 129] },
      { label: "Horas Vuelo SMS", val: `${(totalFlightMinutes / 60).toFixed(1)}h`, c: [16, 185, 129] },
    ];
    const smW = (CW - 15) / 4;
    checkY(28);
    smsKpis.forEach((k, i) => {
      kpiBox(doc, k.label, k.val, "reportes SMS", k.c, M + i * (smW + 5), y, smW, 26);
    });
    y += 32;

    // Tabla incidentes SMS
    if (incidents.length > 0) {
      checkY(20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Incidentes Reportados", M, y); y += 7;
      const iHdrs = ["Fecha", "Piloto", "Dron", "Área", "Descripción"];
      const iCols = [22, 35, 30, 18, 68];
      doc.setFillColor(180, 30, 30);
      doc.rect(M, y, CW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      iHdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += iCols[i]; });
      y += 7;

      incidents.slice(0, 15).forEach((r, idx) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 255 : 254, idx % 2 === 0 ? 245 : 244, idx % 2 === 0 ? 245 : 244);
        doc.rect(M, y, CW, 6.5, "F");
        cx = M + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const row = [
          r.report_date ? format(new Date(r.report_date), "dd/MM/yy") : "-",
          doc.splitTextToSize(r.pilot_name || "-", iCols[1] - 3)[0],
          doc.splitTextToSize(r.drone_model || "-", iCols[2] - 3)[0],
          r.area_type || "-",
          doc.splitTextToSize(r.incident_description || "Sin descripción", iCols[4] - 3)[0],
        ];
        row.forEach((cell, i) => {
          doc.text(String(cell), cx, y + 4.5);
          cx += iCols[i];
        });
        y += 6.5;
      });
      y += 10;
    }

    // ─── PÓLIZAS ───
    checkY(20);
    y = pdfSec(doc, "Pólizas de Seguro y Mantenimiento", [139, 92, 246], M, y, PH);

    if (imgPolicies) { addImg(imgPolicies, CW * 0.6, 44, true); }

    if (policies.length > 0) {
      checkY(20);
      const polHdrs = ["Póliza", "Proveedor", "Cobertura", "Inicio", "Vence", "Estado"];
      const polCols = [28, 32, 22, 20, 20, 20];
      doc.setFillColor(10, 20, 40);
      doc.rect(M, y, CW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      polHdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += polCols[i]; });
      y += 7;

      const polColors = { activa: [16, 185, 129], vencida: [239, 68, 68], cancelada: [100, 116, 139] };
      policies.slice(0, 20).forEach((p, idx) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 247 : 255, idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(M, y, CW, 6.5, "F");
        cx = M + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const sc = polColors[p.status] || [100, 116, 139];
        const expD = p.expiry_date ? differenceInDays(new Date(p.expiry_date), today) : 999;
        const ec = expD < 0 ? [239, 68, 68] : expD <= 30 ? [245, 158, 11] : [40, 40, 40];
        const rows = [
          doc.splitTextToSize(p.policy_number || "-", polCols[0] - 2)[0],
          doc.splitTextToSize(p.provider || "-", polCols[1] - 2)[0],
          p.coverage_type || "-",
          p.start_date ? format(new Date(p.start_date), "dd/MM/yy") : "-",
          p.expiry_date ? format(new Date(p.expiry_date), "dd/MM/yy") : "-",
          p.status || "-",
        ];
        rows.forEach((cell, i) => {
          if (i === 4) doc.setTextColor(...ec);
          else if (i === 5) doc.setTextColor(...sc);
          else doc.setTextColor(40, 40, 40);
          doc.text(String(cell), cx, y + 4.5);
          cx += polCols[i];
        });
        y += 6.5;
      });
      y += 10;
    }

    // ─── MISIONES ───
    if (missions.length > 0) {
      checkY(20);
      y = pdfSec(doc, "Misiones y Proyectos de Vuelo", [245, 158, 11], M, y, PH);
      const mHdrs = ["Misión", "Estado", "Prioridad", "Inicio", "Fin", "Presupuesto"];
      const mCols = [50, 24, 20, 20, 20, 30];
      doc.setFillColor(10, 20, 40);
      doc.rect(M, y, CW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = M + 3;
      mHdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += mCols[i]; });
      y += 7;

      const msColors = { planning: [100, 116, 139], active: [14, 165, 233], paused: [245, 158, 11], completed: [16, 185, 129] };
      const msLabels = { planning: "Planificación", active: "Activa", paused: "Pausada", completed: "Completada" };
      missions.slice(0, 20).forEach((m, idx) => {
        checkY(7);
        doc.setFillColor(idx % 2 === 0 ? 247 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 252 : 255);
        doc.rect(M, y, CW, 6.5, "F");
        cx = M + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const mc = msColors[m.status] || [100, 116, 139];
        const rows = [
          doc.splitTextToSize(m.name || "-", mCols[0] - 2)[0],
          msLabels[m.status] || m.status,
          m.priority || "-",
          m.start_date ? format(new Date(m.start_date), "dd/MM/yy") : "-",
          m.end_date ? format(new Date(m.end_date), "dd/MM/yy") : "-",
          m.budget ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(m.budget) : "-",
        ];
        rows.forEach((cell, i) => {
          if (i === 1) doc.setTextColor(...mc);
          else doc.setTextColor(40, 40, 40);
          doc.text(String(cell), cx, y + 4.5);
          cx += mCols[i];
        });
        y += 6.5;
      });
      y += 10;
    }

    // ─── FOOTER ───
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFillColor(10, 20, 40);
      doc.rect(0, PH - 12, PW, 12, "F");
      doc.setFillColor(14, 165, 233);
      doc.rect(0, PH - 12, PW, 2, "F");
      doc.setTextColor(140, 160, 180);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("VEXNY · Informe Operacional Drones · RAC 100 Colombia · Confidencial", M, PH - 4);
      doc.setTextColor(14, 165, 233);
      doc.text(`Pág. ${i} / ${total}`, PW - M, PH - 4, { align: "right" });
    }

    doc.save(`informe-dron-vexny-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setGenerating(false);
  };

  const StatCard = ({ label, val, sub, color, icon: Icon }) => (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
      <Icon className={`w-5 h-5 ${color}`} />
      <div className="text-xl font-bold leading-tight">{val}</div>
      <div className="text-xs font-medium text-foreground/70">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );

  const AlertBadge = ({ days, label }) => {
    if (days === null || days === undefined) return null;
    if (days < 0) return <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">VENCIDO</span>;
    if (days <= 7) return <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Vence en {days}d</span>;
    if (days <= 30) return <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Vence en {days}d</span>;
    return <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">Vigente</span>;
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Plane className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Informe Operacional</h1>
            <p className="text-sm text-muted-foreground">Piloto de Dron · RAC 100 · {format(new Date(), "MMMM yyyy", { locale: es })}</p>
          </div>
        </div>
        <Button onClick={generatePDF} disabled={generating} size="lg" className="gap-2 bg-sky-600 hover:bg-sky-700">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? "Generando PDF..." : "Exportar Informe Completo"}
        </Button>
      </div>

      {/* Alertas críticas */}
      {(criticalPilots.length > 0 || criticalDrones.length > 0 || criticalPolicies.length > 0) && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {criticalPilots.length + criticalDrones.length + criticalPolicies.length} alertas críticas — acción requerida
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {criticalPilots.length > 0 && `${criticalPilots.length} pilotos con RAC 100 por vencer. `}
              {criticalDrones.length > 0 && `${criticalDrones.length} drones con registro por vencer. `}
              {criticalPolicies.length > 0 && `${criticalPolicies.length} pólizas por vencer.`}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Pilotos Activos" val={`${activePilots}/${pilots.length}`} sub="certificados RAC 100" color="text-sky-500" icon={Users} />
        <StatCard label="Horas Equipo" val={`${totalFlightHours}h`} sub="total acumulado" color="text-green-500" icon={Clock} />
        <StatCard label="Drones Op." val={`${dronesOperative}/${drones.length}`} sub="operativos" color="text-amber-500" icon={Activity} />
        <StatCard label="Horas Flota" val={`${totalDroneHours}h`} sub="acumuladas" color="text-purple-500" icon={BarChart2} />
        <StatCard label="Reportes SMS" val={smsReports.length} sub={`${incidents.length} incidentes`} color={incidents.length > 0 ? "text-red-500" : "text-green-500"} icon={FileText} />
        <StatCard label="Alertas" val={criticalPilots.length + criticalDrones.length + criticalPolicies.length} sub="documentos ≤30d" color={(criticalPilots.length + criticalDrones.length + criticalPolicies.length) > 0 ? "text-red-500" : "text-green-500"} icon={AlertTriangle} />
      </div>



      {/* Tabla pilotos con alertas */}
      {pilots.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-sky-500" />Estado Documental Pilotos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium">Piloto</th>
                  <th className="text-left px-3 py-2 font-medium">Categoría</th>
                  <th className="text-left px-3 py-2 font-medium">Horas</th>
                  <th className="text-left px-3 py-2 font-medium">RAC 100</th>
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((p, i) => {
                  const expDate = p.rac_100_expiry_date ? new Date(p.rac_100_expiry_date) : null;
                  const days = expDate ? differenceInDays(expDate, today) : null;
                  return (
                    <tr key={p.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="px-3 py-2 font-medium">{p.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground capitalize">{p.license_category?.replace("_", " ")}</td>
                      <td className="px-3 py-2">{p.hours_flown || 0}h</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{p.rac_100_expiry_date || "N/A"}</span>
                          <AlertBadge days={days} />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "activo" ? "bg-green-100 text-green-700" : p.status === "suspendido" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {p.status || "–"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}