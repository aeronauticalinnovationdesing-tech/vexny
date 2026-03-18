import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Callback que se ejecuta cuando el usuario regresa del checkout de Wompi
// Se llama DESPUÉS de que Wompi procesa el pago (puede tomar unos segundos)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reference, transactionId } = await req.json();
    
    if (!reference || !reference.startsWith('VEXNY-SUB-')) {
      return Response.json({ error: 'Invalid reference' }, { status: 400 });
    }

    // Extraer profile de referencia: VEXNY-SUB-{profile}-{timestamp}
    const parts = reference.split('-');
    const profile = parts[2];

    // Intentar verificar estado en Wompi
    const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ error: 'Missing WOMPI_PRIVATE_KEY' }, { status: 500 });
    }

    let transactionStatus = 'PENDING';
    try {
      const res = await fetch(`https://production.wompi.co/v1/transactions?reference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${privateKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      const transaction = data.data?.[0];
      if (transaction) {
        transactionStatus = transaction.status;
      }
    } catch (e) {
      console.error('Error querying Wompi:', e);
      // Continuar de todas formas
    }

    // Si está aprobado, activar la suscripción
    if (transactionStatus === 'APPROVED') {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ profile });
      if (subs.length > 0) {
        const now = new Date();
        const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const updatedSub = await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          is_active: true,
          paid_until: paidUntil.toISOString(),
          auto_renew: true,
          last_renewal_date: now.toISOString(),
        });

        console.log(`✓ Subscription activated via callback for profile ${profile}:`, {
          subId: subs[0].id,
          paidUntil: paidUntil.toISOString(),
          isActive: updatedSub.is_active
        });
      } else {
        console.error(`No subscription found for profile ${profile}`);
      }
    }

    return Response.json({ 
      success: true, 
      status: transactionStatus,
      message: transactionStatus === 'APPROVED' ? 'Suscripción activada' : 'Pago en proceso'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});