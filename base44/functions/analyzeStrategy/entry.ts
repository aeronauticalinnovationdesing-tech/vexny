import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { trades = [], question = "", accountType = "general" } = body;

    if (trades.length === 0) {
      return Response.json({ analysis: "No hay trades suficientes para analizar. Registra al menos 5 operaciones para obtener un análisis preciso." });
    }

    const wins = trades.filter(t => t.result === 'win' || t.type === 'income');
    const losses = trades.filter(t => t.result === 'loss' || t.type === 'expense');
    const totalPnl = trades.reduce((s, t) => {
      const v = t.pnl || (t.type === 'income' ? t.amount : -(t.amount || 0));
      return s + v;
    }, 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length * 100).toFixed(1) : 0;
    const avgWin = wins.length > 0 ? (wins.reduce((s, t) => s + (t.pnl || t.amount || 0), 0) / wins.length).toFixed(2) : 0;
    const avgLoss = losses.length > 0 ? (losses.reduce((s, t) => s + (t.pnl || t.amount || 0), 0) / losses.length).toFixed(2) : 0;

    const setupBreakdown = {};
    trades.forEach(t => {
      const setup = t.setup || t.tags?.[1] || 'Sin setup';
      if (!setupBreakdown[setup]) setupBreakdown[setup] = { wins: 0, losses: 0, pnl: 0 };
      const isWin = t.result === 'win' || t.type === 'income';
      setupBreakdown[setup][isWin ? 'wins' : 'losses']++;
      setupBreakdown[setup].pnl += t.pnl || (t.type === 'income' ? t.amount : -(t.amount || 0));
    });

    const prompt = `Eres un analista de trading experto con 20 años de experiencia en ${accountType}. Analiza el siguiente historial de trading y ${question || "proporciona un análisis completo de la estrategia con recomendaciones concretas"}.

ESTADÍSTICAS GENERALES:
- Total trades: ${trades.length}
- Win Rate: ${winRate}%
- P&L Total: $${totalPnl.toFixed(2)}
- Promedio ganancia: $${avgWin}
- Promedio pérdida: $${avgLoss}
- Profit Factor: ${avgLoss > 0 ? (Math.abs(Number(avgWin)) / Math.abs(Number(avgLoss))).toFixed(2) : 'N/A'}

BREAKDOWN POR SETUP:
${Object.entries(setupBreakdown).map(([setup, data]) => 
  `- ${setup}: ${data.wins}W/${data.losses}L, P&L: $${data.pnl.toFixed(2)}, WR: ${((data.wins/(data.wins+data.losses))*100).toFixed(0)}%`
).join('\n')}

ÚLTIMOS 5 TRADES:
${trades.slice(0, 5).map(t => 
  `- ${t.pair || 'N/A'} ${t.direction || (t.type === 'income' ? 'LONG' : 'SHORT')} | ${t.setup || t.tags?.[1] || 'N/A'} | ${t.result || (t.type === 'income' ? 'WIN' : 'LOSS')} | PnL: $${t.pnl || t.amount || 0}`
).join('\n')}

Proporciona:
1. **Diagnóstico** de fortalezas y debilidades
2. **Setups más rentables** y cuáles evitar
3. **Gestión de riesgo** - ajustes recomendados
4. **Plan de mejora** con 3 acciones concretas
5. **Alerta psicológica** si detectas patrones de revenge trading o overtrading

Responde en español, directo al punto, como un mentor estricto pero constructivo.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6"
    });

    return Response.json({ analysis, ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});