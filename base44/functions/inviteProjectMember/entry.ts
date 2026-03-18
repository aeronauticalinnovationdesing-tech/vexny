import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, projectName, projectDescription } = await req.json();

    if (!email || !projectName) {
      return Response.json({ error: 'email and projectName are required' }, { status: 400 });
    }

    const results = { invited: false, emailSent: false, errors: [] };

    // 1. Invite the user to the app (gives them access)
    try {
      await base44.users.inviteUser(email, "user");
      results.invited = true;
    } catch (err) {
      // User might already exist — not a hard error
      results.errors.push(`invite: ${err.message}`);
    }

    // 2. Send invitation email (using user-scoped integrations)
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `🗡️ Has sido invitado al proyecto "${projectName}" en VEXNY`,
        body: `
<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 16px; border: 1px solid #e5e7eb;">
  <div style="margin-bottom: 24px;">
    <span style="font-size: 22px; font-weight: 800; color: #111;">⚔️ VEXNY</span>
  </div>
  <h2 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">¡Fuiste convocado al campo de batalla!</h2>
  <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
    Has sido agregado al proyecto <strong style="color: #111;">${projectName}</strong>.
    ${projectDescription ? `<br/><em style="color:#9ca3af;">${projectDescription}</em>` : ""}
  </p>
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 13px; color: #92400e;">
      💪 <strong>Mentalidad Gladiador:</strong> "La victoria pertenece a los que perseveran."
    </p>
  </div>
  <p style="color: #9ca3af; font-size: 13px; margin: 0;">
    Ingresa a <strong>VEXNY</strong> para ver las tareas asignadas, fechas y más.
  </p>
</div>
        `,
      });
      results.emailSent = true;
    } catch (err) {
      results.errors.push(`email: ${err.message}`);
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});