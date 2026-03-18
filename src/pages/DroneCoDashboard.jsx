import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Building2, Users, Plane, AlertCircle, ArrowRight, CheckCircle, Clock, Wind } from "lucide-react";
import TrialBanner from "@/components/dashboard/TrialBanner";
import { Link } from "react-router-dom";
import StatCard from "@/components/dashboard/StatCard";
import PriceManager from "@/components/dashboard/PriceManager";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DroneCoDashboard() {
  const user = useCurrentUser();

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ["company", user?.email],
    queryFn: () => base44.entities.Company.filter({ created_by: user?.email }, "-created_date", 1),
    enabled: !!user,
  });

  const currentCompanyId = company?.[0]?.id;

  // Fetch company users
  const { data: companyUsers = [] } = useQuery({
    queryKey: ["companyUsers", currentCompanyId],
    queryFn: () => base44.entities.CompanyUser.filter({ company_id: currentCompanyId }),
    enabled: !!currentCompanyId,
  });

  // Fetch drones
  const { data: drones = [] } = useQuery({
    queryKey: ["drones", currentCompanyId],
    queryFn: () => base44.entities.Drone.list("-created_date", 100),
    enabled: !!currentCompanyId,
  });

  // Fetch pilots
  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots", currentCompanyId],
    queryFn: () => base44.entities.Pilot.filter({ company_id: currentCompanyId }),
    enabled: !!currentCompanyId,
  });

  // Fetch flight logs
  const { data: flightLogs = [] } = useQuery({
    queryKey: ["flightLogs", currentCompanyId],
    queryFn: () => base44.entities.FlightLog.list("-created_date", 50),
    enabled: !!currentCompanyId,
  });

  const activePilots = pilots.filter(p => p.status === "activo").length;
  const operativeDrones = drones.filter(d => d.maintenance_status === "operativo").length;
  const totalFlightHours = flightLogs.reduce((sum, log) => sum + (log.duration_minutes || 0) / 60, 0);
  const recentFlights = flightLogs.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Building2 className="w-6 h-6 text-indigo-500" />
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Centro Operativo</h1>
        </div>
        <p className="text-muted-foreground text-sm capitalize">
          {company?.[0]?.name || "Tu Empresa"}
        </p>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <TrialBanner profile="drone_company" />
      <PriceManager />

      {/* Stats */}
      {(pilots.length > 0 || drones.length > 0 || flightLogs.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Pilotos Activos" value={activePilots} subtitle="en operación" />
          <StatCard icon={Plane} label="Drones Operativos" value={operativeDrones} subtitle="disponibles" />
          <StatCard icon={Wind} label="Horas de Vuelo" value={totalFlightHours.toFixed(1)} subtitle="registradas" />
          <StatCard icon={Users} label="Equipo" value={companyUsers.length} subtitle="usuarios en sistema" />
        </div>
      )}

      {/* Empty state */}
      {pilots.length === 0 && drones.length === 0 && flightLogs.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">¡Bienvenido a tu Centro Operativo!</p>
          <p className="text-muted-foreground text-sm">Registra pilotos, drones y vuelos para ver métricas aquí.</p>
        </div>
      )}

      {/* Charts + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Company Info */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Información de Empresa</h2>
          {company?.[0] ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="font-medium">{company[0].name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NIT</p>
                <p className="font-medium">{company[0].nit || "No registrado"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ciudad</p>
                <p className="font-medium">{company[0].city || "No registrado"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <p className="font-medium capitalize">{company[0].status}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay información de empresa registrada</p>
          )}
        </div>

      </div>

      {/* Recent flights + quick access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Últimos Vuelos</h2>
            <Link to="/FlightLogBookEnterprise" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              Bitácora <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentFlights.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay vuelos registrados</p>
            ) : (
              recentFlights.map(flight => (
                <div key={flight.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <AlertCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{flight.pilot_name}</p>
                    <p className="text-xs text-muted-foreground">{flight.drone_model} · {flight.duration_minutes}min</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Acceso Rápido</h2>
          <div className="space-y-2">
            {[
              { label: "Gestionar Pilotos", path: "/PilotManagementEnterprise", icon: Users },
              { label: "Flota de Drones", path: "/DroneRegistryEnterprise", icon: Plane },
              { label: "Bitácora de Vuelos", path: "/FlightLogBookEnterprise", icon: Wind },
              { label: "Reportes SMS", path: "/SMSReportingEnterprise", icon: AlertCircle },
              { label: "Mantenimiento", path: "/MaintenanceManagementEnterprise", icon: Plane },
              { label: "Usuarios", path: "/UserManagementEnterprise", icon: Users },
            ].map((action) => (
              <Link key={action.path + action.label} to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-indigo-500" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}