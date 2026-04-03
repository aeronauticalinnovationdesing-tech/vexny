import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, Database, Trash2, MessageSquare, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PriceManager from "@/components/dashboard/PriceManager";
import SubscriptionsTable from "@/components/dashboard/SubscriptionsTable";
import SubscriptionDebugger from "@/components/dashboard/SubscriptionDebugger";
import PaymentVerifier from "@/components/dashboard/PaymentVerifier";
import CompanySubscriptionsManager from "@/components/admin/CompanySubscriptionsManager";
import CourseAccessManager from "@/components/admin/CourseAccessManager";
import DroneCompanyUsersManager from "@/components/admin/DroneCompanyUsersManager";
import AccessAndPaymentsManager from "@/components/admin/AccessAndPaymentsManager";

export default function Admin() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: consultations = [] } = useQuery({
    queryKey: ["certificationConsults"],
    queryFn: () => base44.entities.CertificationConsult.list("-created_date"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CertificationConsult.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["certificationConsults"] }),
  });

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

      <AccessAndPaymentsManager />

      <div className="border-t" />

      <SubscriptionsTable />

      <div className="border-t" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Verificar pagos en Wompi</h2>
        <p className="text-sm text-muted-foreground">Busca en Wompi si un usuario ya pagó una suscripción.</p>
        <PaymentVerifier />
      </div>

      <div className="border-t" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Reactivar suscripciones no procesadas</h2>
        <p className="text-sm text-muted-foreground">Si un usuario pagó pero su suscripción no se activó automáticamente, actívala aquí.</p>
        <SubscriptionDebugger />
      </div>

      <div className="border-t" />

      <CompanySubscriptionsManager />

      <div className="border-t" />

      <DroneCompanyUsersManager />

      <div className="border-t" />

      <CourseAccessManager />

      <div className="border-t" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Solicitudes de Asesoría RAC 100
        </h2>
        <p className="text-sm text-muted-foreground">Empresas que solicitan asesoría para certificación.</p>
        
        {consultations.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No hay solicitudes de asesoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {consultations.map(consult => (
              <div key={consult.id} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base">{consult.company_name}</h3>
                        <Select value={consult.status} onValueChange={(status) => updateStatusMutation.mutate({ id: consult.id, status })}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nuevo">Nuevo</SelectItem>
                            <SelectItem value="revisado">Revisado</SelectItem>
                            <SelectItem value="contactado">Contactado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                        {consult.nit && <p><span className="font-medium">NIT:</span> {consult.nit}</p>}
                        {consult.phone && <p><span className="font-medium">Teléfono:</span> {consult.phone}</p>}
                        {consult.email && <p><span className="font-medium">Email:</span> {consult.email}</p>}
                        {consult.city && <p><span className="font-medium">Ciudad:</span> {consult.city}</p>}
                        {consult.activity_type && <p><span className="font-medium">Actividad:</span> {consult.activity_type}</p>}
                        {consult.operation_category_type && <p><span className="font-medium">Operación:</span> {consult.operation_category_type}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Creado: {new Date(consult.created_date).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === consult.id ? null : consult.id)} className="text-muted-foreground hover:text-foreground">
                      {expandedId === consult.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {expandedId === consult.id && (
                  <div className="border-t bg-muted/30 p-4 text-sm space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2">Contacto</h4>
                      <div className="space-y-1 text-muted-foreground">
                        {consult.sms_manager_name && <p>Gerente SMS: {consult.sms_manager_name}</p>}
                        {consult.sms_manager_email && <p>Email SMS: {consult.sms_manager_email}</p>}
                        {consult.chief_pilot_name && <p>Jefe de Pilotos: {consult.chief_pilot_name}</p>}
                      </div>
                    </div>

                    {consult.aac_cert_phase && (
                      <div>
                        <h4 className="font-semibold mb-2">Certificación RAC 100</h4>
                        <div className="space-y-1 text-muted-foreground">
                          <p>Fase: {consult.aac_cert_phase}</p>
                          {consult.operation_category_type && <p>Tipo de Operación: {consult.operation_category_type}</p>}
                        </div>
                      </div>
                    )}

                    {consult.special_flights && consult.special_flights.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Vuelos Especiales</h4>
                        <div className="flex flex-wrap gap-1">
                          {consult.special_flights.map(flight => (
                            <Badge key={flight} variant="secondary" className="text-xs">{flight}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {consult.tech_equipment && consult.tech_equipment.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Equipos Tecnológicos</h4>
                        <div className="flex flex-wrap gap-1">
                          {consult.tech_equipment.map(equip => (
                            <Badge key={equip} variant="secondary" className="text-xs">{equip}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {consult.other_equipment && (
                      <div>
                        <h4 className="font-semibold mb-2">Otros Equipos</h4>
                        <p className="text-muted-foreground">{consult.other_equipment}</p>
                      </div>
                    )}

                    {consult.drone_references && consult.drone_references.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Drones</h4>
                        <div className="space-y-1 text-muted-foreground">
                          {consult.drone_references.map((drone, idx) => (
                            <p key={idx}>{drone.model} (Cantidad: {drone.quantity})</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {consult.insurance_policy_number && (
                      <div>
                        <h4 className="font-semibold mb-2">Seguros</h4>
                        <div className="space-y-1 text-muted-foreground">
                          <p>Póliza: {consult.insurance_policy_number}</p>
                          {consult.insurance_expiry && <p>Vencimiento: {new Date(consult.insurance_expiry).toLocaleDateString('es-CO')}</p>}
                        </div>
                      </div>
                    )}

                    {consult.notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Notas</h4>
                        <p className="text-muted-foreground">{consult.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}