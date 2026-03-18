import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference, amountInCents, currency } = await req.json();
    
    // Extraer el profile de la referencia: VEXNY-SUB-{profile}-{timestamp}
    const parts = reference.split('-');
    const profile = parts[2];
    
    if (!profile) {
      return Response.json({ error: 'Invalid reference format' }, { status: 400 });
    }
    
    // Crear o buscar la suscripción del usuario para este profile
    const existingSubs = await base44.entities.Subscription.filter({ 
      profile,
      created_by: user.email
    });
    
    if (existingSubs.length === 0) {
      // Obtener el precio global del profile
      const globalPrices = await base44.asServiceRole.entities.Subscription.filter({ profile });
      const monthlyPrice = globalPrices[0]?.monthly_price_cop || amountInCents / 100;
      
      // Crear la suscripción del usuario
      await base44.entities.Subscription.create({
        profile,
        monthly_price_cop: monthlyPrice,
        is_active: false,
        trial_hours: 48,
        trial_start_date: new Date().toISOString(),
        auto_renew: false
      });
      
      console.log(`✓ Created subscription for user ${user.email} with profile ${profile}`);
    }

    const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
    if (!integritySecret) {
      return Response.json({ error: 'Missing WOMPI_INTEGRITY_SECRET' }, { status: 500 });
    }

    // Convertir monto a entero
    const amount = typeof amountInCents === 'string' 
      ? parseInt(amountInCents, 10) 
      : Math.round(amountInCents);
    
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Generar firma: referencia + monto + moneda + secreto
    const dataToSign = `${reference}${amount}${currency}${integritySecret}`;
    
    console.log('=== WOMPI SIGNATURE DEBUG ===');
    console.log('Reference:', reference);
    console.log('Amount (cents):', amount);
    console.log('Currency:', currency);
    console.log('Data to sign:', dataToSign);
    
    const encoded = new TextEncoder().encode(dataToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('Generated signature:', signature);

    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    console.log('Public Key from env:', publicKey);
    
    if (!publicKey) {
      return Response.json({ error: 'Missing WOMPI_PUBLIC_KEY' }, { status: 500 });
    }
    
    return Response.json({ signature, publicKey });
  } catch (error) {
    console.error('Signature error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});