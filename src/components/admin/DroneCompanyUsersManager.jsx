import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Users, UserPlus, Pencil, Trash2, DollarSign, Save } from "lucide-react";
import { format } from "date-fns";

export default function DroneCompanyUsersManager() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user", company_id: "" });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  // Edición de precio de drone_company
  const [editingPrice, setEditingPrice] = useState(false);
  const [droneCompanyPrice, setDroneCompanyPrice] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: companySubscriptions = [] } = useQuery({
    queryKey: ["company-subscriptions"],
    queryFn: () => base44.entities.CompanySubscription.list("-created_date"),
  });

  // Precio global para drone_company
  const { data: globalSubs = [], refetch: refetchGlobalSubs } = useQuery({
    queryKey: ["global-sub-drone-company"],
    queryFn: () => base44.entities.Subscription.filter({ profile: "drone_company" }),
  });
  const droneCompanyGlobalSub = globalSubs[0] || null;

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-users"] }),
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg("");
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role);
      setInviteMsg("✓ Invitación enviada a " + inviteForm.email);
      setInviteForm({ email: "", role: "user", company_id: "" });
    } catch (err) {
      setInviteMsg("✗ Error: " + err.message);
    }
    setInviting(false);
  };

  const handleSavePrice = async () => {
    const price = parseFloat(droneCompanyPrice);
    if (isNaN(price)) return;
    if (droneCompanyGlobalSub?.id) {
      await base44.entities.Subscription.update(droneCompanyGlobalSub.id, { monthly_price_cop: price });
    } else {
      await base44.entities.Subscription.create({ profile: "drone_company", monthly_price_cop: price, is_active: false });
    }
    await refetchGlobalSubs();
    setEditingPrice(false);
  };

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || companyId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Empresa de Dron — Usuarios y Costos
        </h2>
        <Button size="sm" className="gap-2" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-4 h-4" /> Invitar Usuario
        </Button>
      </div>

      {/* Precio de la app drone_company */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Costo mensual app Empresa Drone</span>
        </div>
        {editingPrice ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={droneCompanyPrice}
              onChange={e => setDroneCompanyPrice(e.target.value)}
              className="max-w-xs"
              placeholder="Ej: 299000"
            />
            <Button size="sm" className="gap-1" onClick={handleSavePrice}>
              <Save className="w-3.5 h-3.5" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPrice(false)}>Cancelar</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">
              {droneCompanyGlobalSub?.monthly_price_cop
                ? `$${droneCompanyGlobalSub.monthly_price_cop.toLocaleString("es-CO")} COP/mes`
                : "No configurado"}
            </span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => {
              setDroneCompanyPrice(droneCompanyGlobalSub?.monthly_price_cop || "");
              setEditingPrice(true);
            }}>
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          </div>
        )}
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Usuarios registrados ({users.length})</span>
        </div>
        {users.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg text-muted-foreground text-sm">
            No hay usuarios registrados
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.full_name || "Sin nombre"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.created_date && (
                    <p className="text-xs text-muted-foreground">Registro: {format(new Date(u.created_date), "dd/MM/yyyy")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={u.role || "user"}
                    onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {u.role === "admin" ? "Admin" : "Usuario"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suscripciones de empresas */}
      {companySubscriptions.length > 0 && (
        <div className="space-y-3">
          <span className="font-medium text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Empresas con suscripción ({companySubscriptions.length})
          </span>
          <div className="space-y-2">
            {companySubscriptions.map(sub => (
              <div key={sub.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{sub.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ${sub.monthly_price_cop?.toLocaleString("es-CO")} COP/mes ·{" "}
                    {sub.max_pilots} pilotos · {sub.max_drones} drones
                  </p>
                  {sub.admin_user_email && (
                    <p className="text-xs text-muted-foreground">Admin: {sub.admin_user_email}</p>
                  )}
                </div>
                <Badge className={sub.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}>
                  {sub.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Invitar Usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteMsg && (
              <p className={`text-sm font-medium ${inviteMsg.startsWith("✓") ? "text-emerald-600" : "text-destructive"}`}>
                {inviteMsg}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>Cerrar</Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Enviando..." : "Invitar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}