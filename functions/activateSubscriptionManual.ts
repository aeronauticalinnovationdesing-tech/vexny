import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Función para que admin active manualmente una suscripción
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userEmail, profile } = await req.json();

    if (!userEmail || !profile) {
      return Response.json({ error: 'userEmail and profile required' }, { status: 400 });
    }

    // Obtener suscripción del perfil
    const subs = await base44.asServiceRole.entities.Subscription.filter({ profile });
    if (subs.length === 0) {
      return Response.json({ error: `No subscription found for profile ${profile}` }, { status: 404 });
    }

    const sub = subs[0];
    const now = new Date();
    const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Activar suscripción
    const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
      is_active: true,
      paid_until: paidUntil.toISOString(),
      auto_renew: true,
      last_renewal_date: now.toISOString(),
    });

    console.log(`✓ Manual subscription activation for ${userEmail} on profile ${profile}`);

    return Response.json({
      success: true,
      message: `Suscripción activada para ${userEmail}`,
      subscription: {
        id: updated.id,
        profile: updated.profile,
        is_active: updated.is_active,
        paid_until: updated.paid_until
      }
    });

  } catch (error) {
    console.error('Error activating subscription:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});