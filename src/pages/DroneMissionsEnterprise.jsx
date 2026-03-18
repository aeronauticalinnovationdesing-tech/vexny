import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Calendar, Users, Trash2, Pencil, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const emptyForm = {
  name: "",
  description: "",
  status: "planning",
  start_date: "",
  end_date: "",
  color: "#F59E0B",
  priority: "medium",
  team_members: [],
  tags: [],
};

export default function DroneMissionsEnterprise() {
  const user = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [view, setView] = useState("grid");
  const queryClient = useQueryClient();

  // Get company for current user
  const { data: company } = useQuery({
    queryKey: ["company-enterprise", user?.email],
    queryFn: async () => {
      const results = await base44.entities.Company.filter({ created_by: user?.email }, "-created_date");
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  // Get projects/missions for this company - filtered by company_id
  const { data: projects = [] } = useQuery({
    queryKey: ["missions-enterprise", company?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: company.id }, "-created_date"),
    enabled: !!company?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create({ ...data, company_id: company.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions-enterprise"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["missions-enterprise"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missions-enterprise"] }),
  });

  const closeForm = () => { setShowForm(false); setEditingProject(null); setForm({ ...emptyForm }); };

  const openEdit = (project) => {
    setEditingProject(project);
    setForm({ ...emptyForm, ...project });
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (!company) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <MapIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Registra tu empresa primero</p>
          <p className="text-xs text-muted-foreground mt-1">Ve a la sección "Empresa" para configurarla</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MapIcon className="w-7 h-7 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Misiones y Proyectos</h1>
            <p className="text-sm text-muted-foreground">Gestión de operaciones de la empresa</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4" /> Nueva Misión
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", val: stats.total, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Activas", val: stats.active, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Completadas", val: stats.completed, color: "text-primary", bg: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border border-border p-4 flex flex-col gap-1", s.bg)}>
            <div className={cn("text-2xl font-bold", s.color)}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
            <MapIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay misiones registradas</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crear Primera Misión
            </Button>
          </div>
        ) : (
          projects.map(project => (
            <div key={project.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || "#F59E0B" }}
                    />
                    <h3 className="font-bold text-lg">{project.name}</h3>
                    <Badge className={
                      project.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      project.status === "completed" ? "bg-blue-100 text-blue-700" :
                      project.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }>
                      {project.status}
                    </Badge>
                    {project.priority && (
                      <Badge variant="outline" className="text-xs">
                        {project.priority === "high" ? "🔴" : project.priority === "medium" ? "🟡" : "🟢"} {project.priority}
                      </Badge>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {project.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(project.start_date), "dd MMM", { locale: es })}
                      </div>
                    )}
                    {project.end_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(project.end_date), "dd MMM", { locale: es })}
                      </div>
                    )}
                    {project.team_members?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.team_members.length} miembros
                      </div>
                    )}
                  </div>

                  {project.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {project.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(project)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(project.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Editar Misión" : "Nueva Misión"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planificación</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Fin</label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {["#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6"].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={cn("w-8 h-8 rounded-lg border-2", form.color === c ? "border-foreground" : "border-transparent")}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                {editingProject ? "Actualizar" : "Crear Misión"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}