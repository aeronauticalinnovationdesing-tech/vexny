import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, Clock, Calendar, User, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-primary/10 text-primary",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const priorityLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };
const statusLabels = {
  backlog: "Backlog", pending: "Por Hacer", in_progress: "En Progreso",
  review: "Revisión", completed: "Completado", cancelled: "Cancelado"
};

export default function TaskDetailModal({ task, open, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(task || {});
  const [newCheckItem, setNewCheckItem] = useState("");

  React.useEffect(() => { setForm(task || {}); }, [task]);

  if (!task) return null;

  const checklist = form.checklist || [];
  const checkDone = checklist.filter(c => c.done).length;
  const checkPct = checklist.length > 0 ? Math.round((checkDone / checklist.length) * 100) : 0;

  const toggleCheck = (i) => {
    const updated = checklist.map((c, idx) => idx === i ? { ...c, done: !c.done } : c);
    setForm({ ...form, checklist: updated });
  };

  const addCheck = () => {
    if (!newCheckItem.trim()) return;
    setForm({ ...form, checklist: [...checklist, { text: newCheckItem, done: false }] });
    setNewCheckItem("");
  };

  const removeCheck = (i) => {
    setForm({ ...form, checklist: checklist.filter((_, idx) => idx !== i) });
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Detalle de Tarea</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <Input
              value={form.title || ""}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              placeholder="Título de la tarea"
            />
          </div>

          {/* Status + Priority */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={form.status || "pending"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Prioridad</Label>
              <Select value={form.priority || "medium"} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Asignado</Label>
              <Input value={form.assignee || ""} onChange={e => setForm({ ...form, assignee: e.target.value })} className="h-9" placeholder="Nombre" />
            </div>
          </div>

          {/* Dates + Hours */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha inicio</Label>
              <Input type="date" value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} className="h-9" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha límite</Label>
              <Input type="date" value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} className="h-9" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Horas est.</Label>
              <Input type="number" value={form.estimated_hours || ""} onChange={e => setForm({ ...form, estimated_hours: Number(e.target.value) })} className="h-9" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Horas log.</Label>
              <Input type="number" value={form.logged_hours || ""} onChange={e => setForm({ ...form, logged_hours: Number(e.target.value) })} className="h-9" />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[80px] mt-1" placeholder="Detalles, contexto, notas..." />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Lista de verificación</Label>
              {checklist.length > 0 && (
                <span className="text-xs text-muted-foreground">{checkPct}%</span>
              )}
            </div>
            {checklist.length > 0 && <Progress value={checkPct} className="h-1 mb-3" />}
            <div className="space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <Checkbox checked={item.done} onCheckedChange={() => toggleCheck(i)} />
                  <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.text}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeCheck(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newCheckItem}
                onChange={e => setNewCheckItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCheck())}
                placeholder="Añadir elemento..."
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addCheck} className="h-8"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="destructive" size="sm" onClick={() => { onDelete(task); onClose(); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}