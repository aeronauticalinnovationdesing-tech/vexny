import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Check } from "lucide-react";

export default function CourseUploadForm({ open, onClose, onSaved }) {
  const PROFILES = [
    { value: "trader", label: "Trader" },
    { value: "drone_pilot", label: "Piloto de Drones" },
    { value: "startup", label: "Startup" },
    { value: "elite_human", label: "Elite Human" },
  ];

  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "otro",
    duration_hours: "", is_published: true, target_profiles: []
  });

  const toggleProfile = (value) => {
    setForm(f => ({
      ...f,
      target_profiles: f.target_profiles.includes(value)
        ? f.target_profiles.filter(p => p !== value)
        : [...f.target_profiles, value]
    }));
  };
  const [pdfFile, setPdfFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let pdf_url = "";
    let thumbnail_url = "";

    if (pdfFile) {
      const res = await base44.integrations.Core.UploadFile({ file: pdfFile });
      pdf_url = res.file_url;
    }
    if (thumbFile) {
      const res = await base44.integrations.Core.UploadFile({ file: thumbFile });
      thumbnail_url = res.file_url;
    }

    await base44.entities.Course.create({
      ...form,
      price: parseFloat(form.price) || 0,
      duration_hours: parseFloat(form.duration_hours) || undefined,
      pdf_url,
      thumbnail_url: thumbnail_url || undefined,
    });

    setLoading(false);
    onSaved();
    onClose();
    setForm({ title: "", description: "", price: "", category: "otro", duration_hours: "", is_published: true, target_profiles: [] });
    setPdfFile(null);
    setThumbFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir nuevo curso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Precio (COP) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="0" />
            </div>
            <div className="space-y-1">
              <Label>Duración (horas)</Label>
              <Input type="number" value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: e.target.value })} min="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="productividad">Productividad</SelectItem>
                <SelectItem value="finanzas">Finanzas</SelectItem>
                <SelectItem value="tecnologia">Tecnología</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="desarrollo_personal">Desarrollo Personal</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>PDF del curso *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('pdf-upload').click()}>
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">{pdfFile ? pdfFile.name : "Clic para subir PDF"}</p>
              <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files[0])} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Imagen de portada (opcional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('thumb-upload').click()}>
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">{thumbFile ? thumbFile.name : "Clic para subir imagen"}</p>
              <input id="thumb-upload" type="file" accept="image/*" className="hidden" onChange={e => setThumbFile(e.target.files[0])} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading || !pdfFile} className="flex-1">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Subiendo...</> : "Publicar curso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}