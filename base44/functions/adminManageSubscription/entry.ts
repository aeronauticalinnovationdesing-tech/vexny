import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, subId, email, profile, days } = await req.json();

  if (action === 'activate' && subId) {
    const now = new Date();
    const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await base44.asServiceRole.entities.Subscription.update(subId, {
      is_active: true,
      paid_until: paidUntil.toISOString(),
      last_renewal_date: now.toISOString(),
    });
    return Response.json({ success: true });
  }

  if (action === 'deactivate' && subId) {
    await base44.asServiceRole.entities.Subscription.update(subId, { is_active: false });
    return Response.json({ success: true });
  }

  if (action === 'grant' && email && profile) {
    const d = parseInt(days) || 30;
    const now = new Date();
    const paidUntil = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Look for existing sub by email + profile
    const all = await base44.asServiceRole.entities.Subscription.list('-created_date', 500);
    const existing = all.filter(s => s.created_by === email && s.profile === profile);

    if (existing.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
        is_active: true,
        paid_until: paidUntil.toISOString(),
        last_renewal_date: now.toISOString(),
      });
    } else {
      // Find global price config
      const global = all.find(s => s.profile === profile && (!s.created_by || !s.created_by.includes('@')));
      await base44.asServiceRole.entities.Subscription.create({
        profile,
        monthly_price_cop: global?.monthly_price_cop ?? 0,
        is_active: true,
        paid_until: paidUntil.toISOString(),
        last_renewal_date: now.toISOString(),
        trial_start_date: now.toISOString(),
        // We can't set created_by from service role to the target email directly,
        // but we store it in a note field
        notes: `admin_granted_to:${email}`,
      });
      return Response.json({ success: true, note: 'created_as_service_role' });
    }
    return Response.json({ success: true });
  }

  if (action === 'list') {
    const all = await base44.asServiceRole.entities.Subscription.list('-updated_date', 300);
    // Only those with real user emails
    const subs = all.filter(s => s.created_by && s.created_by.includes('@') && (s.paid_until || s.is_active || s.last_renewal_date));
    return Response.json({ subs });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});