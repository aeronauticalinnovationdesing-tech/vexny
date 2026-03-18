import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Download, Archive, Edit2, Trash2, Upload, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useProfile } from "@/lib/ProfileContext";

export default function ManualsManagement() {
  const { activeProfile } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [editingManual, setEditingManual] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [form, setForm] = useState({
    type: "sms",
    title: "",
    version: "",
    pdf_url: "",
    effective_date: "",
    status: "borrador",
    notes: "",
  });
  const queryClient = useQueryClient();

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ["company-profile"],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user?.email) return null;
      const results = await base44.entities.Company.filter({ created_by: user.email });
      return results[0] || null;
    },
  });

  // Fetch manuals
  const { data: manuals = [] } = useQuery({
    queryKey: ["manuals", company?.id],
    queryFn: () => base44.entities.Manual.filter({ company_id: company.id }, "-created_date"),
    enabled: !!company?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Manual.create({ ...data, company_id: company.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manuals"] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Manual.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manuals"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Manual.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manuals"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingManual(null);
    setForm({ type: "sms", title: "", version: "", pdf_url: "", effective_date: "", status: "borrador", notes: "" });
  };

  const openEdit = (manual) => {
    setEditingManual(manual);
    setForm(manual);
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingManual) {
      updateMutation.mutate({ id: editingManual.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, pdf_url: file_url });
    } finally {
      setUploadingPdf(false);
    }
  };

  const statusColors = {
    borrador: "bg-gray-100 text-gray-700",
    vigente: "bg-green-100 text-green-700",
    archivado: "bg-red-100 text-red-700",
  };

  const typeLabels = { sms: "SMS", mantenimiento: "Mantenimiento", operacional: "Operacional" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Manuales</h2>
            <p className="text-sm text-muted-foreground">Control de versiones y documentación</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Manual
        </Button>
      </div>

      <div className="space-y-3">
        {manuals.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay manuales registrados</p>
          </Card>
        ) : (
          manuals.map((manual) => (
            <Card key={manual.id} className="p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-bold text-lg">{manual.title}</h3>
                    <Badge>{typeLabels[manual.type]}</Badge>
                    <Badge className={statusColors[manual.status]}>{manual.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div>v{manual.version}</div>
                    {manual.effective_date && (
                      <div>Vigencia: {format(new Date(manual.effective_date), "d MMM yyyy", { locale: es })}</div>
                    )}
                    {manual.updated_by && <div>Por: {manual.updated_by}</div>}
                  </div>
                  {manual.notes && <p className="text-sm text-muted-foreground mt-2">{manual.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {manual.pdf_url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={manual.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(manual)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(manual.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="w-full h-[90vh] p-0 flex flex-col">
          <DialogHeader className="border-b p-6">
            <div className="flex items-center justify-between">
              <DialogTitle>Vista Previa PDF</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPdfPreview(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {form.pdf_url && (
              <iframe src={form.pdf_url} className="w-full h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={open => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingManual ? "Editar Manual" : "Nuevo Manual"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Manual *</label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Versión *</label>
                <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.0" required />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Vigencia</label>
                <Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">PDF</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input value={form.pdf_url} onChange={e => setForm({ ...form, pdf_url: e.target.value })} placeholder="https://" disabled className="bg-muted" />
                </div>
                <label>
                  <Button type="button" variant="outline" disabled={uploadingPdf} className="gap-2">
                    <Upload className="w-4 h-4" />
                    {uploadingPdf ? "Subiendo..." : "Subir PDF"}
                  </Button>
                  <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
                </label>
                {form.pdf_url && (
                  <Button type="button" variant="outline" onClick={() => setShowPdfPreview(true)} className="gap-2">
                    <Eye className="w-4 h-4" />
                    Ver
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notas</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="3" className="w-full rounded-md border border-input px-3 py-2 text-sm" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editingManual ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}