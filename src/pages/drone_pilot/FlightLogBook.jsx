import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen, Plus, Pencil, Trash2, Plane, Clock, AlertTriangle,
  Moon, Eye, Zap, MapPin, Cloud, Wind, CheckCircle, AlertCircle
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import WeatherWidget from "@/components/drone_pilot/WeatherWidget";

const ACTIVITY_TYPES = [
  { value: "fotografia_aerea", label: "📸 Fotografía Aérea" },
  { value: "video_cinematografico", label: "🎬 Video Cinematográfico" },
  { value: "inspeccion_infraestructura", label: "🔍 Inspección de Infraestructura" },
  { value: "mapeo_fotogrametria", label: "🗺️ Mapeo / Fotogrametría" },
  { value: "agricultura_precision", label: "🌾 Agricultura de Precisión" },
  { value: "busqueda_rescate", label: "🚨 Búsqueda y Rescate" },
  { value: "vigilancia_seguridad", label: "👁️ Vigilancia y Seguridad" },
  { value: "entrega_carga", label: "📦 Entrega de Carga" },
  { value: "topografia", label: "📐 Topografía" },
  { value: "termografia", label: "🌡️ Termografía" },
  { value: "inspeccion_torres", label: "🗼 Inspección de Torres" },
  { value: "inspeccion_lineas", label: "⚡ Inspección de Líneas Eléctricas" },
  { value: "eventos_publicos", label: "🎉 Eventos Públicos" },
  { value: "publicidad_marketing", label: "📢 Publicidad y Marketing" },
  { value: "bvlos", label: "🛰️ BVLOS (Fuera Línea Visual)" },
  { value: "entrenamiento", label: "🎓 Entrenamiento" },
  { value: "prueba_tecnica", label: "🔧 Prueba Técnica" },
  { value: "otro", label: "📋 Otro" },
];

const AREA_TYPES = [
  { value: "rural", label: "🌿 Rural" },
  { value: "suburbana", label: "🏘️ Suburbana" },
  { value: "urbana", label: "🏙️ Urbana" },
  { value: "restringida", label: "🚫 Zona Restringida" },
];

const WEATHER_CONDITIONS = [
  { value: "vmcdia", label: "VMC Día - Vuelo Visual Diurno" },
  { value: "vmcnoche", label: "VMC Noche - Vuelo Visual Nocturno" },
  { value: "marginal", label: "VMC Marginal - Condiciones límite" },
  { value: "viento_fuerte", label: "Viento fuerte > 25 km/h" },
];

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  start_time: "08:00", end_time: "09:00", duration_minutes: 60,
  pilot_name: "", drone_model: "", mission_name: "",
  location_name: "", location_lat: "", location_lon: "",
  activity_type: "fotografia_aerea", operation_category: "abierta",
  is_night_flight: false, is_bvlos: false, is_urban: false,
  max_altitude_agl: 120, area_type: "rural",
  authorizations: [],
  weather_condition: "vmcdia", wind_speed_knots: "", visibility_km: "",
  temperature_c: "", humidity_pct: "",
  observers_count: 0, cycles_flown: 1,
  battery_start_pct: 100, battery_end_pct: "",
  pre_flight_checklist_ok: true, post_flight_checklist_ok: true,
  incident_occurred: false, incident_type: "", incident_description: "", corrective_actions: "",
  notes: "", status: "completado",
};

const AUTHORIZATIONS_LIST = [
  "Zona CTR autorizada UAEAC",
  "Vuelo nocturno aprobado",
  "BVLOS aprobado",
  "Zona urbana aprobada",
  "Zona restringida aprobada",
  "Carga especial aprobada",
  "Evento masivo aprobado",
];

const statusColors = {
  completado: "bg-green-100 text-green-700",
  en_vuelo: "bg-blue-100 text-blue-700",
  planificado: "bg-yellow-100 text-yellow-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function FlightLogBook() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState("all");
  const [showWeather, setShowWeather] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["flight_logs", user?.email],
    queryFn: () => base44.entities.FlightLog.filter({ created_by: user?.email }, "-date", 100),
    enabled: !!user?.email,
  });

  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots", user?.email],
    queryFn: () => base44.entities.Pilot.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const { data: drones = [] } = useQuery({
    queryKey: ["drones", user?.email],
    queryFn: () => base44.entities.Drone.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FlightLog.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flight_logs"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FlightLog.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flight_logs"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FlightLog.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flight_logs"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingLog(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setForm({ ...emptyForm, ...log });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      duration_minutes: Number(form.duration_minutes) || 0,
      max_altitude_agl: Number(form.max_altitude_agl) || 0,
      wind_speed_knots: Number(form.wind_speed_knots) || 0,
      visibility_km: Number(form.visibility_km) || 0,
      temperature_c: Number(form.temperature_c) || null,
      humidity_pct: Number(form.humidity_pct) || null,
      observers_count: Number(form.observers_count) || 0,
      cycles_flown: Number(form.cycles_flown) || 1,
      battery_start_pct: Number(form.battery_start_pct) || null,
      battery_end_pct: Number(form.battery_end_pct) || null,
      location_lat: Number(form.location_lat) || null,
      location_lon: Number(form.location_lon) || null,
    };
    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTimeChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (updated.start_time && updated.end_time) {
      const [sh, sm] = updated.start_time.split(":").map(Number);
      const [eh, em] = updated.end_time.split(":").map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins > 0) updated.duration_minutes = mins;
    }
    setForm(updated);
  };

  const handleWeatherData = (wd) => {
    setWeatherData(wd);
    setForm(prev => ({
      ...prev,
      temperature_c: wd.temperature_2m,
      humidity_pct: wd.relativehumidity_2m,
      wind_speed_knots: Math.round(wd.windspeed_10m * 0.539957),
      visibility_km: Math.round(wd.visibility / 1000),
    }));
  };

  const filtered = logs.filter(l => filterStatus === "all" || l.status === filterStatus);

  const totalMinutes = logs.filter(l => l.status === "completado").reduce((s, l) => s + (l.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const bvlosFlights = logs.filter(l => l.is_bvlos).length;
  const nightFlights = logs.filter(l => l.is_night_flight).length;
  const incidents = logs.filter(l => l.incident_occurred).length;

  const activityLabel = (val) => ACTIVITY_TYPES.find(a => a.value === val)?.label || val;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bitácora de Vuelo RAC 100</h1>
            <p className="text-sm text-muted-foreground">Registro oficial de operaciones · Sistema de Gestión de Seguridad</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowWeather(!showWeather)}>
            <Cloud className="w-4 h-4 mr-1" /> Clima
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
            <Plus className="w-4 h-4" /> Registrar Vuelo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Horas Totales", val: `${totalHours}h`, icon: Clock, color: "text-sky-500", bg: "bg-sky-50" },
          { label: "Vuelos", val: logs.filter(l => l.status === "completado").length, icon: Plane, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "BVLOS", val: bvlosFlights, icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Nocturnos", val: nightFlights, icon: Moon, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Incidentes", val: incidents, icon: AlertTriangle, color: incidents > 0 ? "text-red-600" : "text-muted-foreground", bg: incidents > 0 ? "bg-red-50" : "bg-muted" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div>
              <div className="text-lg font-bold">{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Widget Clima */}
      {showWeather && (
        <WeatherWidget onWeatherData={(wd) => setWeatherData(wd)} />
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: "all", l: `Todos (${logs.length})` },
          { v: "completado", l: "Completados" },
          { v: "planificado", l: "Planificados" },
          { v: "en_vuelo", l: "En vuelo" },
          { v: "cancelado", l: "Cancelados" },
        ].map(f => (
          <button key={f.v} onClick={() => setFilterStatus(f.v)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Lista de vuelos */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay registros en la bitácora</p>
          </div>
        )}

        {filtered.map(log => (
          <div key={log.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Header del vuelo */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Plane className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{log.pilot_name}</span>
                      <span className="text-muted-foreground text-sm">·</span>
                      <span className="text-sm text-muted-foreground">{log.drone_model}</span>
                      <Badge className={cn("text-xs", statusColors[log.status] || "bg-muted")}>{log.status}</Badge>
                      {log.incident_occurred && (
                        <Badge className="text-xs bg-red-100 text-red-700">
                          <AlertCircle className="w-3 h-3 mr-1" /> Incidente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{format(new Date(log.date), "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
                      {log.start_time && <span>· {log.start_time} - {log.end_time}</span>}
                      {log.duration_minutes > 0 && <span>· <Clock className="w-3 h-3 inline mr-0.5" />{Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}min</span>}
                    </div>
                  </div>
                </div>

                {/* Actividad y badges */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                    {activityLabel(log.activity_type)}
                  </Badge>
                  {log.is_night_flight && <Badge className="text-xs bg-indigo-100 text-indigo-700"><Moon className="w-3 h-3 mr-1" />Nocturno</Badge>}
                  {log.is_bvlos && <Badge className="text-xs bg-purple-100 text-purple-700"><Zap className="w-3 h-3 mr-1" />BVLOS</Badge>}
                  {log.is_urban && <Badge className="text-xs bg-orange-100 text-orange-700">Urbano</Badge>}
                  <Badge variant="outline" className="text-xs">{AREA_TYPES.find(a => a.value === log.area_type)?.label || log.area_type}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{log.operation_category}</Badge>
                </div>

                {/* Datos de vuelo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  {log.location_name && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{log.location_name}</span>
                  )}
                  {log.max_altitude_agl && (
                    <span>Altitud: {log.max_altitude_agl}m AGL</span>
                  )}
                  {log.wind_speed_knots && (
                    <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{log.wind_speed_knots} nudos</span>
                  )}
                  {log.cycles_flown && (
                    <span>{log.cycles_flown} ciclo{log.cycles_flown !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Autorizaciones */}
                {log.authorizations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {log.authorizations.map((a, i) => (
                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(log)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(log.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-500" />
              {editingLog ? "Editar Registro de Vuelo" : "Nuevo Registro en Bitácora RAC 100"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Datos básicos */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Datos del Vuelo</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Fecha *</label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Hora Inicio</label>
                  <Input type="time" value={form.start_time} onChange={e => handleTimeChange("start_time", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Hora Fin</label>
                  <Input type="time" value={form.end_time} onChange={e => handleTimeChange("end_time", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm font-medium">Duración (minutos)</label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Ciclos / Despegues</label>
                  <Input type="number" min="1" value={form.cycles_flown} onChange={e => setForm({ ...form, cycles_flown: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm font-medium">Piloto *</label>
                  {pilots.length > 0 ? (
                    <Select value={form.pilot_name} onValueChange={v => setForm({ ...form, pilot_name: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar piloto..." /></SelectTrigger>
                      <SelectContent>
                        {pilots.map(p => <SelectItem key={p.id} value={p.full_name}>{p.full_name} ({p.license_category})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.pilot_name} onChange={e => setForm({ ...form, pilot_name: e.target.value })} placeholder="Nombre del piloto" required />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Dron *</label>
                  {drones.length > 0 ? (
                    <Select value={form.drone_model} onValueChange={v => setForm({ ...form, drone_model: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar dron..." /></SelectTrigger>
                      <SelectContent>
                        {drones.map(d => <SelectItem key={d.id} value={d.model}>{d.model} ({d.serial_number})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.drone_model} onChange={e => setForm({ ...form, drone_model: e.target.value })} placeholder="Modelo del dron" required />
                  )}
                </div>
              </div>
            </section>

            {/* Tipo de operación */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Tipo de Operación RAC 100</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Tipo de Actividad *</label>
                  <Select value={form.activity_type} onValueChange={v => setForm({ ...form, activity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Categoría de Operación</label>
                  <Select value={form.operation_category} onValueChange={v => setForm({ ...form, operation_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abierta">Abierta (hasta 120m, VLOS)</SelectItem>
                      <SelectItem value="especifica">Específica (requiere autorización)</SelectItem>
                      <SelectItem value="certificada">Certificada (operación compleja)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm font-medium">Tipo de Área</label>
                  <Select value={form.area_type} onValueChange={v => setForm({ ...form, area_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREA_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Altitud Máxima AGL (m)</label>
                  <Input type="number" value={form.max_altitude_agl} onChange={e => setForm({ ...form, max_altitude_agl: e.target.value })} />
                </div>
              </div>

              {/* Habilitaciones especiales */}
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.is_night_flight} onCheckedChange={v => setForm({ ...form, is_night_flight: v, weather_condition: v ? "vmcnoche" : form.weather_condition })} />
                  <Moon className="w-4 h-4 text-indigo-500" /> <span>Vuelo Nocturno <span className="text-xs text-muted-foreground">(requiere habilitación)</span></span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.is_bvlos} onCheckedChange={v => setForm({ ...form, is_bvlos: v })} />
                  <Zap className="w-4 h-4 text-purple-500" /> <span>BVLOS <span className="text-xs text-muted-foreground">(requiere aprobación AAC)</span></span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.is_urban} onCheckedChange={v => setForm({ ...form, is_urban: v })} />
                  <span>Zona Urbana</span>
                </label>
              </div>

              {/* Autorizaciones */}
              <div className="mt-3">
                <label className="text-sm font-medium">Autorizaciones Obtenidas</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {AUTHORIZATIONS_LIST.map(auth => (
                    <label key={auth} className="flex items-center gap-1.5 text-xs cursor-pointer bg-muted px-2.5 py-1.5 rounded-lg hover:bg-muted/80">
                      <Checkbox
                        checked={(form.authorizations || []).includes(auth)}
                        onCheckedChange={v => {
                          const auths = form.authorizations || [];
                          setForm({ ...form, authorizations: v ? [...auths, auth] : auths.filter(a => a !== auth) });
                        }}
                      />
                      {auth}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Ubicación */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Ubicación</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Nombre del lugar</label>
                  <Input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="Ej: Parque Industrial Tocancipá" />
                </div>
                <div>
                  <label className="text-sm font-medium">Latitud</label>
                  <Input type="number" step="0.000001" value={form.location_lat} onChange={e => setForm({ ...form, location_lat: e.target.value })} placeholder="4.6097" />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitud</label>
                  <Input type="number" step="0.000001" value={form.location_lon} onChange={e => setForm({ ...form, location_lon: e.target.value })} placeholder="-74.0817" />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Misión / Proyecto</label>
                <Input value={form.mission_name} onChange={e => setForm({ ...form, mission_name: e.target.value })} placeholder="Nombre de la misión asociada" />
              </div>
            </section>

            {/* Condiciones Meteorológicas */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Condiciones Meteorológicas</h3>
              {weatherData && (
                <div className="mb-3 p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-sky-700">Datos del clima cargados automáticamente desde Open-Meteo</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleWeatherData(weatherData)}>Aplicar</Button>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Condición VMC</label>
                  <Select value={form.weather_condition} onValueChange={v => setForm({ ...form, weather_condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEATHER_CONDITIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Viento (nudos)</label>
                  <Input type="number" step="0.1" value={form.wind_speed_knots} onChange={e => setForm({ ...form, wind_speed_knots: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium">Visibilidad (km)</label>
                  <Input type="number" value={form.visibility_km} onChange={e => setForm({ ...form, visibility_km: e.target.value })} placeholder="10" />
                </div>
                <div>
                  <label className="text-sm font-medium">Temperatura (°C)</label>
                  <Input type="number" value={form.temperature_c} onChange={e => setForm({ ...form, temperature_c: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Humedad (%)</label>
                  <Input type="number" value={form.humidity_pct} onChange={e => setForm({ ...form, humidity_pct: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Observadores</label>
                  <Input type="number" value={form.observers_count} onChange={e => setForm({ ...form, observers_count: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Batería */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Estado de Batería</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Batería Inicio (%)</label>
                  <Input type="number" min="0" max="100" value={form.battery_start_pct} onChange={e => setForm({ ...form, battery_start_pct: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Batería Fin (%)</label>
                  <Input type="number" min="0" max="100" value={form.battery_end_pct} onChange={e => setForm({ ...form, battery_end_pct: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Checklists */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Checklists</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.pre_flight_checklist_ok} onCheckedChange={v => setForm({ ...form, pre_flight_checklist_ok: v })} />
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Pre-vuelo completado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.post_flight_checklist_ok} onCheckedChange={v => setForm({ ...form, post_flight_checklist_ok: v })} />
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Post-vuelo completado
                </label>
              </div>
            </section>

            {/* Incidentes */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Reporte de Seguridad (SMS)</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <Checkbox checked={form.incident_occurred} onCheckedChange={v => setForm({ ...form, incident_occurred: v })} />
                <AlertTriangle className="w-4 h-4 text-red-500" /> Se presentó un incidente/accidente
              </label>
              {form.incident_occurred && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Tipo de Incidente</label>
                    <Select value={form.incident_type} onValueChange={v => setForm({ ...form, incident_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="perdida_control">Pérdida de control</SelectItem>
                        <SelectItem value="falla_comunicacion">Falla en comunicación</SelectItem>
                        <SelectItem value="falla_bateria">Falla de batería</SelectItem>
                        <SelectItem value="colision">Colisión</SelectItem>
                        <SelectItem value="perdida_enlace">Pérdida de enlace</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descripción del Incidente</label>
                    <textarea value={form.incident_description} onChange={e => setForm({ ...form, incident_description: e.target.value })}
                      rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Describe en detalle lo ocurrido..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Acciones Correctivas Tomadas</label>
                    <textarea value={form.corrective_actions} onChange={e => setForm({ ...form, corrective_actions: e.target.value })}
                      rows={2} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Medidas tomadas para prevenir recurrencia..." />
                  </div>
                </div>
              )}
            </section>

            {/* Notas y estado */}
            <section>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Estado del Vuelo</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planificado">Planificado</SelectItem>
                      <SelectItem value="en_vuelo">En vuelo</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notas adicionales</label>
                  <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." />
                </div>
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                {editingLog ? "Actualizar Registro" : "Registrar en Bitácora"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}