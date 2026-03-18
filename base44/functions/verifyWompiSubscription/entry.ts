import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Verifica el estado de una transacción Wompi y activa la suscripción
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transactionId, profile } = await req.json();
    if (!transactionId || !profile) {
      return Response.json({ error: 'Missing transactionId or profile' }, { status: 400 });
    }

    // Detectar ambiente (sandbox vs producción)
    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    const isProduction = publicKey?.startsWith('pub_prod_');
    const baseUrl = isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';

    // Consultar estado de la transacción
    const res = await fetch(`${baseUrl}/transactions/${transactionId}`);
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch transaction' }, { status: res.status });
    }

    const data = await res.json();
    const status = data?.data?.status;

    // Si fue aprobada, activar la suscripción
    if (status === 'APPROVED') {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ profile });
      if (subs.length > 0) {
        const now = new Date();
        const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          is_active: true,
          paid_until: paidUntil.toISOString(),
        });
      }
      return Response.json({ success: true, status: 'APPROVED' });
    }

    return Response.json({ success: false, status: status || 'PENDING' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});