import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transactionId, reference } = await req.json();

    // Consultar estado de transacción en Wompi
    const isProduction = Deno.env.get('WOMPI_PUBLIC_KEY')?.startsWith('pub_prod_');
    const baseUrl = isProduction
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';

    const res = await fetch(`${baseUrl}/transactions/${transactionId}`);
    const data = await res.json();

    const status = data?.data?.status; // APPROVED, DECLINED, etc.
    const mappedStatus = status === 'APPROVED' ? 'approved'
      : status === 'DECLINED' ? 'declined'
      : status === 'ERROR' ? 'error'
      : 'pending';

    // Actualizar la compra en la base de datos
    const purchases = await base44.asServiceRole.entities.CoursePurchase.filter({ wompi_reference: reference });
    if (purchases.length > 0) {
      await base44.asServiceRole.entities.CoursePurchase.update(purchases[0].id, {
        status: mappedStatus,
        wompi_transaction_id: transactionId
      });
    }

    return Response.json({ status: mappedStatus, transactionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});