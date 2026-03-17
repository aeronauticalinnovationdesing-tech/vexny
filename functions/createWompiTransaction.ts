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

    // Crear transacción en Wompi API
    const response = await fetch('https://api.wompi.co/v1/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference,
        amount_in_cents: parseInt(amountInCents),
        currency,
        signature,
        customer_email: customerEmail,
        payment_source: {
          type: 'CARD'
        },
        redirect_url: redirectUrl
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to create transaction' }, { status: response.status });
    }

    return Response.json({ 
      transaction: data.data,
      processingUrl: data.data?.links?.payment_link || null
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});