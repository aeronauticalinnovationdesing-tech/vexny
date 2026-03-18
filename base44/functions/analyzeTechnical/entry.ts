import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { candles = [] } = await req.json();
    
    if (candles.length < 14) {
      return Response.json({ error: 'Necesita mínimo 14 velas para análisis' }, { status: 400 });
    }

    // Calcular EMA
    const ema12 = calculateEMA(candles.map(c => c.close), 12);
    const ema26 = calculateEMA(candles.map(c => c.close), 26);
    
    // Calcular RSI
    const rsi = calculateRSI(candles.map(c => c.close), 14);
    
    // Calcular MACD
    const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    
    // Encontrar soportes y resistencias
    const { support, resistance } = findSupportResistance(candles);
    
    // Detectar patrones
    const pattern = detectPattern(candles);

    const lastPrice = candles[candles.length - 1].close;
    const trend = ema12[ema12.length - 1] > ema26[ema26.length - 1] ? 'ALCISTA' : 'BAJISTA';

    return Response.json({
      ema12: ema12[ema12.length - 1],
      ema26: ema26[ema26.length - 1],
      rsi: rsi[rsi.length - 1],
      macd,
      support,
      resistance,
      pattern,
      trend,
      lastPrice,
      signal: generateSignal(rsi[rsi.length - 1], trend, lastPrice, support, resistance),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateEMA(prices, period) {
  const ema = [];
  const k = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  ema.push(sum / period);
  
  for (let i = period; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

function calculateRSI(prices, period) {
  const rsi = [];
  let gains = 0, losses = 0;
  
  for (let i = 1; i < period + 1; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

function findSupportResistance(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const support = Math.min(...lows.slice(-20));
  const resistance = Math.max(...highs.slice(-20));
  
  return { support, resistance };
}

function detectPattern(candles) {
  if (candles.length < 3) return 'insufficient_data';
  
  const last = candles[candles.length - 1];
  const prev1 = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  
  // Hammer: cuerpo pequeño con mecha larga abajo
  if (last.close > last.open && (last.open - last.low) > (last.high - last.close) * 2) {
    return 'HAMMER';
  }
  
  // Tres velas alcistas
  if (last.close > last.open && prev1.close > prev1.open && prev2.close > prev2.open) {
    return 'TRES_VELAS_ALCISTAS';
  }
  
  // Tres velas bajistas
  if (last.close < last.open && prev1.close < prev1.open && prev2.close < prev2.open) {
    return 'TRES_VELAS_BAJISTAS';
  }
  
  return 'INDETERMINADO';
}

function generateSignal(rsi, trend, price, support, resistance) {
  let signal = 'NEUTRAL';
  let strength = 'baja';
  
  if (rsi < 30) {
    signal = 'COMPRA';
    strength = 'fuerte';
  } else if (rsi > 70) {
    signal = 'VENTA';
    strength = 'fuerte';
  } else if (rsi < 50 && trend === 'ALCISTA') {
    signal = 'COMPRA';
    strength = 'media';
  } else if (rsi > 50 && trend === 'BAJISTA') {
    signal = 'VENTA';
    strength = 'media';
  }
  
  if (price < support) {
    signal = 'COMPRA';
    strength = 'media';
  } else if (price > resistance) {
    signal = 'VENTA';
    strength = 'media';
  }
  
  return { signal, strength };
}