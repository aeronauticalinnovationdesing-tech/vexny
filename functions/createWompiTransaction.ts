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
    
    // Construir URL manualmente para preservar signature:integrity sin codificación
    const baseUrl = 'https://checkout.wompi.co/p/';
    const urlParams = [
      `public-key=${publicKey}`,
      `currency=${currency}`,
      `amount-in-cents=${parseInt(amountInCents).toString()}`,
      `reference=${reference}`,
      `signature:integrity=${signature}`,
      `redirect-url=${encodeURIComponent(redirectUrl)}`
    ].join('&');
    
    const checkoutUrl = `${baseUrl}?${urlParams}`;

    return Response.json({ 
      processingUrl: checkoutUrl
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});