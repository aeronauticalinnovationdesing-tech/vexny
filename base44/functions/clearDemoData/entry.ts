import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden ejecutar esto' }, { status: 403 });
    }

    const results = {};

    // Delete all records from each entity
    const entities = ['Task', 'Project', 'Note', 'Transaction', 'Pilot', 'Drone', 'MaintenancePolicy', 'SMSReport'];

    for (const entityName of entities) {
      try {
        // Get all records and delete them
        const records = await base44.entities[entityName].list();
        if (records && records.length > 0) {
          for (const record of records) {
            await base44.entities[entityName].delete(record.id);
          }
          results[entityName] = { deleted: records.length };
        } else {
          results[entityName] = { deleted: 0 };
        }
      } catch (e) {
        results[entityName] = { error: e.message, deleted: 0 };
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Datos de demostración eliminados exitosamente',
      deleted: results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});