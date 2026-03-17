import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, date, time, description } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Build start/end datetimes
    const startTime = time || '09:00';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const endHour = startHour + 1;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;

    const event = {
      summary: title,
      description: description || 'Creado desde VEXNY',
      start: { dateTime: startDateTime, timeZone: 'America/Bogota' },
      end: { dateTime: endDateTime, timeZone: 'America/Bogota' },
      conferenceData: {
        createRequest: {
          requestId: `vexny-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    const created = await res.json();
    const meetLink = created.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || null;

    return Response.json({ meet_link: meetLink, google_event_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});