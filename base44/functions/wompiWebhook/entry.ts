import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import crypto from 'node:crypto';

// Webhook que Wompi llama cuando aprueba/rechaza una transacción
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
    if (!integritySecret) {
      return Response.json({ error: 'Missing WOMPI_INTEGRITY_SECRET' }, { status: 500 });
    }

    // Verificar firma de Wompi
    const signature = req.headers.get('x-wompi-signature') || '';
    const body = await req.text();
    const expectedSignature = crypto.createHmac('sha256', integritySecret).update(body).digest('hex');
    
    if (signature !== expectedSignature) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const transaction = event.data?.transaction;

    if (!transaction) {
      return Response.json({ ok: true }); // Ignorar eventos sin transacción
    }

    // Solo procesar transacciones aprobadas y que sean suscripciones
    if (transaction.status !== 'APPROVED') {
      return Response.json({ ok: true }); // Ignorar pagos no aprobados
    }

    const reference = transaction.reference;
    if (!reference || !reference.startsWith('VEXNY-SUB-')) {
      return Response.json({ ok: true }); // No es una suscripción, ignorar
    }

    // Extraer perfil de la referencia: VEXNY-SUB-{profile}-{timestamp}
    const parts = reference.split('-');
    if (parts.length < 4) {
      return Response.json({ ok: true });
    }
    const profile = parts[2]; // trader, drone_pilot, startup, elite_human

    // Obtener email del usuario desde la referencia de Wompi
    const customerEmail = transaction.customer_email;
    if (!customerEmail) {
      return Response.json({ ok: true });
    }

    // Buscar suscripción del usuario específico por email y profile
    const base44 = createClientFromRequest(req);
    
    console.log(`[wompiWebhook] Processing approved transaction for profile: ${profile}, email: ${customerEmail}`);
    
    // Buscar la suscripción del usuario
    const userSubs = await base44.asServiceRole.entities.Subscription.filter({ 
      profile,
      created_by: customerEmail 
    });
    
    console.log(`[wompiWebhook] Found ${userSubs.length} subscriptions for profile ${profile} and email ${customerEmail}`);
    
    if (userSubs.length === 0) {
      // Si no existe, crear una nueva suscripción para el usuario
      const globalSubs = await base44.asServiceRole.entities.Subscription.filter({ profile });
      if (globalSubs.length === 0) {
        console.error(`[wompiWebhook] No global subscription found for profile ${profile}`);
        return Response.json({ ok: true });
      }
      
      const now = new Date();
      const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const newSub = await base44.asServiceRole.entities.Subscription.create({
        profile,
        monthly_price_cop: globalSubs[0].monthly_price_cop,
        is_active: true,
        paid_until: paidUntil.toISOString(),
        payment_token: transaction.id || null,
        auto_renew: true,
        last_renewal_date: now.toISOString(),
      });
      
      console.log(`✓ New subscription created for ${customerEmail} (${profile}), id: ${newSub.id}`);
      return Response.json({ ok: true });
    }

    // Si existe, actualizar
    const sub = userSubs[0];
    const now = new Date();
    const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días

    // Actualizar la suscripción como activa
    await base44.asServiceRole.entities.Subscription.update(sub.id, {
      is_active: true,
      paid_until: paidUntil.toISOString(),
      payment_token: transaction.id || null,
      auto_renew: true,
      last_renewal_date: now.toISOString(),
    });

    console.log(`✓ Subscription ${sub.id} activated for profile ${profile} (${customerEmail}), paid_until: ${paidUntil.toISOString()}`);
    return Response.json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});