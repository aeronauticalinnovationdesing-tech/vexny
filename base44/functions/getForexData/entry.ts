import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pair = 'EUR/USD', interval = '1h' } = await req.json();

    // Usar Alpha Vantage free API
    const apiKey = 'demo'; // Free key, puedes usar tu propia
    const [from, to] = pair.split('/');
    
    const url = `https://www.alphavantage.co/query?function=FX_${interval === '1h' ? 'INTRADAY' : 'DAILY'}&from_symbol=${from}&to_symbol=${to}&interval=${interval === '1h' ? '60min' : '1d'}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Procesar datos para extraer últimas velas
    const timeSeries = data[`Time Series FX (${interval === '1h' ? '60min' : 'Daily'})`] || {};
    const candles = Object.entries(timeSeries).slice(0, 100).map(([time, values]) => ({
      time,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
    })).reverse();

    return Response.json({ pair, candles, interval });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});