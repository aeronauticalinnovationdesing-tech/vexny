import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, subId, accessId, email, profile, days } = await req.json();

  // List all subscriptions with real user emails
  if (action === 'list') {
    const all = await base44.asServiceRole.entities.Subscription.list('-updated_date', 300);
    const subs = all.filter(s => s.created_by && s.created_by.includes('@') && (s.paid_until || s.is_active || s.last_renewal_date));
    const adminAccesses = await base44.asServiceRole.entities.AdminAccess.list('-created_date', 200);
    return Response.json({ subs, adminAccesses });
  }

  // Activate an existing user subscription
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

  // Deactivate a subscription
  if (action === 'deactivate' && subId) {
    await base44.asServiceRole.entities.Subscription.update(subId, { is_active: false });
    return Response.json({ success: true });
  }

  // Revoke admin access
  if (action === 'revokeAccess' && accessId) {
    await base44.asServiceRole.entities.AdminAccess.update(accessId, { is_active: false });
    return Response.json({ success: true });
  }

  // Grant manual access by email using AdminAccess entity
  if (action === 'grant' && email && profile) {
    const d = parseInt(days) || 30;
    const now = new Date();
    const paidUntil = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Check if they already have a user subscription and activate it
    const all = await base44.asServiceRole.entities.Subscription.list('-created_date', 500);
    const existing = all.filter(s => s.created_by === email && s.profile === profile);

    if (existing.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
        is_active: true,
        paid_until: paidUntil.toISOString(),
        last_renewal_date: now.toISOString(),
      });
      return Response.json({ success: true, method: 'subscription_updated' });
    }

    // Otherwise create an AdminAccess record
    const existingAccesses = await base44.asServiceRole.entities.AdminAccess.filter({ user_email: email, profile });
    if (existingAccesses.length > 0) {
      await base44.asServiceRole.entities.AdminAccess.update(existingAccesses[0].id, {
        is_active: true,
        paid_until: paidUntil.toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.AdminAccess.create({
        user_email: email,
        profile,
        paid_until: paidUntil.toISOString(),
        is_active: true,
        notes: `Granted by admin on ${now.toISOString()}`,
      });
    }
    return Response.json({ success: true, method: 'admin_access_created' });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});