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

    // Wompi redirige directamente al checkout, no crea transacción via API
    // El flujo es: generar firma → redirigir a checkout.wompi.co con parámetros
    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    
    const checkoutUrl = new URL('https://checkout.wompi.co/p/');
    checkoutUrl.searchParams.append('public-key', publicKey);
    checkoutUrl.searchParams.append('currency', currency);
    checkoutUrl.searchParams.append('amount-in-cents', parseInt(amountInCents));
    checkoutUrl.searchParams.append('reference', reference);
    checkoutUrl.searchParams.append('signature:integrity', signature);
    checkoutUrl.searchParams.append('redirect-url', redirectUrl);

    return Response.json({ 
      processingUrl: checkoutUrl.toString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});