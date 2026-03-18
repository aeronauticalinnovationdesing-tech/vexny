import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query = 'forex market', limit = 10 } = await req.json();

    // Usar NewsAPI (free tier)
    const newsApiKey = 'demo'; // Usuarios deben obtener su propia key en newsapi.org
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=es&pageSize=${limit}&apiKey=${newsApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    const news = (data.articles || []).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
      impact: calculateImpact(article.title + ' ' + article.description),
    }));

    return Response.json({ news, total: data.totalResults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateImpact(text) {
  const highImpact = ['crash', 'crisis', 'emergency', 'fed', 'bce', 'banco central', 'tasa de interés', 'volatilidad'];
  const count = highImpact.filter(word => text.toLowerCase().includes(word)).length;
  if (count >= 2) return 'high';
  if (count === 1) return 'medium';
  return 'low';
}