import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Edit3, Save, X, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROFILES } from "@/lib/ProfileContext";

function ProfilePriceRow({ profile, sub, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const handleEdit = () => {
    setInput(sub?.monthly_price_cop ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    const price = parseFloat(input);
    if (isNaN(price) || price < 0) return;
    onSave(profile.id, sub, price);
    setEditing(false);
  };

  const Icon = profile.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${profile.accent}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: profile.accent }} />
      </div>
      <span className="text-sm font-medium flex-1">{profile.label}</span>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">COP $</span>
          <Input
            className="w-28 h-8 text-sm"
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="icon" className="h-8 w-8" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">
            {sub?.monthly_price_cop > 0
              ? `$${Number(sub.monthly_price_cop).toLocaleString("es-CO")} COP`
              : <span className="text-muted-foreground font-normal">Sin precio</span>}
          </span>
          <button
            onClick={handleEdit}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Editar precio"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PriceManager() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subscriptions-admin"],
    queryFn: () => base44.entities.Subscription.list(),
  });

  const createSub = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-subscriptions-admin"] }),
  });

  const updateSub = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-subscriptions-admin"] }),
  });

  const handleSave = (profileId, sub, price) => {
    if (sub) {
      updateSub.mutate({ id: sub.id, data: { monthly_price_cop: price } });
    } else {
      createSub.mutate({ profile: profileId, monthly_price_cop: price, is_active: false });
    }
  };

  const getSubForProfile = (profileId) => allSubs.find((s) => s.profile === profileId) || null;

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-base">Precios de suscripción</h2>
          <p className="text-xs text-muted-foreground">Configura el costo mensual por perfil</p>
        </div>
      </div>

      {allSubs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando precios...</p>
      ) : (
        <div>
          {PROFILES.map((profile) => (
            <ProfilePriceRow
              key={profile.id}
              profile={profile}
              sub={getSubForProfile(profile.id)}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}