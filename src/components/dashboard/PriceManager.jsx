import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Edit3, Save, X, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROFILES } from "@/lib/ProfileContext";

function InlineEdit({ value, onSave, suffix = "", type = "number" }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEdit = () => { setInput(String(value ?? "")); setEditing(true); };
  const handleSave = async () => {
    const v = type === "number" ? parseFloat(input) : input;
    if (type === "number" && (isNaN(v) || v < 0)) return;
    setSaving(true);
    await onSave(v);
    setEditing(false);
    setSaving(false);
  };

  if (editing) return (
    <div className="flex items-center gap-1.5">
      <Input
        className="w-24 h-8 text-sm"
        type={type}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        autoFocus
        disabled={saving}
        onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      <Button size="icon" className="h-8 w-8" onClick={handleSave} disabled={saving}>
        <Save className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)} disabled={saving}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold">
        {value != null && value !== "" ? `${value}${suffix}` : <span className="text-muted-foreground font-normal">—</span>}
      </span>
      <button onClick={handleEdit} className="text-muted-foreground hover:text-foreground transition-colors">
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ProfilePriceRow({ profile, sub, onSavePrice, onSaveHours }) {
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

      {/* Trial hours */}
      <div className="flex items-center gap-1.5 mr-4">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <InlineEdit
          value={sub?.trial_hours ?? 48}
          onSave={(v) => onSaveHours(profile.id, sub, v)}
          suffix="h prueba"
        />
      </div>

      {/* Price */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">COP $</span>
        <InlineEdit
          value={sub?.monthly_price_cop > 0 ? Number(sub.monthly_price_cop) : null}
          onSave={(v) => onSavePrice(profile.id, sub, v)}
          suffix=""
        />
      </div>
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

  const upsert = (profileId, sub, data) =>
    new Promise((resolve) => {
      if (sub) {
        updateSub.mutate({ id: sub.id, data }, { onSuccess: () => resolve() });
      } else {
        createSub.mutate({ profile: profileId, monthly_price_cop: 0, is_active: false, ...data }, { onSuccess: () => resolve() });
      }
    });

  const handleSavePrice = (profileId, sub, price) => upsert(profileId, sub, { monthly_price_cop: price });
  const handleSaveHours = (profileId, sub, hours) => upsert(profileId, sub, { trial_hours: hours });

  const getSubForProfile = (profileId) => allSubs.find((s) => s.profile === profileId) || null;

  if (user?.role !== "admin") return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-base">Precios y prueba gratuita</h2>
          <p className="text-xs text-muted-foreground">Configura el costo mensual y duración de prueba por perfil</p>
        </div>
      </div>

      <div>
        {PROFILES.map((profile) => (
          <ProfilePriceRow
            key={profile.id}
            profile={profile}
            sub={getSubForProfile(profile.id)}
            onSavePrice={handleSavePrice}
            onSaveHours={handleSaveHours}
          />
        ))}
      </div>
    </div>
  );
}