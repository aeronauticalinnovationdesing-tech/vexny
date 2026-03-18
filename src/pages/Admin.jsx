import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PriceManager from "@/components/dashboard/PriceManager";
import SubscriptionsTable from "@/components/dashboard/SubscriptionsTable";

export default function Admin() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleSeedData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await base44.functions.invoke('seedDemoData', {});
      setMessage("✓ Datos de demostración creados exitosamente");
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  const handleClearData = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar todos los datos de demostración?")) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await base44.functions.invoke('clearDemoData', {});
      setMessage("✓ Todos los datos fueron eliminados");
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
        </div>
        <p className="text-muted-foreground">Configura y gestiona los costos de suscripción de las apps.</p>
      </div>

      {/* Demo Data Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Datos de Demostración</h2>
        <p className="text-sm text-muted-foreground">Carga o elimina datos ficticios para demostrar el funcionamiento de la aplicación.</p>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleSeedData} 
            disabled={loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Database className="w-4 h-4" />
            {loading ? "Cargando..." : "Cargar Datos Demo"}
          </Button>
          <Button 
            onClick={handleClearData} 
            disabled={loading}
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {loading ? "Eliminando..." : "Limpiar Datos"}
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.startsWith('✓') 
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="border-t" />

      <PriceManager />

      <div className="border-t" />

      <SubscriptionsTable />
    </div>
  );
}