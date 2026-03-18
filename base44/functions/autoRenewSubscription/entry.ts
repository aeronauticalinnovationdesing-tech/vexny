import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Renueva automáticamente todas las suscripciones vencidas con auto-renew habilitado
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obtener todas las suscripciones activas con auto-renew
    const allSubs = await base44.asServiceRole.entities.Subscription.list();
    const subsToRenew = allSubs.filter(sub => {
      if (!sub.auto_renew || !sub.payment_token) return false;
      const paidUntil = new Date(sub.paid_until).getTime();
      return paidUntil < Date.now();
    });

    const results = [];
    const isProduction = Deno.env.get('WOMPI_PUBLIC_KEY')?.startsWith('pub_prod_');
    const baseUrl = isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';

    for (const subscription of subsToRenew) {
      try {
        const amountInCents = Math.round(subscription.monthly_price_cop * 100);
        const reference = `VEXNY-RENEWAL-${subscription.id}-${Date.now()}`;

        const paymentRes = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('WOMPI_PRIVATE_KEY')}`,
          },
          body: JSON.stringify({
            amount_in_cents: amountInCents,
            currency: 'COP',
            reference,
            customer_email: subscription.created_by,
            payment_source_id: subscription.payment_token,
          }),
        });

        const paymentData = await paymentRes.json();

        if (paymentData?.data?.status === 'APPROVED') {
          const now = new Date();
          const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await base44.asServiceRole.entities.Subscription.update(subscription.id, {
            paid_until: paidUntil.toISOString(),
            last_renewal_date: now.toISOString(),
          });

          results.push({ id: subscription.id, status: 'APPROVED' });
        } else {
          results.push({ id: subscription.id, status: paymentData?.data?.status || 'FAILED' });
        }
      } catch (error) {
        results.push({ id: subscription.id, status: 'ERROR', error: error.message });
      }
    }

    return Response.json({ success: true, renewed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});