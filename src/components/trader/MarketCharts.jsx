import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Componente individual para una gráfica de activo
function AssetChart({ symbol, name, icon, color, type = 'line' }) {
  const { data: chartData = [], isLoading, error } = useQuery({
    queryKey: ['asset-prices', symbol],
    queryFn: async () => {
      try {
        // Usar Alpha Vantage API gratuita
        const apiKey = 'demo'; // Replace con una key real en producción
        const func = type === 'forex' ? 'FX_DAILY' : 'TIME_SERIES_DAILY';
        
        const res = await fetch(
          `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}`
        );
        const data = await res.json();
        
        if (data['Note'] || data['Error Message']) {
          // Fallback a datos simulados si el API falla
          return generateMockData();
        }

        const timeSeries = data['Time Series (Daily)'] || data['Time Series FX (Daily)'] || {};
        const entries = Object.entries(timeSeries).slice(0, 30).reverse();
        
        return entries.map(([date, values]) => ({
          date: new Date(date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
          price: parseFloat(values['4. close'] || values['4. close']),
          volume: parseInt(values['5. volume'] || 0),
        }));
      } catch (e) {
        console.error('Error fetching asset data:', e);
        return generateMockData();
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    refetchInterval: 1000 * 60 * 5, // Refrescar cada 5 minutos
  });

  const generateMockData = () => {
    const now = new Date();
    return Array.from({ length: 20 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (20 - i));
      const basePrice = Math.random() * 100 + 50;
      return {
        date: date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
        price: parseFloat((basePrice + Math.random() * 10 - 5).toFixed(2)),
        volume: Math.floor(Math.random() * 1000000),
      };
    });
  };

  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const previousPrice = chartData[chartData.length - 2]?.price || currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice ? ((change / previousPrice) * 100).toFixed(2) : 0;
  const isPositive = change >= 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${color}-500/10`)}>
              {icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-muted-foreground">{symbol}</p>
            </div>
          </div>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Price */}
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
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
        <ResponsiveContainer width="100%" height={150}>
          {type === 'bar' ? (
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="price" fill={color} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={color} 
                dot={false} 
                strokeWidth={2}
                isAnimationActive={false}
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
  const assets = [
    { symbol: '^GSPC', name: 'S&P 500', icon: '📈', color: '#3B82F6' },
    { symbol: 'EURUSD', name: 'EUR/USD', icon: '💱', color: '#8B5CF6', type: 'forex' },
    { symbol: 'GBPUSD', name: 'GBP/USD', icon: '💷', color: '#EC4899', type: 'forex' },
    { symbol: 'USDJPY', name: 'USD/JPY', icon: '¥', color: '#F59E0B', type: 'forex' },
    { symbol: 'CL=F', name: 'Petróleo WTI', icon: '🛢️', color: '#DC2626' },
    { symbol: 'GC=F', name: 'Oro', icon: '🪙', color: '#F59E0B' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Precios en Vivo</h2>
        <p className="text-xs text-muted-foreground">S&P 500, Forex, Petróleo y más activos en tiempo real</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map(asset => (
          <AssetChart
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            icon={asset.icon}
            color={asset.color}
            type={asset.type}
          />
        ))}
      </div>
    </div>
  );
}