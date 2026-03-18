import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Plus, Pencil, Trash2, AlertTriangle, CheckCircle,
  Phone, Mail, Shield, Users
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "", nit: "", aac_cert_number: "", aac_cert_expiry: "",
  address: "", city: "", phone: "", email: "",
  sms_manager_name: "", sms_manager_email: "",
  operations_manual_version: "", insurance_policy_number: "", insurance_expiry: "",
  status: "activa",
};

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

export default function CompanyManagementEnterprise() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ["company-enterprise", user?.email],
    queryFn: async () => {
      const results = await base44.entities.Company.filter({ created_by: user?.email }, "-created_date");
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: pilots = [] } = useQuery({
    queryKey: ["pilots-enterprise", company?.id],
    queryFn: () => base44.entities.Pilot.filter({ company_id: company?.id }, "-created_date"),
    enabled: !!company?.id,
  });

  const { data: drones = [] } = useQuery({
    queryKey: ["drones-enterprise", company?.id],
    queryFn: () => base44.entities.Drone.list("-created_date"),
    enabled: !!company?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-enterprise"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company-enterprise"] }); closeForm(); },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setForm({ ...emptyForm });
  };

  const openEdit = () => {
    if (company) {
      setEditingCompany(company);
      setForm({ ...emptyForm, ...company });
      setShowForm(true);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const activePilots = pilots.filter(p => p.status === "activo").length;
  const operativeDrones = drones.filter(d => d.maintenance_status === "operativo").length;

  if (!company) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-sky-500" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Información de la Empresa</h1>
              <p className="text-sm text-muted-foreground">Detalles de tu organización</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
            <Plus className="w-4 h-4" /> Registrar Empresa
          </Button>
        </div>

        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No hay empresa registrada</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Registrar Empresa
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-500" />
                Registrar Empresa Operadora
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos de la Empresa</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nombre de la Empresa *</label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mi Empresa de Drones S.A.S." required />
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

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certificación AAC</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Número Certificado AAC</label>
                    <Input value={form.aac_cert_number} onChange={e => setForm({ ...form, aac_cert_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vencimiento</label>
                    <Input type="date" value={form.aac_cert_expiry} onChange={e => setForm({ ...form, aac_cert_expiry: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seguro</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Número Póliza</label>
                    <Input value={form.insurance_policy_number} onChange={e => setForm({ ...form, insurance_policy_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vencimiento</label>
                    <Input type="date" value={form.insurance_expiry} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sistema de Gestión de Seguridad (SMS)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Nombre Gerente SMS</label>
                    <Input value={form.sms_manager_name} onChange={e => setForm({ ...form, sms_manager_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Gerente SMS</label>
                    <Input type="email" value={form.sms_manager_email} onChange={e => setForm({ ...form, sms_manager_email: e.target.value })} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-700">Registrar Empresa</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Información de la Empresa</h1>
            <p className="text-sm text-muted-foreground">Detalles de tu organización</p>
          </div>
        </div>
        <Button onClick={openEdit} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Pencil className="w-4 h-4" /> Editar Empresa
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Estado", val: company.status, color: company.status === "activa" ? "text-emerald-600" : "text-red-600", bg: company.status === "activa" ? "bg-emerald-50" : "bg-red-50" },
          { label: "Pilotos Activos", val: `${activePilots}/${pilots.length}`, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Drones Operativos", val: `${operativeDrones}/${drones.length}`, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Equipos", val: pilots.length + drones.length, color: "text-primary", bg: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border border-border p-4 flex flex-col gap-1", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
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
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {company.aac_cert_number && (
            <ExpiryBadge date={company.aac_cert_expiry} label={`Cert. AAC ${company.aac_cert_number}`} />
          )}
          {company.insurance_policy_number && (
            <ExpiryBadge date={company.insurance_expiry} label={`Póliza ${company.insurance_policy_number}`} />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</h4>
            {company.phone && (
              <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{company.phone}</div>
            )}
            {company.email && (
              <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{company.email}</div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gerente SMS</h4>
            {company.sms_manager_name ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium"><Shield className="w-3.5 h-3.5 text-sky-500" />{company.sms_manager_name}</div>
                {company.sms_manager_email && <p className="text-xs text-muted-foreground">{company.sms_manager_email}</p>}
              </>
            ) : <p className="text-xs text-muted-foreground">No asignado</p>}
          </div>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-500" />
              Editar Empresa Operadora
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos de la Empresa</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nombre de la Empresa *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">NIT</label>
                    <Input value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} />
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
                    <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
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

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certificación AAC</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Número Certificado AAC</label>
                  <Input value={form.aac_cert_number} onChange={e => setForm({ ...form, aac_cert_number: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Vencimiento</label>
                  <Input type="date" value={form.aac_cert_expiry} onChange={e => setForm({ ...form, aac_cert_expiry: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seguro</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Número Póliza</label>
                  <Input value={form.insurance_policy_number} onChange={e => setForm({ ...form, insurance_policy_number: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Vencimiento</label>
                  <Input type="date" value={form.insurance_expiry} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sistema de Gestión de Seguridad (SMS)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nombre Gerente SMS</label>
                  <Input value={form.sms_manager_name} onChange={e => setForm({ ...form, sms_manager_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Email Gerente SMS</label>
                  <Input type="email" value={form.sms_manager_email} onChange={e => setForm({ ...form, sms_manager_email: e.target.value })} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">Actualizar Empresa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}