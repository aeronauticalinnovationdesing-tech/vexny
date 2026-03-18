import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import RealtimeChart from './RealtimeChart';
import ActiveTrades from './ActiveTrades';

const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];

export default function ChartsWithIndicators() {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [indicators, setIndicators] = useState({
    rsi: true,
    ma20: true,
    ma50: true,
  });

  const { data: forexData, isLoading } = useQuery({
    queryKey: ['forex-realtime', selectedPair],
    queryFn: async () => {
      const res = await base44.functions.invoke('getForexData', {
        pair: selectedPair,
        interval: '1h',
      });
      return res.data;
    },
    refetchInterval: 60000,
  });

  const toggleIndicator = (indicator) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <CardTitle>Gráficos en Tiempo Real</CardTitle>
            <div className="flex gap-1 flex-wrap">
              {PAIRS.map(pair => (
                <Button
                  key={pair}
                  variant={selectedPair === pair ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPair(pair)}
                  disabled={isLoading}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  {pair}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Indicators Toggle */}
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={indicators.rsi ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleIndicator('rsi')}
              className="gap-2 text-xs sm:text-sm px-2 sm:px-3"
            >
              {indicators.rsi ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">RSI</span>
              <span className="sm:hidden">R</span>
            </Button>
            <Button
              variant={indicators.ma20 ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleIndicator('ma20')}
              className="gap-2 text-xs sm:text-sm px-2 sm:px-3"
            >
              {indicators.ma20 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">MA 20</span>
              <span className="sm:hidden">20</span>
            </Button>
            <Button
              variant={indicators.ma50 ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleIndicator('ma50')}
              className="gap-2 text-xs sm:text-sm px-2 sm:px-3"
            >
              {indicators.ma50 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">MA 50</span>
              <span className="sm:hidden">50</span>
            </Button>
          </div>

          {/* Chart */}
          {isLoading ? (
            <div className="flex justify-center items-center h-40 sm:h-64">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : forexData ? (
            <RealtimeChart
              pair={selectedPair}
              candles={forexData.candles}
              showRSI={indicators.rsi}
              showMA20={indicators.ma20}
              showMA50={indicators.ma50}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Active Trades */}
      <ActiveTrades />
    </div>
  );
}