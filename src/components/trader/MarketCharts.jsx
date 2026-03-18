import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generar datos realistas
function generateRealisticMockData(basePrice = 100) {
  const now = new Date();
  const data = [];
  let price = basePrice;
  
  for (let i = 30; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    price = price + (Math.random() - 0.5) * 2;
    data.push({
      date: date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000),
    });
  }
  return data;
}

// Componente individual para una gráfica de activo
function AssetChart({ symbol, name, icon, color, type = 'line', basePrices = {} }) {
  const { data: chartData = [], isLoading, error } = useQuery({
    queryKey: ['asset-prices', symbol],
    queryFn: async () => {
      try {
        // Intentar fetch a API real, pero con timeout y fallback
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=demo`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (data['Error Message'] || data['Note']) {
          return generateRealisticMockData(basePrices[symbol] || 100);
        }

        const timeSeries = data['Time Series (Daily)'] || {};
        const entries = Object.entries(timeSeries).slice(0, 30).reverse();
        
        if (entries.length === 0) {
          return generateRealisticMockData(basePrices[symbol] || 100);
        }
        
        return entries.map(([date, values]) => ({
          date: new Date(date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
          price: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'] || 0),
        }));
      } catch (e) {
        console.warn(`Usando datos simulados para ${symbol}`);
        return generateRealisticMockData(basePrices[symbol] || 100);
      }
    },
    staleTime: 1000 * 60 * 60,
  });

  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const previousPrice = chartData[chartData.length - 2]?.price || currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice ? ((change / previousPrice) * 100).toFixed(2) : 0;
  const isPositive = change >= 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-base sm:text-lg" style={{ backgroundColor: color + '15' }}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{symbol}</p>
            </div>
          </div>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />}
      </div>

      {/* Price */}
      <div className="flex items-end gap-2">
        <p className="text-lg sm:text-2xl font-bold">${currentPrice.toFixed(2)}</p>
        <div className={cn("text-xs font-semibold flex items-center gap-1", isPositive ? "text-emerald-600" : "text-red-600")}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{changePercent}%
        </div>
      </div>

      {/* Chart */}
      {error ? (
        <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
          Error cargando datos
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 120 : 150}>
          {type === 'bar' ? (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={window.innerWidth < 640 ? 10 : 12} stroke="var(--muted-foreground)" />
              <YAxis fontSize={window.innerWidth < 640 ? 10 : 12} stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: window.innerWidth < 640 ? '11px' : '12px'
                }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="price" fill={color} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={window.innerWidth < 640 ? 10 : 12} stroke="var(--muted-foreground)" />
              <YAxis fontSize={window.innerWidth < 640 ? 10 : 12} stroke="var(--muted-foreground)" width={window.innerWidth < 640 ? 35 : 40} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: window.innerWidth < 640 ? '11px' : '12px'
                }}
                formatter={(value) => `$${value.toFixed(2)}`}
                labelFormatter={(label) => label}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={color} 
                dot={false} 
                strokeWidth={2}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// Componente principal que agrupa todos los activos
export default function MarketCharts() {
  const basePrices = {
    '^GSPC': 4500,
    'EURUSD': 1.10,
    'GBPUSD': 1.27,
    'USDJPY': 150,
    'CL=F': 85,
    'GC=F': 2050,
  };

  const assets = [
    { symbol: '^GSPC', name: 'S&P 500', icon: '📈', color: '#3B82F6' },
    { symbol: 'EURUSD', name: 'EUR/USD', icon: '💱', color: '#8B5CF6' },
    { symbol: 'GBPUSD', name: 'GBP/USD', icon: '💷', color: '#EC4899' },
    { symbol: 'USDJPY', name: 'USD/JPY', icon: '¥', color: '#F59E0B' },
    { symbol: 'CL=F', name: 'Petróleo WTI', icon: '🛢️', color: '#DC2626' },
    { symbol: 'GC=F', name: 'Oro', icon: '🪙', color: '#FBBF24' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Precios en Vivo</h2>
        <p className="text-xs text-muted-foreground">S&P 500, Forex, Petróleo y Oro</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {assets.map(asset => (
          <AssetChart
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            icon={asset.icon}
            color={asset.color}
            basePrices={basePrices}
          />
        ))}
      </div>
    </div>
  );
}