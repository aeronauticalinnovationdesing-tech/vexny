import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Cancela la renovación automática de una suscripción
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscriptionId } = await req.json();

    const sub = await base44.entities.Subscription.filter({ id: subscriptionId });
    if (!sub || sub.length === 0) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const subscription = sub[0];
    
    // Verificar que el usuario sea el dueño
    if (subscription.created_by !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancelar renovación automática (suscripción sigue activa hasta paid_until)
    await base44.entities.Subscription.update(subscription.id, {
      auto_renew: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});