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

    // Validar y convertir amountInCents a número entero
    let amount;
    if (typeof amountInCents === 'string') {
      amount = parseInt(amountInCents, 10);
    } else {
      amount = Math.round(amountInCents);
    }
    
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'Invalid amountInCents' }, { status: 400 });
    }

    // Concatenación exacta según Wompi: referencia + monto + moneda + secreto
    const dataToSign = `${reference}${amount}${currency}${integritySecret}`;

    console.log('=== WOMPI SIGNATURE DEBUG ===');
    console.log('Reference:', reference);
    console.log('Amount:', amount);
    console.log('Currency:', currency);
    console.log('Secret length:', integritySecret.length);
    console.log('Data to sign:', dataToSign);
    console.log('Data length:', dataToSign.length);

    const encoded = new TextEncoder().encode(dataToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Generated signature:', signature);
    console.log('Signature length:', signature.length);
    console.log('===========================');

    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    return Response.json({ signature, publicKey });
  } catch (error) {
    console.error('ERROR in wompiSignature:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});