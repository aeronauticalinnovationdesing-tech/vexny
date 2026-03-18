import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Eye, Loader2 } from "lucide-react";

export default function MyCoursesPanel({ purchases = [], onView }) {
  const [expandedPdf, setExpandedPdf] = useState(null);

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No has comprado ningún curso aún</p>
        <p className="text-sm mt-1">Explora nuestro catálogo y adquiere cursos profesionales</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="p-4 hover:shadow-lg transition-shadow flex flex-col">
            {/* Header */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-bold text-lg line-clamp-2">{purchase.course_title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Comprado el {new Date(purchase.created_date).toLocaleDateString("es-CO")}
                </p>
              </div>

              {/* Status badge */}
              <Badge className="bg-green-100 text-green-800 border-green-200 w-fit">
                ✓ Acceso disponible
              </Badge>

              {/* Descripción del precio */}
              <p className="text-sm text-muted-foreground">
                Monto pagado: <span className="font-semibold text-foreground">${purchase.amount.toLocaleString("es-CO")} COP</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setExpandedPdf(purchase.id)}
              >
                <Eye className="w-4 h-4" /> Ver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10"
                asChild
              >
                <a href={purchase.pdf_url} download title="Descargar PDF">
                  <Download className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* PDF Viewer Modal */}
      {expandedPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col animate-in fade-in">
          <div className="flex items-center justify-between p-4 bg-card border-b sticky top-0">
            <h2 className="font-semibold text-sm sm:text-base">
              {purchases.find((p) => p.id === expandedPdf)?.course_title}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={purchases.find((p) => p.id === expandedPdf)?.pdf_url}
                  download
                  title="Descargar PDF"
                >
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedPdf(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
          <iframe
            src={purchases.find((p) => p.id === expandedPdf)?.pdf_url}
            className="flex-1 w-full"
            title="PDF Viewer"
          />
        </div>
      )}
    </div>
  );
}