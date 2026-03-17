import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference, amountInCents, currency } = await req.json();

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