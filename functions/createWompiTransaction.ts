import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference, amountInCents, currency, customerEmail, redirectUrl, signature } = await req.json();

    const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ error: 'Missing WOMPI_PRIVATE_KEY' }, { status: 500 });
    }

    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    
    // Construir URL manualmente para evitar encoding de ":" en signature:integrity
    const params = new URLSearchParams();
    params.set('public-key', publicKey);
    params.set('currency', currency);
    params.set('amount-in-cents', amountInCents.toString());
    params.set('reference', reference);
    params.set('customer-email', customerEmail);
    params.set('redirect-url', redirectUrl);
    
    let checkoutUrl = `https://checkout.wompi.co/p?${params.toString()}`;
    // Agregar signature:integrity sin URL-encoding el colon
    checkoutUrl += `&signature:integrity=${signature}`;

    console.log('✅ Wompi Checkout URL generated');
    console.log('   Public Key:', publicKey?.substring(0, 20) + '...');
    console.log('   Reference:', reference);
    console.log('   Amount:', amountInCents);
    console.log('   Signature:', signature.substring(0, 20) + '...');

    return Response.json({ 
      processingUrl: checkoutUrl
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});