import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Callback que se ejecuta cuando el usuario regresa del checkout de Wompi
// NOTA: Usa operaciones USER-SCOPED para que created_by = email del usuario
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reference, transactionId } = body;
    
    if (!reference || !reference.startsWith('VEXNY-SUB-')) {
      return Response.json({ error: 'Invalid reference' }, { status: 400 });
    }

    // Extraer profile de referencia: VEXNY-SUB-{profile}-{timestamp}
    const parts = reference.split('-');
    const profile = parts.slice(2, parts.length - 1).join('-');

    if (!profile) {
      return Response.json({ error: 'Cannot extract profile from reference' }, { status: 400 });
    }

    // Verificar estado en Wompi
    const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY');
    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    const isProduction = publicKey?.startsWith('pub_prod_');
    const baseUrl = isProduction ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

    let transactionStatus = 'PENDING';
    let txIdToUse = transactionId;

    try {
      // Buscar por referencia si no tenemos ID
      const res = await fetch(`${baseUrl}/transactions?reference=${reference}`, {
        headers: { 'Authorization': `Bearer ${privateKey}` }
      });
      const data = await res.json();
      const transaction = data.data?.[0];
      if (transaction) {
        transactionStatus = transaction.status;
        txIdToUse = transaction.id || txIdToUse;
      }
    } catch (e) {
      console.error('Error querying Wompi:', e);
    }

    console.log(`[wompiCallback] User: ${user.email}, Profile: ${profile}, Status: ${transactionStatus}`);

    if (transactionStatus === 'APPROVED') {
      const now = new Date();
      const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Buscar suscripción USER-SCOPED (created_by = user.email automáticamente)
      const subs = await base44.entities.Subscription.filter({
        profile,
        created_by: user.email
      });

      if (subs.length > 0) {
        // Actualizar suscripción existente del usuario
        await base44.entities.Subscription.update(subs[0].id, {
          is_active: true,
          paid_until: paidUntil.toISOString(),
          payment_token: txIdToUse || null,
          auto_renew: true,
          last_renewal_date: now.toISOString(),
        });
        console.log(`✓ Subscription updated for ${user.email} (${profile}), paid_until: ${paidUntil.toISOString()}`);
      } else {
        // Crear nueva suscripción USER-SCOPED
        const globalSubs = await base44.asServiceRole.entities.Subscription.filter({ profile });
        const price = globalSubs[0]?.monthly_price_cop ?? 0;

        // Crear con user-scoped para que created_by = user.email
        await base44.entities.Subscription.create({
          profile,
          monthly_price_cop: price,
          is_active: true,
          paid_until: paidUntil.toISOString(),
          payment_token: txIdToUse || null,
          auto_renew: true,
          last_renewal_date: now.toISOString(),
        });
        console.log(`✓ New subscription created for ${user.email} (${profile})`);
      }
    }

    return Response.json({ 
      success: true, 
      status: transactionStatus,
      activated: transactionStatus === 'APPROVED',
      message: transactionStatus === 'APPROVED' ? 'Pago procesado y suscripción activada' : 'Pago en proceso'
    });

  } catch (error) {
    console.error('[wompiCallback] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});