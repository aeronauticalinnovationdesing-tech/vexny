import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, AlertTriangle, CheckCircle, AlertCircle, Pencil, Trash2, Users, Moon, Zap, Eye, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const HABILITACIONES = [
  { value: "nocturno", label: "Vuelo nocturno", icon: "🌙", desc: "Operaciones en horario nocturno" },
  { value: "zona_urbana", label: "Vuelo en zona urbana", icon: "🏙️", desc: "Operación en zonas urbanizadas" },
  { value: "autonomo", label: "Vuelo autónomo", icon: "🤖", desc: "Operación sin control manual continuo" },
  { value: "demostracion_comercial", label: "Demostraciones comerciales UAS", icon: "📡", desc: "Vuelo para demostración de capacidad tecnológica de UAS" },
  { value: "competencias_deportivas", label: "Competencias y actividades deportivas", icon: "🏆", desc: "Vuelos en competencias y actividades deportivas y recreativas al aire libre" },
  { value: "ua_cautiva", label: "Vuelos de UA cautiva", icon: "🪁", desc: "Aeronave unida a una línea o cable" },
  { value: "espacios_cerrados", label: "Espacios cerrados o confinados", icon: "🏠", desc: "Operación indoor o en zonas confinadas" },
  // Categoría Específica RAC 100
  { value: "captura_imagenes", label: "Captura de imágenes o datos", icon: "📸", desc: "Simple captura de imágenes o datos" },
  { value: "vigilancia_seguridad", label: "Vigilancia y seguridad privada", icon: "👁️", desc: "Captura de imágenes con fines de vigilancia o seguridad privada" },
  { value: "medios_comunicacion", label: "Medios de comunicación masiva", icon: "📺", desc: "Captura de imágenes o datos para medios de comunicación" },
  { value: "aspersion", label: "Aspersión", icon: "💧", desc: "Aplicación de líquidos o sustancias" },
  { value: "dispersion", label: "Dispersión", icon: "🌬️", desc: "Dispersión de materiales" },
  { value: "enjambre", label: "Enjambre (Swarm)", icon: "🐝", desc: "Operación coordinada de múltiples UAS" },
  { value: "transporte_carga", label: "Transporte de Carga (Drone Delivery)", icon: "📦", desc: "Entrega o transporte de carga" },
  { value: "entidades_publicas", label: "Actividades misionales entidades públicas", icon: "🏛️", desc: "Vuelos en apoyo a misiones de entidades públicas" },
];

const emptyForm = {
  full_name: "", document_id: "", cipu: "", license_number: "",
  license_category: "operador_remoto", rac_100_phase: "solicitud",
  rac_100_expiry_date: "", habilitaciones: [],
  company_id: "", role: "piloto", email: "", phone: "",
  sms_manager: "", status: "activo",
  medical_certificate_expiry: "", medical_certificate_class: "",
  insurance_provider: "", insurance_expiry: "",
  emergency_contact: "", emergency_phone: "",
  hours_flown: 0, hours_bvlos: 0, hours_nocturno: 0,
};

export default function PilotManagement() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingPilot, setEditingPilot] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const queryClient = useQueryClient();

  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots", user?.email],
    queryFn: () => base44.entities.Pilot.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", user?.email],
    queryFn: () => base44.entities.Company.filter({ created_by: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pilot.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pilots", user?.email] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pilot.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pilots", user?.email] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pilot.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pilots", user?.email] }),
  });

  const closeForm = () => { setShowForm(false); setEditingPilot(null); setForm({ ...emptyForm }); };

  const openEdit = (pilot) => {
    setEditingPilot(pilot);
    setForm({ ...emptyForm, ...pilot, habilitaciones: pilot.habilitaciones || [] });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editingPilot && pilots.length >= 2) {
      alert("⚠️ Límite de pilotos alcanzado (máximo 2)");
      return;
    }
    const data = { ...form, hours_flown: Number(form.hours_flown) || 0, hours_bvlos: Number(form.hours_bvlos) || 0, hours_nocturno: Number(form.hours_nocturno) || 0 };
    if (editingPilot) updateMutation.mutate({ id: editingPilot.id, data });
    else createMutation.mutate(data);
  };

  const toggleHabilitacion = (val) => {
    const current = form.habilitaciones || [];
    setForm({ ...form, habilitaciones: current.includes(val) ? current.filter(h => h !== val) : [...current, val] });
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: "vencido", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertTriangle };
    if (days <= 30) return { status: `${days}d`, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: AlertCircle };
    return { status: "vigente", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle };
  };

  const alerts = pilots.filter(p => {
    const racStatus = getExpiryStatus(p.rac_100_expiry_date);
    return (racStatus && racStatus.status !== "vigente") || p.status === "suspendido";
  });

  const roleLabels = { piloto: "👨‍✈️ Piloto", jefe_pilotos: "👔 Jefe Pilotos", instructor: "🎓 Instructor", piloto_observador: "👁️ Observador" };
  const categoryLabels = { operador_remoto: "Operador Remoto", piloto_basico: "Piloto Básico", piloto_avanzado: "Piloto Avanzado" };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Pilotos RAC 100</h1>
            <p className="text-sm text-muted-foreground">Personal certificado · Habilitaciones · Documentación aeronáutica</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          disabled={pilots.length >= 2}
          className="gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Agregar Piloto {pilots.length >= 2 && "(Límite alcanzado)"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Pilotos", val: pilots.length, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Activos", val: pilots.filter(p => p.status === "activo").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Jefes / Instructores", val: pilots.filter(p => ["jefe_pilotos", "instructor"].includes(p.role)).length, color: "text-primary", bg: "bg-primary/10" },
          { label: "Con Alertas", val: alerts.length, color: alerts.length > 0 ? "text-red-600" : "text-muted-foreground", bg: alerts.length > 0 ? "bg-red-50" : "bg-muted" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border border-border p-4 flex flex-col gap-1", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">{alerts.length} Alerta{alerts.length > 1 ? "s" : ""} Activa{alerts.length > 1 ? "s" : ""}</h3>
          </div>
          <ul className="space-y-1 text-sm text-red-700">
            {alerts.map(p => {
              const s = getExpiryStatus(p.rac_100_expiry_date);
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  <strong>{p.full_name}</strong>
                  {p.status === "suspendido" && " — Suspendido"}
                  {s && s.status !== "vigente" && ` — RAC 100 ${s.status === "vencido" ? "VENCIDO" : `vence en ${s.status}`}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lista de pilotos */}
      <div className="space-y-3">
        {pilots.length === 0 && (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay pilotos registrados</p>
          </div>
        )}

        {pilots.map((pilot) => {
          const racStatus = getExpiryStatus(pilot.rac_100_expiry_date);
          const medStatus = getExpiryStatus(pilot.medical_certificate_expiry);
          const company = companies.find(c => c.id === pilot.company_id);
          const RacIcon = racStatus?.icon || CheckCircle;

          return (
            <div key={pilot.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                      {pilot.role === "jefe_pilotos" ? "👔" : pilot.role === "instructor" ? "🎓" : "👨‍✈️"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base">{pilot.full_name}</h3>
                        <Badge className={pilot.status === "activo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {pilot.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{roleLabels[pilot.role]}</Badge>
                        <Badge variant="outline" className="text-xs">{categoryLabels[pilot.license_category]}</Badge>
                      </div>
                      {company && <p className="text-xs text-muted-foreground">🏢 {company.name}</p>}
                    </div>
                  </div>

                  {/* Datos principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div><p className="text-muted-foreground text-xs">Licencia RAC 100</p><p className="font-mono text-xs font-medium">{pilot.license_number}</p></div>
                    <div><p className="text-muted-foreground text-xs">CIPU</p><p className="font-mono text-xs">{pilot.cipu || "—"}</p></div>
                    <div><p className="text-muted-foreground text-xs">Horas Totales</p><p className="font-bold">{pilot.hours_flown || 0}h</p></div>
                    <div><p className="text-muted-foreground text-xs">Email</p><p className="text-xs truncate">{pilot.email || "—"}</p></div>
                  </div>

                  {/* Horas especiales */}
                  {(pilot.hours_bvlos > 0 || pilot.hours_nocturno > 0) && (
                    <div className="flex gap-3 mb-3">
                      {pilot.hours_bvlos > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-200">
                          <Zap className="w-3 h-3" /> BVLOS: {pilot.hours_bvlos}h
                        </span>
                      )}
                      {pilot.hours_nocturno > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-200">
                          <Moon className="w-3 h-3" /> Nocturno: {pilot.hours_nocturno}h
                        </span>
                      )}
                    </div>
                  )}

                  {/* Habilitaciones */}
                  {pilot.habilitaciones?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {pilot.habilitaciones.map(h => {
                        const hab = HABILITACIONES.find(hb => hb.value === h);
                        return (
                          <span key={h} className="flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
                            {hab?.icon} {hab?.label || h}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Estado documentos */}
                  <div className="flex flex-wrap gap-2">
                    {racStatus && (
                      <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border", racStatus.bg, racStatus.color)}>
                        <RacIcon className="w-3 h-3" />
                        RAC 100: {pilot.rac_100_expiry_date ? format(new Date(pilot.rac_100_expiry_date), "dd/MM/yyyy") : "—"} ({racStatus.status})
                      </span>
                    )}
                    {medStatus && (
                      <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border", medStatus.bg, medStatus.color)}>
                        Médico: {format(new Date(pilot.medical_certificate_expiry), "dd/MM/yyyy")} ({medStatus.status})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(pilot)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(pilot.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FORM */}
      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPilot ? "Editar Piloto" : "Agregar Piloto RAC 100"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Identificación */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Identificación</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Nombre Completo *</label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Cédula / Documento</label>
                  <Input value={form.document_id || ""} onChange={e => setForm({ ...form, document_id: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">CIPU</label>
                  <Input value={form.cipu || ""} onChange={e => setForm({ ...form, cipu: e.target.value })} placeholder="Certificado de ID Personal Único" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Licencia RAC 100 */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Licencia RAC 100</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Vencimiento Examen Medico*</label>
                  <Input type="date" value={form.rac_100_expiry_date} onChange={e => setForm({ ...form, rac_100_expiry_date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Select value={form.license_category} onValueChange={v => setForm({ ...form, license_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador_remoto">Operador Remoto (Cat. A1/A2/A3)</SelectItem>
                      <SelectItem value="piloto_basico">Piloto Básico (Cat. B)</SelectItem>
                      <SelectItem value="piloto_avanzado">Piloto Avanzado (Cat. C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fase en Proceso RAC 100</label>
                  <Select value={form.rac_100_phase || "solicitud"} onValueChange={v => setForm({ ...form, rac_100_phase: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solicitud">Solicitud</SelectItem>
                      <SelectItem value="evaluacion">Evaluación</SelectItem>
                      <SelectItem value="capacitacion">Capacitación</SelectItem>
                      <SelectItem value="examen">Examen Teórico/Práctico</SelectItem>
                      <SelectItem value="certificacion">Certificación</SelectItem>
                      <SelectItem value="licencia_emitida">Licencia Emitida ✓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Habilitaciones */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Habilitaciones Especiales RAC 100</h3>
              <div className="grid grid-cols-2 gap-2">
                {HABILITACIONES.map(h => (
                  <label key={h.value} className={cn("flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                    (form.habilitaciones || []).includes(h.value)
                      ? "border-sky-400 bg-sky-50 text-sky-800"
                      : "border-border hover:border-muted-foreground/40"
                  )}>
                    <Checkbox
                      checked={(form.habilitaciones || []).includes(h.value)}
                      onCheckedChange={() => toggleHabilitacion(h.value)}
                    />
                    <div>
                      <div className="font-medium">{h.icon} {h.label}</div>
                      <div className="text-xs text-muted-foreground">{h.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Rol y empresa */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Rol y Empresa</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Rol</label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piloto">Piloto</SelectItem>
                      <SelectItem value="jefe_pilotos">Jefe de Pilotos</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="piloto_observador">Piloto Observador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="suspendido">Suspendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {companies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Empresa Operadora</label>
                    <Select value={form.company_id || ""} onValueChange={v => setForm({ ...form, company_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                      <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Gerente SMS</label>
                  <Input value={form.sms_manager || ""} onChange={e => setForm({ ...form, sms_manager: e.target.value })} placeholder="Nombre del gerente" />
                </div>
              </div>
            </section>

            {/* Médico */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Certificado Médico Aeronáutico</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Vencimiento Médico</label>
                  <Input type="date" value={form.medical_certificate_expiry || ""} onChange={e => setForm({ ...form, medical_certificate_expiry: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Clase Médica</label>
                  <Select value={form.medical_certificate_class || ""} onValueChange={v => setForm({ ...form, medical_certificate_class: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clase_1">Clase 1 (Piloto Avanzado)</SelectItem>
                      <SelectItem value="clase_2">Clase 2 (Piloto Básico)</SelectItem>
                      <SelectItem value="clase_3">Clase 3 (Operador)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Horas */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Horas de Vuelo</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Total (h)</label>
                  <Input type="number" step="0.1" value={form.hours_flown} onChange={e => setForm({ ...form, hours_flown: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">BVLOS (h)</label>
                  <Input type="number" step="0.1" value={form.hours_bvlos} onChange={e => setForm({ ...form, hours_bvlos: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Nocturno (h)</label>
                  <Input type="number" step="0.1" value={form.hours_nocturno} onChange={e => setForm({ ...form, hours_nocturno: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Emergencia */}
            <section>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">Contacto de Emergencia</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <Input value={form.emergency_contact || ""} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input value={form.emergency_phone || ""} onChange={e => setForm({ ...form, emergency_phone: e.target.value })} />
                </div>
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                {editingPilot ? "Actualizar" : "Agregar Piloto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}