import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function InternalAudits() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [form, setForm] = useState({
    audit_date: format(new Date(), "yyyy-MM-dd"),
    auditor_name: user?.full_name || "",
    auditor_role: "jefe_pilotos_uas",
    area_audited: "operacional",
    findings: [],
    recommendations: "",
    status: "completada",
  });
  const [newFinding, setNewFinding] = useState({ finding: "", severity: "menor", status: "abierto" });
  const queryClient = useQueryClient();

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ["company-profile"],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.Company.filter({ created_by: user.email });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  // Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["audits", company?.id],
    queryFn: () => base44.entities.InternalAudit.filter({ company_id: company.id }, "-audit_date"),
    enabled: !!company?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InternalAudit.create({ ...data, company_id: company.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["audits"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InternalAudit.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["audits"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InternalAudit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["audits"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingAudit(null);
    setForm({
      audit_date: format(new Date(), "yyyy-MM-dd"),
      auditor_name: user?.full_name || "",
      auditor_role: "jefe_pilotos_uas",
      area_audited: "operacional",
      findings: [],
      recommendations: "",
      status: "completada",
    });
    setNewFinding({ finding: "", severity: "menor", status: "abierto" });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingAudit) {
      updateMutation.mutate({ id: editingAudit.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const addFinding = () => {
    if (newFinding.finding.trim()) {
      setForm(prev => ({ ...prev, findings: [...prev.findings, { ...newFinding }] }));
      setNewFinding({ finding: "", severity: "menor", status: "abierto" });
    }
  };

  const removeFinding = (idx) => {
    setForm({ ...form, findings: form.findings.filter((_, i) => i !== idx) });
  };

  const severityColors = {
    menor: "bg-yellow-100 text-yellow-700",
    mayor: "bg-orange-100 text-orange-700",
    critica: "bg-red-100 text-red-700",
  };

  const openFindings = audits.flatMap(a => a.findings || []).filter(f => f.status === "abierto").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Auditorías Internas</h2>
            <p className="text-sm text-muted-foreground">Jefe Pilotos UAS / Gerente SMS</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Auditoría
        </Button>
      </div>

      {openFindings > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700">{openFindings} hallazgos abiertos</p>
            <p className="text-sm text-orange-600">Requieren seguimiento y cierre</p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {audits.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay auditorías registradas</p>
          </Card>
        ) : (
          audits.map((audit) => (
            <Card key={audit.id} className="p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{audit.area_audited}</h3>
                    <Badge>{audit.auditor_role === "jefe_pilotos_uas" ? "Jefe Pilotos" : "Gerente SMS"}</Badge>
                    <Badge className={audit.status === "completada" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {audit.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <span>{format(new Date(audit.audit_date), "d MMM yyyy", { locale: es })}</span>
                    <span>•</span>
                    <span>{audit.auditor_name}</span>
                  </div>
                  {audit.findings?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold">Hallazgos:</p>
                      <div className="space-y-1">
                        {audit.findings.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Badge className={severityColors[f.severity]}>{f.severity}</Badge>
                            <span>{f.finding}</span>
                            <Badge variant="outline" className="text-xs">{f.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {audit.recommendations && (
                    <p className="text-sm text-muted-foreground mt-2"><strong>Recomendaciones:</strong> {audit.recommendations}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingAudit(audit); setForm(audit); setShowForm(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(audit.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAudit ? "Editar Auditoría" : "Nueva Auditoría"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha *</label>
                <Input type="date" value={form.audit_date} onChange={e => setForm({ ...form, audit_date: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Auditor</label>
                <Input value={form.auditor_name} onChange={e => setForm({ ...form, auditor_name: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rol del Auditor *</label>
                <Select value={form.auditor_role} onValueChange={v => setForm({ ...form, auditor_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jefe_pilotos_uas">Jefe Pilotos UAS</SelectItem>
                    <SelectItem value="gerente_sms">Gerente SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Área Auditada *</label>
                <Select value={form.area_audited} onValueChange={v => setForm({ ...form, area_audited: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="seguridad">Seguridad</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="documentacion">Documentación</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Hallazgos</label>
              <div className="space-y-2 mb-3 p-3 bg-muted rounded-lg">
                {form.findings.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <Badge className={severityColors[f.severity]}>{f.severity}</Badge>
                      <span className="ml-2">{f.finding}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFinding(i)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={newFinding.severity} onValueChange={v => setNewFinding({ ...newFinding, severity: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menor">Menor</SelectItem>
                    <SelectItem value="mayor">Mayor</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={newFinding.finding} onChange={e => setNewFinding({ ...newFinding, finding: e.target.value })} placeholder="Describir hallazgo..." />
                <Button type="button" variant="outline" onClick={addFinding}>Añadir</Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Recomendaciones</label>
              <textarea value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} rows="3" className="w-full rounded-md border border-input px-3 py-2 text-sm" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editingAudit ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}