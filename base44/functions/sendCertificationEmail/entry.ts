import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { form } = body;

    // Guardar en la base de datos
    const certificationData = {
      company_name: form.name,
      nit: form.nit,
      city: form.city,
      address: form.address,
      phone: form.phone,
      email: form.email,
      sms_manager_name: form.sms_manager_name,
      sms_manager_email: form.sms_manager_email,
      chief_pilot_name: form.chief_pilot_name,
      aac_cert_phase: form.aac_cert_phase,
      activity_type: form.activity_type,
      operation_category_type: form.operation_category_type,
      special_flights: form.special_flights || [],
      tech_equipment: form.tech_equipment || [],
      other_equipment: form.other_equipment,
      drone_references: form.drone_references || [],
      insurance_policy_number: form.insurance_policy_number,
      insurance_expiry: form.insurance_expiry,
      status: "nuevo"
    };

    await base44.entities.CertificationConsult.create(certificationData);

    return Response.json({ success: true, message: "Solicitud registrada correctamente" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});