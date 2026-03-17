import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, CheckCircle2, Circle, Flame, Brain, Heart, Dumbbell, DollarSign, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const AREAS = [
  { value: "health", label: "🏋️ Salud & Fitness", icon: Dumbbell, color: "text-green-600" },
  { value: "mind", label: "🧠 Mente & Aprendizaje", icon: Brain, color: "text-blue-600" },
  { value: "finances", label: "💰 Finanzas", icon: DollarSign, color: "text-amber-600" },
  { value: "relationships", label: "❤️ Relaciones", icon: Heart, color: "text-pink-600" },
  { value: "personal", label: "🔥 Desarrollo Personal", icon: Flame, color: "text-orange-600" },
];

const priorityColors = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-green-100 text-green-700" };
const priorityLabels = { critical: "Urgente", high: "Alta", medium: "Media", low: "Baja" };

const emptyForm = { title: "", description: "", status: "pending", priority: "high", due_date: "", estimated_hours: "", tags: [] };

export default function EliteHumanGoals() {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [area, setArea] = useState("personal");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: goals = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Task.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditGoal(null);
    setForm({ ...emptyForm });
    setArea("personal");
  };

  const openEdit = (goal) => {
    setEditGoal(goal);
    setForm({ ...goal });
    setArea(goal.tags?.[0] || "personal");
    setShowForm(true);
  };

  const toggleComplete = (goal) => {
    const newStatus = goal.status === "completed" ? "pending" : "completed";
    updateMutation.mutate({ id: goal.id, data: { ...goal, status: newStatus } });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, estimated_hours: Number(form.estimated_hours) || 0, tags: [area] };
    if (editGoal) updateMutation.mutate({ id: editGoal.id, data });
    else createMutation.mutate(data);
  };

  const completedCount = goals.filter(g => g.status === "completed").length;
  const streak = completedCount; // Simplified streak

  const filtered = goals.filter(g => {
    const matchArea = filterArea === "all" || g.tags?.[0] === filterArea;
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? g.status !== "completed" : g.status === "completed");
    return matchArea && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Mis Metas</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4" /> Nueva Meta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{streak}</p>
          <p className="text-xs text-muted-foreground">Logros totales</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completadas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{goals.length - completedCount}</p>
          <p className="text-xs text-muted-foreground">En progreso</p>
        </div>
      </div>

      {/* Area filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterArea("all")}
          className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            filterArea === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
          Todas las áreas
        </button>
        {AREAS.map(a => (
          <button key={a.value} onClick={() => setFilterArea(filterArea === a.value ? "all" : a.value)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterArea === a.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {[{ v: "active", l: "Activas" }, { v: "completed", l: "Completadas" }, { v: "all", l: "Todas" }].map(f => (
          <button key={f.v} onClick={() => setFilterStatus(f.v)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filterStatus === f.v ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
            )}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Goals List */}
      <div className="space-y-2">
        {filtered.map(goal => {
          const areaInfo = AREAS.find(a => a.value === goal.tags?.[0]);
          const isCompleted = goal.status === "completed";
          return (
            <div key={goal.id} className={cn(
              "flex items-start gap-4 p-4 bg-card rounded-xl border transition-all group",
              isCompleted ? "opacity-60 border-border" : "border-border hover:shadow-md"
            )}>
              <button onClick={() => toggleComplete(goal)} className="mt-0.5 flex-shrink-0">
                {isCompleted
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5 text-muted-foreground hover:text-amber-500 transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("font-semibold text-sm", isCompleted && "line-through text-muted-foreground")}>{goal.title}</p>
                  {areaInfo && <span className={cn("text-xs", areaInfo.color)}>{areaInfo.label}</span>}
                  <Badge className={cn("text-xs", priorityColors[goal.priority] || "bg-muted")}>
                    {priorityLabels[goal.priority] || goal.priority}
                  </Badge>
                </div>
                {goal.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>}
                {goal.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {format(new Date(goal.due_date), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(goal)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(goal.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay metas en esta área</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editGoal ? "Editar Meta" : "Nueva Meta"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>¿Qué quieres lograr?</Label>
              <Input placeholder="Ej: Correr 5km sin parar, Leer 2 libros por mes..." value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div><Label>Área de vida</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Urgente</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fecha límite</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div><Label>¿Por qué es importante?</Label>
              <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Tu motivación, el porqué de esta meta..." rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{editGoal ? "Actualizar" : "Crear Meta"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}