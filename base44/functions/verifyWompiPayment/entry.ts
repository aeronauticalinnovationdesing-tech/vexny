import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference } = await req.json();

    const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ error: 'Missing WOMPI_PRIVATE_KEY' }, { status: 500 });
    }

    // Consultar transacción en Wompi API
    const response = await fetch(`https://production.wompi.co/v1/transactions?reference=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${privateKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to verify payment' }, { status: response.status });
    }

    const transaction = data.data?.[0];
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return Response.json({ 
      status: transaction.status,
      id: transaction.id,
      amountInCents: transaction.amount_in_cents,
      currency: transaction.currency,
      reference: transaction.reference,
      createdAt: transaction.created_at
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});