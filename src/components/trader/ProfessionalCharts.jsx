import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TIMEFRAMES = {
  "1": { label: "1 min", minutes: 1 },
  "5": { label: "5 min", minutes: 5 },
  "15": { label: "15 min", minutes: 15 },
  "30": { label: "30 min", minutes: 30 },
  "60": { label: "1H", minutes: 60 },
  "240": { label: "4H", minutes: 240 },
  "D": { label: "1D", minutes: 1440 },
  "W": { label: "1W", minutes: 10080 },
};

const PAIRS = [
  { id: "EURUSD", label: "EUR/USD", type: "forex" },
  { id: "GBPUSD", label: "GBP/USD", type: "forex" },
  { id: "USDJPY", label: "USD/JPY", type: "forex" },
  { id: "AUDUSD", label: "AUD/USD", type: "forex" },
  { id: "BTCUSD", label: "BTC/USD", type: "crypto" },
  { id: "ETHUSD", label: "ETH/USD", type: "crypto" },
  { id: "AAPL", label: "AAPL", type: "stock" },
  { id: "MSFT", label: "MSFT", type: "stock" },
  { id: "GOOGL", label: "GOOGL", type: "stock" },
  { id: "TSLA", label: "TSLA", type: "stock" },
];

// Genera datos de prueba realistas
const generateMockData = (pair, days = 100) => {
  const candles = [];
  let time = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  let close = pair.includes("BTC") ? 45000 : pair.includes("EUR") ? 1.1 : 150;

  for (let i = 0; i < days; i++) {
    const open = close;
    const variation = (Math.random() - 0.5) * 2;
    close = open * (1 + variation / 100);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.floor(Math.random() * 1000000 + 500000);

    candles.push({ time: Math.floor(time / 86400), open, high, low, close, volume });
    time += 86400;
  }

  return candles;
};

// Calcula EMA (Exponential Moving Average)
const calculateEMA = (candles, period) => {
  const ema = [];
  let sum = 0;
  const k = 2 / (period + 1);

  candles.forEach((candle, i) => {
    sum += candle.close;
    if (i === 0) {
      ema.push({ time: candle.time, value: sum });
    } else if (i < period) {
      ema.push({ time: candle.time, value: sum / (i + 1) });
    } else if (i === period) {
      ema.push({ time: candle.time, value: sum / period });
    } else {
      const newEMA = candle.close * k + ema[i - 1].value * (1 - k);
      ema.push({ time: candle.time, value: newEMA });
    }
  });

  return ema;
};

// Calcula RSI (Relative Strength Index)
const calculateRSI = (candles, period = 14) => {
  const rsi = [];
  let gains = 0,
    losses = 0;

  candles.forEach((candle, i) => {
    if (i === 0) return;
    const change = candle.close - candles[i - 1].close;
    if (i < period) {
      if (change > 0) gains += change;
      else losses += -change;
    } else if (i === period) {
      gains /= period;
      losses /= period;
    } else {
      gains = (gains * (period - 1) + (change > 0 ? change : 0)) / period;
      losses = (losses * (period - 1) + (change < 0 ? -change : 0)) / period;
    }

    const rs = losses === 0 ? 100 : gains === 0 ? 0 : gains / losses;
    const rsiValue = 100 - 100 / (1 + rs);
    rsi.push({ time: candle.time, value: rsiValue });
  });

  return rsi;
};

export default function ProfessionalCharts() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [pair, setPair] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("60");
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(false);

  const { data: candles = [], isLoading } = useQuery({
    queryKey: ["chart-data", pair],
    queryFn: () => generateMockData(pair, 100),
    staleTime: 30000,
    refetchInterval: 5000,
  });

  const ema20 = useMemo(() => (candles.length ? calculateEMA(candles, 20) : []), [candles]);
  const ema50 = useMemo(() => (candles.length ? calculateEMA(candles, 50) : []), [candles]);
  const rsi = useMemo(() => (candles.length ? calculateRSI(candles, 14) : []), [candles]);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Limpiar chart anterior
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Crear nuevo chart
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#333" },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: { timeVisible: true, secondsVisible: false },
      watermark: { visible: true, fontSize: 24, color: "rgba(0, 0, 0, 0.05)", text: pair },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    candlestickSeries.setData(candles);

    // EMA 20
    if (showEMA20) {
      const ema20Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        title: "EMA 20",
      });
      ema20Series.setData(ema20);
    }

    // EMA 50
    if (showEMA50) {
      const ema50Series = chart.addLineSeries({
        color: "#8b5cf6",
        lineWidth: 2,
        title: "EMA 50",
      });
      ema50Series.setData(ema50);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [candles, pair, showEMA20, showEMA50]);

  const pairLabel = PAIRS.find((p) => p.id === pair)?.label || pair;
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
  const change = ((currentPrice - prevPrice) / prevPrice) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Controles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select value={pair} onValueChange={setPair}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAIRS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIMEFRAMES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant={showEMA20 ? "default" : "outline"}
            onClick={() => setShowEMA20(!showEMA20)}
            className="flex-1"
          >
            {showEMA20 ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            EMA20
          </Button>
          <Button
            size="sm"
            variant={showEMA50 ? "default" : "outline"}
            onClick={() => setShowEMA50(!showEMA50)}
            className="flex-1"
          >
            {showEMA50 ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            EMA50
          </Button>
        </div>

        <Button
          size="sm"
          variant={showRSI ? "default" : "outline"}
          onClick={() => setShowRSI(!showRSI)}
          className="w-full"
        >
          {showRSI ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
          RSI
        </Button>
      </div>

      {/* Precio actual */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Par</p>
          <p className="text-lg font-bold">{pairLabel}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Precio</p>
          <p className="text-lg font-bold">${currentPrice.toFixed(4)}</p>
        </Card>
        <Card className={`p-4 ${change >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
          <p className="text-xs text-muted-foreground mb-1">Cambio</p>
          <p className={`text-lg font-bold flex items-center gap-1 ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Gráfica */}
      <Card className="overflow-hidden">
        {isLoading && (
          <div className="h-96 flex items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} style={{ height: "500px", width: "100%" }} />
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground">
          📊 <strong>Zoom:</strong> Scroll o Ctrl+Scroll | <strong>Pan:</strong> Arrastra con el mouse | <strong>Reset:</strong> Doble click
        </p>
      </Card>
    </div>
  );
}