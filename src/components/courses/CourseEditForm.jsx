import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { PROFILES } from "@/lib/ProfileContext";

export default function CourseEditForm({ course, open, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(
    course || {
      title: "",
      description: "",
      price: "",
      thumbnail_url: "",
      pdf_url: "",
      category: "otro",
      is_published: false,
      duration_hours: "",
      target_profiles: [],
    }
  );
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title || "",
        description: course.description || "",
        price: course.price || "",
        thumbnail_url: course.thumbnail_url || "",
        pdf_url: course.pdf_url || "",
        category: course.category || "otro",
        is_published: course.is_published || false,
        duration_hours: course.duration_hours || "",
        target_profiles: course.target_profiles || [],
      });
    }
  }, [course, open]);

  const mutation = useMutation({
    mutationFn: (data) =>
      course
        ? base44.entities.Course.update(course.id, data)
        : base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["courses-admin", "courses"]);
      onSaved?.();
      onClose?.();
    },
  });

  const handleUploadThumbnail = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, thumbnail_url: res.file_url });
    } catch (err) {
      console.error(err);
      alert("Error al subir imagen");
    }
    setUploadingThumbnail(false);
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, pdf_url: res.file_url });
    } catch (err) {
      console.error(err);
      alert("Error al subir PDF");
    }
    setUploadingPdf(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      price: form.price ? parseFloat(form.price) : 0,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Editar curso" : "Crear nuevo curso"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label>Título del curso *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Trading Avanzado con Fibonacci"
            />
          </div>

          {/* Descripción */}
          <div>
            <Label>Descripción</Label>
            <textarea
              className="w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el contenido del curso..."
            />
          </div>

          {/* Grid 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Precio */}
            <div>
              <Label>Precio (COP) *</Label>
              <Input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Duración */}
            <div>
              <Label>Duración (horas)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <Label>Categoría</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="productividad">Productividad</option>
              <option value="finanzas">Finanzas</option>
              <option value="tecnologia">Tecnología</option>
              <option value="marketing">Marketing</option>
              <option value="desarrollo_personal">Desarrollo Personal</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Perfiles objetivo */}
          <div>
            <Label>Disponible para (dejar vacío = todos)</Label>
            <div className="space-y-2">
              {PROFILES.map((profile) => (
                <label key={profile.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.target_profiles?.includes(profile.id) || false}
                    onChange={(e) => {
                      const newProfiles = e.target.checked
                        ? [...(form.target_profiles || []), profile.id]
                        : (form.target_profiles || []).filter((p) => p !== profile.id);
                      setForm({ ...form, target_profiles: newProfiles });
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">{profile.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Upload Thumbnail */}
          <div>
            <Label>Imagen miniatura</Label>
            <div className="flex gap-3 items-center">
              <label className="flex-1">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploadingThumbnail ? "Subiendo..." : "Haz clic para subir imagen"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadThumbnail}
                  disabled={uploadingThumbnail}
                  className="hidden"
                />
              </label>
              {form.thumbnail_url && (
                <img
                  src={form.thumbnail_url}
                  alt="Miniatura"
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
            </div>
          </div>

          {/* Upload PDF */}
          <div>
            <Label>PDF del curso *</Label>
            <div className="flex gap-3 items-center">
              <label className="flex-1">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploadingPdf ? "Subiendo..." : "Haz clic para subir PDF"}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUploadPdf}
                  disabled={uploadingPdf}
                  className="hidden"
                />
              </label>
              {form.pdf_url && (
                <div className="text-xs text-green-600 font-medium">✓ PDF cargado</div>
              )}
            </div>
          </div>

          {/* Publicado */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Publicado (visible para usuarios)</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {course ? "Actualizar" : "Crear"} curso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}