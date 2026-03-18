import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Users,
  Phone, Mail, FileText, Shield, Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "", nit: "", aac_cert_number: "", aac_cert_expiry: "",
  address: "", city: "", phone: "", email: "",
  sms_manager_name: "", sms_manager_email: "",
  operations_manual_version: "", insurance_policy_number: "", insurance_expiry: "",
  status: "activa",
  special_flights: [],
  tech_equipment: [],
  other_equipment: "",
  drone_references: []
};

const specialFlightsOptions = [
  { value: "vuelo_nocturno", label: "Vuelo nocturno" },
  { value: "vuelo_zona_urbana", label: "Vuelo en zona urbana" },
  { value: "vuelo_autonomo", label: "Vuelo autónomo" },
  { value: "demostraciones_comerciales", label: "Vuelo para demostraciones comerciales de capacidad tecnológica de UAS" },
  { value: "competencias_deportivas", label: "Vuelos en competencias y actividades deportivas y recreativas al aire libre" },
  { value: "ua_cautiva", label: "Vuelos de UA cautiva" },
  { value: "espacios_cerrados", label: "Vuelos en espacios cerrados o confinados" },
];

const techEquipmentOptions = [
  { value: "camaras", label: "Cámaras" },
  { value: "gancho_carga", label: "Gancho de carga" },
  { value: "luces_busqueda", label: "Luces de búsqueda" },
  { value: "radar", label: "Radar" },
  { value: "paracaidas", label: "Paracaídas" },
  { value: "detectores", label: "Detectores" },
  { value: "speaker_megafono", label: "Speaker o megáfono" },
  { value: "antenas_drtk", label: "Antenas (D-RTK)" },
];

function ExpiryBadge({ date, label }) {
  if (!date) return null;
  const days = differenceInDays(new Date(date), new Date());
  const color = days < 0 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
  const icon = days < 0 ? "⚠️" : days <= 30 ? "⏰" : "✓";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", color)}>
      {icon} {label}: {format(new Date(date), "dd/MM/yyyy")} {days < 0 ? `(vencido hace ${Math.abs(days)}d)` : days <= 30 ? `(${days}d)` : "vigente"}
    </span>
  );
}

export default function CompanyManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [droneInput, setDroneInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Company.filter({ created_by: user.email }, "-created_date");
    },
  });

  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Pilot.filter({ created_by: user.email }, "-created_date");
    },
  });

  const { data: drones = [] } = useQuery({
    queryKey: ["drones"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Drone.filter({ created_by: user.email }, "-created_date");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["companies"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["companies"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (company) => {
    setEditingCompany(company);
    setForm({ ...emptyForm, ...company });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getCompanyPilots = (companyId) => pilots.filter(p => p.company_id === companyId);
  const getCompanyDrones = () => drones; // All drones for now (can be filtered by company later)

  const totalPilots = pilots.length;
  const activePilots = pilots.filter(p => p.status === "activo").length;
  const totalDrones = drones.length;
  const operativeDrones = drones.filter(d => d.maintenance_status === "operativo").length;

  const handleSendCertificationConsult = async () => {
    try {
      const response = await base44.functions.invoke('sendCertificationEmail', { form });
      alert("Solicitud enviada exitosamente a gerencia");
      closeForm();
    } catch (error) {
      alert("Error al enviar la solicitud: " + error.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empresa Operadora</h1>
            <p className="text-sm text-muted-foreground">Gestión RAC 100 · Certificación AAC Colombia</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4" /> Registrar Empresa
        </Button>
      </div>

      {/* Stats globales */}
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
         {[
            { label: "Empresas", val: companies.length, icon: Building2, color: "text-sky-500", bg: "bg-sky-50" },
            ...(totalPilots > 0 ? [{ label: "Pilotos Activos", val: `${activePilots}/${totalPilots}`, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" }] : []),
            ...(totalDrones > 0 ? [{ label: "Drones Operativos", val: `${operativeDrones}/${totalDrones}`, icon: Shield, color: "text-blue-600", bg: "bg-blue-50" }] : []),
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
              <div className="flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                  <div className="text-2xl font-bold">{s.val}</div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Lista de Empresas */}
      <div className="space-y-4">
        {companies.length === 0 && (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No hay empresas registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Registra tu empresa operadora de drones ante la AAC</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Registrar Empresa
            </Button>
          </div>
        )}

        {companies.map((company) => {
          const companyPilots = getCompanyPilots(company.id);
          const chiefPilot = pilots.find(p => p.id === company.chief_pilot_id);
          const certDays = company.aac_cert_expiry ? differenceInDays(new Date(company.aac_cert_expiry), new Date()) : null;

          return (
            <div key={company.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              {/* Company Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-7 h-7 text-sky-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">{company.name}</h2>
                      <Badge className={company.status === "activa" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {company.status}
                      </Badge>
                    </div>
                    {company.nit && <p className="text-sm text-muted-foreground">NIT: {company.nit}</p>}
                    {company.city && <p className="text-xs text-muted-foreground">{company.city} · {company.address}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(company)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(company.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Certificaciones */}
              <div className="flex flex-wrap gap-2 mb-5">
                {company.aac_cert_number && (
                  <ExpiryBadge date={company.aac_cert_expiry} label={`Cert. AAC ${company.aac_cert_number}`} />
                )}
                {company.insurance_policy_number && (
                  <ExpiryBadge date={company.insurance_expiry} label={`Póliza ${company.insurance_policy_number}`} />
                )}
              </div>

              {/* Grid de info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Contacto */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</h4>
                  {company.phone && (
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{company.phone}</div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{company.email}</div>
                  )}
                </div>

                {/* SMS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gerente SMS</h4>
                  {company.sms_manager_name ? (
                    <>
                      <div className="flex items-center gap-2 text-sm font-medium"><Shield className="w-3.5 h-3.5 text-sky-500" />{company.sms_manager_name}</div>
                      {company.sms_manager_email && <p className="text-xs text-muted-foreground">{company.sms_manager_email}</p>}
                    </>
                  ) : <p className="text-xs text-muted-foreground">No asignado</p>}
                  {chiefPilot && (
                    <div className="mt-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jefe de Pilotos</h4>
                      <div className="flex items-center gap-2 text-sm font-medium text-sky-600">
                        <Users className="w-3.5 h-3.5" />{chiefPilot.full_name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pilotos Asignados */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipo de Vuelo</h4>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{companyPilots.length} pilotos asignados</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {companyPilots.slice(0, 5).map(p => (
                      <span key={p.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {p.role === "jefe_pilotos" ? "👔" : "👨‍✈️"} {p.full_name.split(" ")[0]}
                      </span>
                    ))}
                    {companyPilots.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{companyPilots.length - 5} más</span>
                    )}
                  </div>
                  {company.operations_manual_version && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" /> Manual v{company.operations_manual_version}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-500" />
              {editingCompany ? "Editar Empresa Operadora" : "Registrar Empresa Operadora"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Datos básicos */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos de la Empresa</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nombre de la Empresa *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AeroOps Colombia S.A.S." required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">NIT</label>
                    <Input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="900.123.456-7" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado</label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activa">Activa</SelectItem>
                        <SelectItem value="suspendida">Suspendida</SelectItem>
                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Ciudad</label>
                    <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Bogotá" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Dirección</label>
                    <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Certificación AAC */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certificación AAC / RAC 100</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Fase de Registro RAC 100</label>
                  <Select value={form.aac_cert_phase || ""} onValueChange={v => setForm({ ...form, aac_cert_phase: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar fase..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fase_0">Fase 0</SelectItem>
                      <SelectItem value="fase_1">Fase 1</SelectItem>
                      <SelectItem value="fase_2">Fase 2</SelectItem>
                      <SelectItem value="fase_3">Fase 3</SelectItem>
                      <SelectItem value="fase_4">Fase 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Actividad</label>
                  <Select value={form.activity_type || ""} onValueChange={v => setForm({ ...form, activity_type: v, custom_activity: "" })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar actividad..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fotografia_aerea">Fotografía Aérea</SelectItem>
                      <SelectItem value="video_cinematografico">Video Cinematográfico</SelectItem>
                      <SelectItem value="inspeccion_infraestructura">Inspección de Infraestructura</SelectItem>
                      <SelectItem value="mapeo_fotogrametria">Mapeo y Fotogrametría</SelectItem>
                      <SelectItem value="agricultura_precision">Agricultura de Precisión</SelectItem>
                      <SelectItem value="busqueda_rescate">Búsqueda y Rescate</SelectItem>
                      <SelectItem value="vigilancia_seguridad">Vigilancia y Seguridad</SelectItem>
                      <SelectItem value="entrega_carga">Entrega de Carga</SelectItem>
                      <SelectItem value="topografia">Topografía</SelectItem>
                      <SelectItem value="termografia">Termografía</SelectItem>
                      <SelectItem value="inspeccion_torres">Inspección de Torres</SelectItem>
                      <SelectItem value="inspeccion_lineas">Inspección de Líneas</SelectItem>
                      <SelectItem value="eventos_publicos">Eventos Públicos</SelectItem>
                      <SelectItem value="publicidad_marketing">Publicidad y Marketing</SelectItem>
                      <SelectItem value="bvlos">BVLOS</SelectItem>
                      <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
                      <SelectItem value="prueba_tecnica">Prueba Técnica</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.activity_type === "otro" && (
                    <Input 
                      type="text" 
                      placeholder="Especificar actividad..." 
                      value={form.custom_activity || ""} 
                      onChange={e => setForm({ ...form, custom_activity: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Tipo de Operación UAS Categoría Específica</label>
                <Select value={form.operation_category_type || ""} onValueChange={v => setForm({ ...form, operation_category_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo de operación..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple_captura">Simple captura de imágenes o datos</SelectItem>
                    <SelectItem value="vigilancia_seguridad">Captura de imágenes o datos con fines de vigilancia o seguridad privada</SelectItem>
                    <SelectItem value="medios_comunicacion">Captura de imágenes o datos para medios de comunicación masiva</SelectItem>
                    <SelectItem value="aspersion">Aspersión</SelectItem>
                    <SelectItem value="dispersion">Dispersión</SelectItem>
                    <SelectItem value="enjambre">Enjambre</SelectItem>
                    <SelectItem value="transporte_carga">Transporte de Carga (Drone Delivery)</SelectItem>
                    <SelectItem value="actividades_publicas">Actividades misionales de entidades públicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gerente SMS */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sistema de Gestión de Seguridad (SMS)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nombre Gerente SMS</label>
                  <Input value={form.sms_manager_name} onChange={e => setForm({ ...form, sms_manager_name: e.target.value })} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email Gerente SMS</label>
                  <Input type="email" value={form.sms_manager_email} onChange={e => setForm({ ...form, sms_manager_email: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Jefe de Pilotos</label>
                <Input value={form.chief_pilot_name || ""} onChange={e => setForm({ ...form, chief_pilot_name: e.target.value })} placeholder="Nombre completo" />
              </div>
            </div>

            {/* Vuelos Especiales */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vuelos Especiales Autorizados</h3>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                {specialFlightsOptions.map(option => (
                  <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                    <Checkbox 
                      checked={(Array.isArray(form.special_flights) ? form.special_flights : []).includes(option.value)}
                      onCheckedChange={(checked) => {
                        const current = Array.isArray(form.special_flights) ? form.special_flights : [];
                        const updated = checked 
                          ? [...current, option.value]
                          : current.filter(v => v !== option.value);
                        setForm({ ...form, special_flights: updated });
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm leading-relaxed">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipos Tecnológicos */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Equipos Tecnológicos</h3>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg mb-3">
                {techEquipmentOptions.map(option => (
                  <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                    <Checkbox 
                      checked={(Array.isArray(form.tech_equipment) ? form.tech_equipment : []).includes(option.value)}
                      onCheckedChange={(checked) => {
                        const current = Array.isArray(form.tech_equipment) ? form.tech_equipment : [];
                        const updated = checked 
                          ? [...current, option.value]
                          : current.filter(v => v !== option.value);
                        setForm({ ...form, tech_equipment: updated });
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm leading-relaxed">{option.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Otros Equipos</label>
                <Input 
                  value={form.other_equipment || ""} 
                  onChange={e => setForm({ ...form, other_equipment: e.target.value })}
                  placeholder="Especificar otros equipos..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Observaciones</h3>
              <textarea 
                value={form.notes || ""} 
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Comentarios adicionales sobre la solicitud..."
                className="w-full border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows="4"
              />
            </div>

            {/* Referencias de Drones */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Referencias de Drones</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    placeholder="Ej: DJI Phantom 4 Pro"
                    value={droneInput}
                    onChange={e => setDroneInput(e.target.value)}
                    className="col-span-2"
                  />
                  <Input 
                    type="number"
                    placeholder="Cantidad"
                    min="1"
                    value={quantityInput}
                    onChange={e => setQuantityInput(e.target.value)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (droneInput && quantityInput) {
                      const current = Array.isArray(form.drone_references) ? form.drone_references : [];
                      setForm({ 
                        ...form, 
                        drone_references: [...current, { model: droneInput, quantity: parseInt(quantityInput) }]
                      });
                      setDroneInput("");
                      setQuantityInput("");
                    }
                  }}
                >
                  <Plus className="w-4 h-4" /> Agregar Drone
                </Button>
                {Array.isArray(form.drone_references) && form.drone_references.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    {form.drone_references.map((drone, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-background rounded p-2 text-sm">
                        <span className="font-medium">{drone.model}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Cantidad: {drone.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = form.drone_references.filter((_, i) => i !== idx);
                              setForm({ ...form, drone_references: updated });
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="button" variant="outline" onClick={handleSendCertificationConsult}>
                Consultar Asesoría Certificación
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                {editingCompany ? "Actualizar" : "Registrar Empresa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}