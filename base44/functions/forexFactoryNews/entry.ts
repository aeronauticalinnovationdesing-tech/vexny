import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch ForexFactory calendar via their public JSON/RSS
    // FF has a public calendar API endpoint
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Try the FF calendar RSS feed as JSON via rss2json or direct parsing
    const ffUrl = `https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=${Date.now()}`;

    const response = await fetch(ffUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VexnyTrader/1.0)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`FF returned ${response.status}`);
    }

    const raw = await response.json();

    // Filter and normalize
    const news = raw
      .filter(item => item.impact === 'High' || item.impact === 'Medium')
      .map(item => ({
        title: item.title || item.name,
        currency: item.country || item.currency,
        date: item.date,
        time: item.time,
        impact: item.impact,
        forecast: item.forecast,
        previous: item.previous,
        actual: item.actual || null,
      }))
      .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

    // Separate: upcoming high impact = alerts
    const now = new Date();
    const alerts = news.filter(n => {
      const nDate = new Date(n.date + ' ' + n.time);
      const diff = nDate - now;
      return diff > 0 && diff < 24 * 60 * 60 * 1000 && n.impact === 'High';
    });

    return Response.json({ news, alerts, ok: true });
  } catch (error) {
    // Return mock data if FF is unreachable
    const mockNews = [
      { title: "Non-Farm Payrolls", currency: "USD", date: new Date().toISOString().split('T')[0], time: "13:30", impact: "High", forecast: "185K", previous: "175K", actual: null },
      { title: "CPI m/m", currency: "USD", date: new Date().toISOString().split('T')[0], time: "13:30", impact: "High", forecast: "0.3%", previous: "0.2%", actual: null },
      { title: "ECB Interest Rate", currency: "EUR", date: new Date().toISOString().split('T')[0], time: "12:15", impact: "High", forecast: "3.65%", previous: "3.90%", actual: null },
      { title: "GDP q/q", currency: "GBP", date: new Date().toISOString().split('T')[0], time: "07:00", impact: "Medium", forecast: "0.4%", previous: "0.1%", actual: null },
      { title: "FOMC Meeting Minutes", currency: "USD", date: new Date().toISOString().split('T')[0], time: "19:00", impact: "High", forecast: null, previous: null, actual: null },
    ];
    return Response.json({ news: mockNews, alerts: mockNews.filter(n => n.impact === 'High'), ok: true, mock: true });
  }
});