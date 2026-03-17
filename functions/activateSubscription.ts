import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Verifica una transacción Wompi y activa la suscripción si fue aprobada
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transactionId, reference, profile } = await req.json();

    const isProduction = Deno.env.get('WOMPI_PUBLIC_KEY')?.startsWith('pub_prod_');
    const baseUrl = isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';

    const res = await fetch(`${baseUrl}/transactions/${transactionId}`);
    const data = await res.json();
    const status = data?.data?.status;

    if (status === 'APPROVED') {
      // Buscar la suscripción de este perfil y activarla
      const subs = await base44.asServiceRole.entities.Subscription.filter({ profile });
      if (subs.length > 0) {
        const now = new Date();
        const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días
        const paymentData = data?.data?.payment_source || {};
        
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          is_active: true,
          paid_until: paidUntil.toISOString(),
          payment_token: paymentData.id || null,
          auto_renew: true,
          last_renewal_date: now.toISOString(),
        });
      }
      return Response.json({ success: true, status: 'APPROVED' });
    }

    return Response.json({ success: false, status: status || 'PENDING' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});