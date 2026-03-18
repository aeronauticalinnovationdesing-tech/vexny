import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Función para verificar si un usuario ya pagó en Wompi
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, profile } = await req.json();

    if (!email || !profile) {
      return Response.json({ error: 'email and profile required' }, { status: 400 });
    }

    const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ error: 'Missing WOMPI_PRIVATE_KEY' }, { status: 500 });
    }

    // Buscar transacciones de suscripción en Wompi
    const reference = `VEXNY-SUB-${profile}`;
    const res = await fetch(`https://production.wompi.co/v1/transactions?reference_contains=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${privateKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const transactions = data.data || [];

    // Filtrar transacciones aprobadas del email
    const approvedTx = transactions.filter(tx => 
      tx.status === 'APPROVED' && 
      tx.customer_email === email
    );

    return Response.json({
      success: true,
      email,
      profile,
      hasPaid: approvedTx.length > 0,
      transactions: approvedTx.map(tx => ({
        id: tx.id,
        reference: tx.reference,
        status: tx.status,
        amount_in_cents: tx.amount_in_cents,
        created_at: tx.created_at,
        customer_email: tx.customer_email
      }))
    });

  } catch (error) {
    console.error('Error checking payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});