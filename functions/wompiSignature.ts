import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reference, amountInCents, currency, expirationTime } = await req.json();

    const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');

    if (!integritySecret || !publicKey) {
      return Response.json({ error: 'Missing WOMPI configuration' }, { status: 500 });
    }

    // Concatenación según documentación Wompi:
    // reference + amountInCents (as string) + currency + [expirationTime] + integritySecret
    let cadena = `${reference}${amountInCents}${currency}`;
    if (expirationTime) {
      cadena += expirationTime;
    }
    cadena += integritySecret;

    const encoded = new TextEncoder().encode(cadena);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return Response.json({ signature, publicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});