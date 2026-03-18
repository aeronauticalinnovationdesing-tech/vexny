import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Callback que se ejecuta cuando el usuario regresa del checkout de Wompi
// Se llama DESPUÉS de que Wompi procesa el pago (puede tomar unos segundos)
// NOTA: El webhook (wompiWebhook.js) es la fuente de verdad - este es solo para UX
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

    return Response.json({ 
      success: true, 
      status: transactionStatus,
      message: transactionStatus === 'APPROVED' ? 'Pago procesado' : 'Pago en proceso'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});