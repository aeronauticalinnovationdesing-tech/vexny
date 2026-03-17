import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { jsPDF } from "jspdf";

const formatCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

export default function ReportExporter({ transactions, trades }) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateMetrics = () => {
    const wins = transactions.filter(t => t.type === "income");
    const losses = transactions.filter(t => t.type === "expense");
    const totalWin = wins.reduce((s, t) => s + t.amount, 0);
    const totalLoss = losses.reduce((s, t) => s + t.amount, 0);
    const pnl = totalWin - totalLoss;
    const winRate = transactions.length > 0 ? ((wins.length / transactions.length) * 100).toFixed(2) : 0;
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : "∞";

    return { totalWin, totalLoss, pnl, winRate, profitFactor, wins: wins.length, losses: losses.length };
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const metrics = calculateMetrics();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.text("Reporte de Trading", 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 20, yPos);
      yPos += 15;

      // Summary Section
      doc.setFontSize(14);
      doc.text("Resumen de Desempeño", 20, yPos);
      yPos += 10;

      const summaryData = [
        ["Métrica", "Valor"],
        ["P&L Total", formatCOP(metrics.pnl)],
        ["Win Rate", `${metrics.winRate}%`],
        ["Profit Factor", metrics.profitFactor],
        ["Ganancias Totales", formatCOP(metrics.totalWin)],
        ["Pérdidas Totales", formatCOP(metrics.totalLoss)],
        ["Operaciones Ganadoras", metrics.wins],
        ["Operaciones Perdedoras", metrics.losses],
      ];

      doc.autoTable({
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        margin: { left: 20, right: 20 },
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Trades Section
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Historial de Operaciones", 20, yPos);
      yPos += 10;

      const tradesData = [
        ["Fecha", "Tipo", "Descripción", "Monto"],
        ...transactions.slice(0, 15).map(t => [
          new Date(t.date).toLocaleDateString("es-CO"),
          t.type === "income" ? "LONG ✓" : "SHORT ✗",
          t.description.substring(0, 30),
          formatCOP(t.amount),
        ]),
      ];

      doc.autoTable({
        startY: yPos,
        head: [tradesData[0]],
        body: tradesData.slice(1),
        margin: { left: 20, right: 20 },
        theme: "grid",
      });

      doc.save(`Trading_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  const handleExport = async () => {
    await exportPDF();
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} variant="outline" className="gap-2" disabled={transactions.length === 0}>
        <Download className="w-4 h-4" /> Exportar Reporte
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar Reporte de Trading (PDF)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Se generará un reporte con resumen de desempeño e historial de las últimas 15 operaciones.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}