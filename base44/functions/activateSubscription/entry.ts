import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Re-activa la suscripción del usuario (cuando ya existe)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profileId } = await req.json();

    // Buscar la suscripción del usuario actual para este perfil
    const subs = await base44.entities.Subscription.filter({ 
      profile: profileId,
      created_by: user.email 
    });
    
    console.log(`[activateSubscription] User: ${user.email}, Profile: ${profileId}, Found subs: ${subs.length}`);
    
    if (subs.length > 0) {
      const now = new Date();
      const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días
      
      await base44.entities.Subscription.update(subs[0].id, {
        is_active: true,
        auto_renew: true,
        paid_until: paidUntil.toISOString(),
        last_renewal_date: now.toISOString(),
      });
      
      console.log(`✓ Subscription reactivated: ${subs[0].id}, paid_until: ${paidUntil.toISOString()}`);
      return Response.json({ success: true });
    } else {
      console.error(`No subscription found for user ${user.email} with profile ${profileId}`);
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('[activateSubscription] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});