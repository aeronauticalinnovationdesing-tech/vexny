import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, CheckCircle2, Circle, Mail, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState as useLocalState } from "react";
import { toast } from "sonner";

const defaults = {
  name: "", description: "", status: "planning", priority: "medium",
  budget: 0, color: "#F59E0B", start_date: "", end_date: "",
  team_members: [], tags: [], milestones: []
};

export default function ProjectForm({ open, onOpenChange, onSave, project }) {
  const [form, setForm] = useState(defaults);
  const [newMember, setNewMember] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", date: "" });

  useEffect(() => {
    setForm(project ? { ...defaults, ...project } : defaults);
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, budget: Number(form.budget) || 0 });
    onOpenChange(false);
  };

  const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const addMember = async () => {
    if (!newMember.trim()) return;
    const member = newMember.trim();
    setForm(f => ({ ...f, team_members: [...(f.team_members || []), member] }));
    setNewMember("");

    if (isEmail(member)) {
      setSendingEmail(true);
      await base44.integrations.Core.SendEmail({
        to: member,
        subject: `🗡️ Has sido invitado al proyecto "${form.name}" en VEXNY`,
        body: `
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 16px; border: 1px solid #e5e7eb;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
    <div style="width: 40px; height: 40px; background: #F59E0B; border-radius: 10px; display: flex; align-items: center; justify-center: center; text-align: center; line-height: 40px; font-size: 20px;">⚔️</div>
    <span style="font-size: 22px; font-weight: 800; color: #111;">VEXNY</span>
  </div>
  <h2 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">¡Fuiste convocado al campo de batalla!</h2>
  <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
    Has sido agregado al proyecto <strong style="color: #111;">${form.name}</strong>.
    ${form.description ? `<br/><em>${form.description}</em>` : ""}
  </p>
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 13px; color: #92400e;">
      💪 <strong>Mentalidad Gladiador:</strong> "La victoria pertenece a los que perseveran."
    </p>
  </div>
  <p style="color: #9ca3af; font-size: 13px; margin: 0;">
    Ingresa a <strong>VEXNY</strong> para ver las tareas asignadas, fechas y más.
  </p>
</div>
        `,
      });
      setSendingEmail(false);
      toast.success(`📧 Invitación enviada a ${member}`);
    }
  };

  const removeMember = (i) => setForm({ ...form, team_members: form.team_members.filter((_, idx) => idx !== i) });

  const addTag = () => {
    if (!newTag.trim()) return;
    setForm({ ...form, tags: [...(form.tags || []), newTag.trim()] });
    setNewTag("");
  };

  const removeTag = (i) => setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) });

  const addMilestone = () => {
    if (!newMilestone.title.trim()) return;
    setForm({ ...form, milestones: [...(form.milestones || []), { ...newMilestone, completed: false }] });
    setNewMilestone({ title: "", date: "" });
  };

  const toggleMilestone = (i) => {
    const updated = form.milestones.map((m, idx) => idx === i ? { ...m, completed: !m.completed } : m);
    setForm({ ...form, milestones: updated });
  };

  const removeMilestone = (i) => setForm({ ...form, milestones: form.milestones.filter((_, idx) => idx !== i) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
              <TabsTrigger value="team" className="flex-1">Equipo & Tags</TabsTrigger>
              <TabsTrigger value="milestones" className="flex-1">Hitos</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div>
                <Label>Nombre del Proyecto *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del proyecto" required />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="¿De qué trata este proyecto?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planeación</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">🔥 Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Presupuesto ($)</Label>
                <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10 w-16 p-1 cursor-pointer" />
                  <span className="text-sm text-muted-foreground">Color del proyecto</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-5">
              <div>
                <Label className="mb-2 block">Miembros del Equipo</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={newMember} onChange={e => setNewMember(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMember())} placeholder="Nombre o email..." className="flex-1" />
                  <Button type="button" size="sm" onClick={addMember} variant="outline" disabled={sendingEmail}>
                    {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.team_members || []).map((m, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{m[0]?.toUpperCase()}</span>
                      {m}
                      <button type="button" onClick={() => removeMember(i)} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Etiquetas</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Nueva etiqueta..." className="flex-1" />
                  <Button type="button" size="sm" onClick={addTag} variant="outline"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.tags || []).map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm">
                      #{tag}
                      <button type="button" onClick={() => removeTag(i)} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="space-y-4">
              <div className="flex gap-2">
                <Input value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })} placeholder="Nombre del hito..." className="flex-1" />
                <Input type="date" value={newMilestone.date} onChange={e => setNewMilestone({ ...newMilestone, date: e.target.value })} className="w-36" />
                <Button type="button" size="sm" onClick={addMilestone} variant="outline"><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="space-y-2">
                {(form.milestones || []).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 group">
                    <button type="button" onClick={() => toggleMilestone(i)}>
                      {m.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <span className={`text-sm flex-1 ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                    {m.date && <span className="text-xs text-muted-foreground">{m.date}</span>}
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeMilestone(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(form.milestones || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin hitos definidos</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar Proyecto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}