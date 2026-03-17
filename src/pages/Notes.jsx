import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, StickyNote, Pin, Trash2, Pencil, Search, X, Maximize2, Copy, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const categoryLabels = { general: "General", project: "Proyecto", personal: "Personal", ideas: "Ideas", meeting: "Reunión" };
const categoryColors = {
  general: "bg-blue-100 text-blue-700 border-blue-200",
  project: "bg-amber-100 text-amber-700 border-amber-200",
  personal: "bg-purple-100 text-purple-700 border-purple-200",
  ideas: "bg-green-100 text-green-700 border-green-200",
  meeting: "bg-orange-100 text-orange-700 border-orange-200",
};
const noteColors = [
  { label: "Amarillo", value: "#fffbeb", border: "#fde68a" },
  { label: "Verde", value: "#f0fdf4", border: "#bbf7d0" },
  { label: "Azul", value: "#eff6ff", border: "#bfdbfe" },
  { label: "Rosa", value: "#fdf2f8", border: "#f5d0fe" },
  { label: "Naranja", value: "#fff7ed", border: "#fed7aa" },
  { label: "Blanco", value: "#ffffff", border: "#e5e7eb" },
];



export default function Notes() {
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [viewNote, setViewNote] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general", pinned: false, color: "#ffffff" });
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", user?.email],
    queryFn: () => base44.entities.Note.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notes"] }); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notes"] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  const resetForm = () => {
    setForm({ title: "", content: "", category: "general", pinned: false, color: "#ffffff" });
    setEditNote(null);
    setShowForm(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editNote) {
      updateMutation.mutate({ id: editNote.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({
      title: note.title,
      content: note.content || "",
      category: note.category || "general",
      pinned: note.pinned || false,
      color: note.color || "#ffffff",
    });
    setShowForm(true);
  };

  const togglePin = (note) => {
    updateMutation.mutate({ id: note.id, data: { ...note, pinned: !note.pinned } });
  };

  const copyNote = (note) => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content || ""}`);
    toast.success("Nota copiada al portapapeles");
  };

  const improveWithAI = async () => {
    if (!form.content) return toast.error("Escribe algo primero");
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Mejora y enriquece el siguiente texto de una nota personal. Hazlo más claro, organizado y profesional. Mantén el idioma original (español). Devuelve SOLO el texto mejorado sin formato HTML. Texto original:\n\n${form.content}`,
    });
    setForm(f => ({ ...f, content: result }));
    setAiLoading(false);
    toast.success("✨ Nota mejorada con IA");
  };

  const filtered = useMemo(() => {
    let list = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    if (filterCategory !== "all") list = list.filter(n => n.category === filterCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
    }
    return list;
  }, [notes, search, filterCategory]);

  const getColor = (value) => noteColors.find(c => c.value === value) || noteColors[5];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <StickyNote className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
          <Badge variant="outline" className="text-xs">{notes.length}</Badge>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Nota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory("all")}
          >Todas</Button>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <Button
              key={k}
              variant={filterCategory === k ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(filterCategory === k ? "all" : k)}
            >{v}</Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterCategory !== "all" ? "No se encontraron notas." : "Aún no tienes notas. ¡Empieza a escribir!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(note => {
            const c = getColor(note.color);
            return (
              <div
                key={note.id}
                className="rounded-2xl border p-4 hover:shadow-lg transition-all group relative flex flex-col cursor-pointer"
                style={{ backgroundColor: c.value, borderColor: c.border }}
                onClick={() => setViewNote(note)}
              >
                {note.pinned && (
                  <Pin className="w-3.5 h-3.5 text-primary absolute top-3 right-3 fill-primary" />
                )}
                <h3 className="font-semibold text-sm mb-1 pr-5 line-clamp-2">{note.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-4 flex-1 whitespace-pre-wrap">
                  {note.content || ""}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <Badge className={cn("text-xs border", categoryColors[note.category] || categoryColors.general)}>
                    {categoryLabels[note.category] || "General"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {note.created_date && format(new Date(note.created_date), "d MMM", { locale: es })}
                  </span>
                </div>
                <div
                  className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => togglePin(note)} title="Fijar">
                    <Pin className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(note)} title="Editar">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyNote(note)} title="Copiar">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewNote(note)} title="Expandir">
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(note.id)} title="Eliminar">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Note Modal */}
      <Dialog open={!!viewNote} onOpenChange={v => { if (!v) setViewNote(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewNote && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-xl">{viewNote.title}</DialogTitle>
                  <Badge className={cn("text-xs border shrink-0", categoryColors[viewNote.category] || categoryColors.general)}>
                    {categoryLabels[viewNote.category] || "General"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {viewNote.created_date && format(new Date(viewNote.created_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </DialogHeader>
              <p className="text-sm mt-2 whitespace-pre-wrap text-foreground/90">
                {viewNote.content || "Sin contenido."}
              </p>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => { setViewNote(null); openEdit(viewNote); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyNote(viewNote)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) resetForm(); else setShowForm(true); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editNote ? "Editar Nota" : "Nueva Nota"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Título de la nota..."
                required
              />
            </div>

            {/* Color picker */}
            <div>
              <Label>Color de la nota</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {noteColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      form.color === c.value ? "border-primary scale-110 shadow-md" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.value, outlineColor: c.border }}
                    onClick={() => setForm({ ...form, color: c.value })}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Rich text editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Contenido</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={improveWithAI}
                  disabled={aiLoading}
                >
                  <Wand2 className="w-3 h-3" />
                  {aiLoading ? "Mejorando..." : "Mejorar con IA"}
                </Button>
              </div>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Escribe tu nota aquí..."
                className="w-full min-h-[200px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={e => setForm({ ...form, pinned: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5" /> Fijar nota
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}