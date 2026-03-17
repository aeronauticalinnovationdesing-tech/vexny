import React from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Shield, AlertTriangle } from "lucide-react";
import PriceManager from "@/components/dashboard/PriceManager";

export default function Admin() {
  const user = useCurrentUser();

  if (user?.role !== "admin") {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg">Acceso denegado</h2>
            <p className="text-sm text-muted-foreground mt-1">Solo los administradores pueden acceder a este panel.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
        </div>
        <p className="text-muted-foreground">Configura y gestiona los costos de suscripción de las apps.</p>
      </div>

      <PriceManager />
    </div>
  );
}