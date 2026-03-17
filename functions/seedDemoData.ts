import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEMO_DATA = {
  tasks: [
    { title: "Completar análisis de mercado", description: "Analizar tendencias de EUR/USD", status: "completed", priority: "high", due_date: "2026-03-15", project_id: "", tags: ["análisis"] },
    { title: "Revisar gráficos diarios", description: "Revisar confluencias en H1", status: "in_progress", priority: "high", due_date: "2026-03-18", project_id: "", tags: ["trading"] },
    { title: "Documentar estrategia", description: "Escribir setup para GBP/USD", status: "pending", priority: "medium", due_date: "2026-03-20", project_id: "", tags: ["documentación"] },
    { title: "Prueba de backtest", description: "Validar rendimiento histórico", status: "pending", priority: "medium", due_date: "2026-03-22" },
  ],
  projects: [
    { name: "Proyecto Trading 2026", description: "Plan anual de operaciones", status: "active", budget: 50000, spent: 12500, start_date: "2026-01-01", end_date: "2026-12-31", priority: "high", tags: ["trading"] },
    { name: "Desarrollo de Sistema", description: "Crear bot de trading automatizado", status: "active", budget: 100000, spent: 35000, start_date: "2026-02-01", end_date: "2026-08-31", priority: "critical", tags: ["tech"] },
  ],
  notes: [
    { title: "Setup EUR/USD", content: "Esperar confluencia en 1.1050. RRR 1:2.5. Stop 20 pips.", category: "project", pinned: true, color: "#FFF3CD" },
    { title: "Risk Management", content: "Máximo 2% por trade. Máximo 5 trades por semana.", category: "general", color: "#D1ECF1" },
    { title: "Ideas de Trading", content: "Analizar divergencias en MACD\nProbar RSI filtrado\nEnsayar Bollinger Bands", category: "ideas", color: "#F8D7DA" },
  ],
  transactions: [
    { description: "Ganancia operación EURUSD", amount: 250, type: "income", category: "investment", date: "2026-03-15" },
    { description: "Comisión broker", amount: 25, type: "expense", category: "tools", date: "2026-03-15" },
    { description: "Curso de trading avanzado", amount: 199, type: "expense", category: "tools", date: "2026-03-10" },
    { description: "Retiro de ganancias", amount: 1000, type: "income", category: "investment", date: "2026-03-05" },
  ],
  pilots: [
    { full_name: "Juan García", license_number: "RAC-2024-0001", license_category: "piloto_avanzado", rac_100_expiry_date: "2026-12-31", email: "juan@example.com", phone: "3001234567", hours_flown: 156, status: "activo", role: "piloto", medical_certificate_expiry: "2026-06-30", insurance_provider: "AXA Colombia" },
    { full_name: "María López", license_number: "RAC-2024-0002", license_category: "piloto_basico", rac_100_expiry_date: "2026-08-15", email: "maria@example.com", phone: "3009876543", hours_flown: 48, status: "activo", role: "piloto", medical_certificate_expiry: "2026-09-15", insurance_provider: "ALLIANZ" },
    { full_name: "Carlos Rodríguez", license_number: "RAC-2024-0003", license_category: "operador_remoto", rac_100_expiry_date: "2026-05-01", email: "carlos@example.com", phone: "3101112222", hours_flown: 12, status: "activo", role: "jefe_pilotos", medical_certificate_expiry: "2026-04-01" },
  ],
  drones: [
    { serial_number: "DJI-M300-0001", model: "Matrice 300 RTK", manufacturer: "DJI", weight_grams: 2700, registration_number: "AAC-2024-0001", registration_expiry: "2026-12-31", purchase_date: "2024-06-15", maintenance_status: "operativo", flight_hours: 245, last_maintenance_date: "2026-02-20", next_maintenance_due: "2026-05-20", insurance_policy_number: "POL-2024-0001", insurance_expiry: "2026-12-31" },
    { serial_number: "DJI-M350-0002", model: "Matrice 350 RTK", manufacturer: "DJI", weight_grams: 3050, registration_number: "AAC-2024-0002", registration_expiry: "2026-11-15", purchase_date: "2023-09-10", maintenance_status: "operativo", flight_hours: 512, last_maintenance_date: "2026-01-15", next_maintenance_due: "2026-04-15", insurance_policy_number: "POL-2024-0002", insurance_expiry: "2026-12-31" },
    { serial_number: "DJI-AIR3-0003", model: "Air 3S", manufacturer: "DJI", weight_grams: 912, registration_number: "AAC-2024-0003", registration_expiry: "2026-10-01", purchase_date: "2025-01-20", maintenance_status: "en_mantenimiento", flight_hours: 78, last_maintenance_date: "2026-03-10", next_maintenance_due: "2026-06-10" },
  ],
  maintenancePolicies: [
    { drone_serial: "DJI-M300-0001", policy_number: "POL-MAINT-001", provider: "AXA Drones", coverage_type: "completa", start_date: "2026-01-01", expiry_date: "2026-12-31", monthly_cost_cop: 185000, coverage_limit_cop: 120000000, includes_accidental: true, includes_theft: true, status: "activa" },
    { drone_serial: "DJI-M350-0002", policy_number: "POL-MAINT-002", provider: "MAPFRE", coverage_type: "premium", start_date: "2026-01-15", expiry_date: "2026-12-31", monthly_cost_cop: 250000, coverage_limit_cop: 180000000, includes_accidental: true, includes_theft: true, status: "activa" },
    { drone_serial: "DJI-AIR3-0003", policy_number: "POL-MAINT-003", provider: "ALLIANZ", coverage_type: "basica", start_date: "2026-02-01", expiry_date: "2026-12-31", monthly_cost_cop: 95000, coverage_limit_cop: 50000000, includes_accidental: true, includes_theft: false, status: "activa" },
  ],
  smsReports: [
    { report_date: "2026-03-15", pilot_name: "Juan García", drone_model: "Matrice 300 RTK", flight_duration_minutes: 45, altitude_max_meters: 350, area_type: "rural", weather_conditions: "Cielo despejado, viento 8 km/h", incident_reported: false, observers_count: 2, status: "completado" },
    { report_date: "2026-03-14", pilot_name: "María López", drone_model: "Air 3S", flight_duration_minutes: 32, altitude_max_meters: 200, area_type: "suburbana", weather_conditions: "Nublado, viento 12 km/h", incident_reported: false, observers_count: 1, status: "completado" },
    { report_date: "2026-03-13", pilot_name: "Juan García", drone_model: "Matrice 350 RTK", flight_duration_minutes: 78, altitude_max_meters: 400, area_type: "rural", weather_conditions: "Despejado, viento 5 km/h", incident_reported: true, incident_description: "Pérdida de señal GPS por 3 segundos", observers_count: 3, status: "completado" },
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden ejecutar esto' }, { status: 403 });
    }

    const results = {};

    // Create Tasks
    if (DEMO_DATA.tasks.length > 0) {
      results.tasks = await base44.entities.Task.bulkCreate(DEMO_DATA.tasks);
    }

    // Create Projects
    if (DEMO_DATA.projects.length > 0) {
      results.projects = await base44.entities.Project.bulkCreate(DEMO_DATA.projects);
    }

    // Create Notes
    if (DEMO_DATA.notes.length > 0) {
      results.notes = await base44.entities.Note.bulkCreate(DEMO_DATA.notes);
    }

    // Create Transactions
    if (DEMO_DATA.transactions.length > 0) {
      results.transactions = await base44.entities.Transaction.bulkCreate(DEMO_DATA.transactions);
    }

    // Create Pilots
    if (DEMO_DATA.pilots.length > 0) {
      results.pilots = await base44.entities.Pilot.bulkCreate(DEMO_DATA.pilots);
    }

    // Create Drones
    if (DEMO_DATA.drones.length > 0) {
      results.drones = await base44.entities.Drone.bulkCreate(DEMO_DATA.drones);
    }

    // Create Maintenance Policies
    if (DEMO_DATA.maintenancePolicies.length > 0) {
      results.maintenancePolicies = await base44.entities.MaintenancePolicy.bulkCreate(DEMO_DATA.maintenancePolicies);
    }

    // Create SMS Reports
    if (DEMO_DATA.smsReports.length > 0) {
      results.smsReports = await base44.entities.SMSReport.bulkCreate(DEMO_DATA.smsReports);
    }

    return Response.json({ 
      success: true, 
      message: 'Datos de demostración creados exitosamente',
      created: results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});