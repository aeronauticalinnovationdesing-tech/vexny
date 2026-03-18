import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const PATTERNS = [
  {
    id: 1,
    name: "Head and Shoulders",
    type: "Reversión",
    trend: "Bajista",
    description: "Patrón de reversión con tres picos: uno central más alto que los laterales.",
    signals: ["Señal de venta después del cuello roto", "Objetivo: distancia del peak al cuello"],
    reliability: "85%",
    category: "Clásico"
  },
  {
    id: 2,
    name: "Double Top",
    type: "Reversión",
    trend: "Bajista",
    description: "Dos picos de igual altura seguidos de una caída.",
    signals: ["Resistencia establecida", "Venta en rotura de soporte"],
    reliability: "80%",
    category: "Clásico"
  },
  {
    id: 3,
    name: "Double Bottom",
    type: "Reversión",
    trend: "Alcista",
    description: "Dos valles de igual altura seguidos de una subida.",
    signals: ["Soporte establecido", "Compra en rotura de resistencia"],
    reliability: "80%",
    category: "Clásico"
  },
  {
    id: 4,
    name: "Triangle (Triángulo)",
    type: "Continuación",
    trend: "Neutral",
    description: "Convergencia de dos líneas de tendencia formando un triángulo.",
    signals: ["Expansión volumétrica en rotura", "Continuación de tendencia"],
    reliability: "75%",
    category: "Clásico"
  },
  {
    id: 5,
    name: "Pennant",
    type: "Continuación",
    trend: "Neutral",
    description: "Pequeño triángulo simétrico tras un movimiento fuerte.",
    signals: ["Rotura rápida esperada", "Volumen en rotura"],
    reliability: "78%",
    category: "Clásico"
  },
  {
    id: 6,
    name: "Flag",
    type: "Continuación",
    trend: "Neutral",
    description: "Patrón rectangular en consolidación después de impulso fuerte.",
    signals: ["Continuación de tendencia", "Altura del flag = objetivo"],
    reliability: "82%",
    category: "Clásico"
  },
  {
    id: 7,
    name: "Cup and Handle",
    type: "Continuación",
    trend: "Alcista",
    description: "Forma de taza con asa: consolidación suave seguida de pequeño retroceso.",
    signals: ["Muy confiable en uptrends", "Objetivo = altura de la taza"],
    reliability: "88%",
    category: "Avanzado"
  },
  {
    id: 8,
    name: "Wedge",
    type: "Reversión/Continuación",
    trend: "Neutral",
    description: "Convergencia diagonal de dos líneas en la dirección opuesta a la tendencia.",
    signals: ["Rotura genera movimiento fuerte", "Puede ser reversión o continuación"],
    reliability: "76%",
    category: "Clásico"
  },
  {
    id: 9,
    name: "Rising Wedge",
    type: "Reversión",
    trend: "Bajista",
    description: "Cuña ascendente en uptrend: señal de posible reversión.",
    signals: ["Venta en rotura de soporte", "Baja confiabilidad en corto plazo"],
    reliability: "65%",
    category: "Clásico"
  },
  {
    id: 10,
    name: "Falling Wedge",
    type: "Reversión",
    trend: "Alcista",
    description: "Cuña descendente en downtrend: señal de posible reversión.",
    signals: ["Compra en rotura de resistencia", "Buen potencial alcista"],
    reliability: "70%",
    category: "Clásico"
  },
  {
    id: 11,
    name: "Diamond",
    type: "Reversión",
    trend: "Neutro",
    description: "Expansión seguida de convergencia formando un rombo.",
    signals: ["Reversión de tendencia", "Volumen en rotura crítico"],
    reliability: "72%",
    category: "Clásico"
  },
  {
    id: 12,
    name: "Broadening Top",
    type: "Reversión",
    trend: "Bajista",
    description: "Expansión de volatilidad en máximos: muy agresiva.",
    signals: ["Señal de pánico", "Reversión muy fuerte"],
    reliability: "60%",
    category: "Avanzado"
  },
  {
    id: 13,
    name: "Breakaway Gap",
    type: "Continuación",
    trend: "Neutral",
    description: "Salto de precio en volumen alto al romper un nivel.",
    signals: ["Impulso fuerte en dirección de brecha", "Generalmente no se rellena"],
    reliability: "80%",
    category: "Clásico"
  },
  {
    id: 14,
    name: "Exhaustion Gap",
    type: "Reversión",
    trend: "Neutral",
    description: "Brecha en final de tendencia: agotamiento del movimiento.",
    signals: ["Fin probable del movimiento", "Reversión inminente"],
    reliability: "75%",
    category: "Avanzado"
  },
  {
    id: 15,
    name: "Runaway Gap",
    type: "Continuación",
    trend: "Neutral",
    description: "Brecha en medio de tendencia fuerte, no se rellena.",
    signals: ["Continuación de tendencia", "Validación de fortaleza"],
    reliability: "83%",
    category: "Clásico"
  },
  {
    id: 16,
    name: "Island Reversal",
    type: "Reversión",
    trend: "Neutral",
    description: "Isla de precios aislada por dos brechas en dirección opuesta.",
    signals: ["Reversión de tendencia muy confiable", "Cambio de dirección inminente"],
    reliability: "84%",
    category: "Avanzado"
  },
  {
    id: 17,
    name: "Harmonic AB=CD",
    type: "Continuación",
    trend: "Neutral",
    description: "Patrón armónico donde segmentos tienen relación 1:1.",
    signals: ["Target en zona D", "Requiere precisión de medida"],
    reliability: "77%",
    category: "Armónico"
  },
  {
    id: 18,
    name: "Gartley Pattern",
    type: "Reversión",
    trend: "Neutral",
    description: "Patrón armónico complejo con proporciones Fibonacci específicas.",
    signals: ["Zona de reversión en D", "M-shaped para alcista"],
    reliability: "79%",
    category: "Armónico"
  },
  {
    id: 19,
    name: "Butterfly Pattern",
    type: "Reversión",
    trend: "Neutral",
    description: "Patrón armónico con extensión: proporciones 1.27 de rango XA.",
    signals: ["Reversión en zona D", "Alta precisión requerida"],
    reliability: "78%",
    category: "Armónico"
  },
  {
    id: 20,
    name: "Crab Pattern",
    type: "Reversión",
    trend: "Neutral",
    description: "Patrón armónico extremo: proporciones muy específicas.",
    signals: ["Target extremo en zona D", "Altísima precisión requerida"],
    reliability: "73%",
    category: "Armónico"
  },
  {
    id: 21,
    name: "Three White Soldiers",
    type: "Reversión",
    trend: "Alcista",
    description: "Tres velas blancas (alcistas) consecutivas en downtrend.",
    signals: ["Reversión alcista fuerte", "Cada vela abre y cierra más alto"],
    reliability: "82%",
    category: "Velas"
  },
  {
    id: 22,
    name: "Three Black Crows",
    type: "Reversión",
    trend: "Bajista",
    description: "Tres velas negras (bajistas) consecutivas en uptrend.",
    signals: ["Reversión bajista fuerte", "Cada vela abre y cierra más bajo"],
    reliability: "82%",
    category: "Velas"
  },
  {
    id: 23,
    name: "Morning Star",
    type: "Reversión",
    trend: "Alcista",
    description: "Tres velas: bajista, pequeña, alcista. Reversión en downtrend.",
    signals: ["Cambio de momentum", "Compra en confirmación"],
    reliability: "80%",
    category: "Velas"
  },
  {
    id: 24,
    name: "Evening Star",
    type: "Reversión",
    trend: "Bajista",
    description: "Tres velas: alcista, pequeña, bajista. Reversión en uptrend.",
    signals: ["Cambio de momentum", "Venta en confirmación"],
    reliability: "80%",
    category: "Velas"
  },
  {
    id: 25,
    name: "Hammer",
    type: "Reversión",
    trend: "Alcista",
    description: "Vela con mecha larga hacia abajo y cuerpo pequeño en bottom.",
    signals: ["Reversión alcista", "Rechazo del nivel bajo"],
    reliability: "75%",
    category: "Velas"
  },
  {
    id: 26,
    name: "Hanging Man",
    type: "Reversión",
    trend: "Bajista",
    description: "Vela con mecha larga hacia abajo en uptrend (opuesto a Hammer).",
    signals: ["Reversión bajista", "Agotamiento del impulso"],
    reliability: "72%",
    category: "Velas"
  },
  {
    id: 27,
    name: "Doji",
    type: "Indecisión",
    trend: "Neutral",
    description: "Vela con open y close iguales: muestra indecisión del mercado.",
    signals: ["Punto de inflexión", "Necesita confirmación"],
    reliability: "65%",
    category: "Velas"
  },
  {
    id: 28,
    name: "Harami",
    type: "Reversión",
    trend: "Neutral",
    description: "Vela pequeña dentro del rango de la vela anterior.",
    signals: ["Cambio de momentum", "Pausa antes de reversión"],
    reliability: "70%",
    category: "Velas"
  },
  {
    id: 29,
    name: "Order Block",
    type: "Soporte/Resistencia",
    trend: "Neutral",
    description: "Bloque de órdenes donde grandes volúmenes se ejecutaron.",
    signals: ["Soporte/Resistencia fuerte", "Rebote esperado"],
    reliability: "81%",
    category: "ICT/SMC"
  },
  {
    id: 30,
    name: "Fair Value Gap (FVG)",
    type: "Continuación",
    trend: "Neutral",
    description: "Brecha de valor justo: espacio no tocado en patrón de velas.",
    signals: ["Retroceso a llenar FVG", "Soporte/Resistencia dinámico"],
    reliability: "76%",
    category: "ICT/SMC"
  },
  {
    id: 31,
    name: "Break of Structure (BOS)",
    type: "Continuación",
    trend: "Neutral",
    description: "Rotura de la estructura de máximos o mínimos previos.",
    signals: ["Cambio de dirección del mercado", "Seguimiento de tendencia"],
    reliability: "79%",
    category: "ICT/SMC"
  },
  {
    id: 32,
    name: "Pullback",
    type: "Continuación",
    trend: "Neutral",
    description: "Retroceso hacia nivel de soporte en uptrend (o resistencia en downtrend).",
    signals: ["Oportunidad de entrada", "Volumen bajo en retroceso"],
    reliability: "78%",
    category: "Clásico"
  },
  {
    id: 33,
    name: "Retracement Fibonacci",
    type: "Soporte/Resistencia",
    trend: "Neutral",
    description: "Niveles donde el precio tiende a rebotar (38.2%, 50%, 61.8%).",
    signals: ["Niveles probables de bounce", "Confirmación con indicadores"],
    reliability: "74%",
    category: "Fibonacci"
  },
  {
    id: 34,
    name: "Bollinger Band Squeeze",
    type: "Preparación",
    trend: "Neutral",
    description: "Volatilidad muy baja: bandas comprimidas indican explosión próxima.",
    signals: ["Breakout inminente", "Esperar confirmación"],
    reliability: "72%",
    category: "Indicador"
  },
  {
    id: 35,
    name: "RSI Divergence",
    type: "Reversión",
    trend: "Neutral",
    description: "Precio hace nuevo máximo pero RSI no: señal de debilidad.",
    signals: ["Posible reversión", "Confirmación en precio importante"],
    reliability: "73%",
    category: "Indicador"
  },
  {
    id: 36,
    name: "MACD Crossover",
    type: "Cambio de Momentum",
    trend: "Neutral",
    description: "Línea MACD cruza la señal: cambio de dirección de momentum.",
    signals: ["Entrada/Salida", "Mayor confiabilidad en volumen"],
    reliability: "71%",
    category: "Indicador"
  },
  {
    id: 37,
    name: "EMA Crossover",
    type: "Continuación",
    trend: "Neutral",
    description: "EMA rápida cruza EMA lenta: cambio de dirección de tendencia.",
    signals: ["Entrada/Salida", "Golden Cross y Dead Cross clásicos"],
    reliability: "70%",
    category: "Indicador"
  },
  {
    id: 38,
    name: "Support and Resistance",
    type: "Niveles",
    trend: "Neutral",
    description: "Zonas donde el precio históricamente rebota.",
    signals: ["Base para Stop Loss", "Objetivos de ganancia"],
    reliability: "75%",
    category: "Fundamental"
  },
  {
    id: 39,
    name: "Trendline",
    type: "Tendencia",
    trend: "Neutral",
    description: "Línea conectando máximos (resistencia) o mínimos (soporte).",
    signals: ["Dirección de tendencia", "Rotura indica cambio"],
    reliability: "72%",
    category: "Fundamental"
  },
  {
    id: 40,
    name: "Volume Profile",
    type: "Análisis de Volumen",
    trend: "Neutral",
    description: "Distribución de volumen por nivel de precio.",
    signals: ["Áreas de control de mercado", "Puntos de inflexión"],
    reliability: "76%",
    category: "Avanzado"
  }
];

export default function TechnicalPatterns() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const categories = ["Todos", ...new Set(PATTERNS.map(p => p.category))];
  
  const filtered = PATTERNS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                       p.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="w-full space-y-6 p-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Patrones Técnicos Profesionales</h1>
        <p className="text-muted-foreground">Referencia completa de 40 patrones técnicos del análisis de mercados financieros</p>
      </div>

      {/* Búsqueda y filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar patrón..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de patrones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pattern) => (
          <Card key={pattern.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-lg">{pattern.name}</h3>
                <Badge variant={pattern.trend === "Alcista" ? "default" : pattern.trend === "Bajista" ? "destructive" : "secondary"}>
                  {pattern.trend === "Alcista" && <TrendingUp className="w-3 h-3 mr-1" />}
                  {pattern.trend === "Bajista" && <TrendingDown className="w-3 h-3 mr-1" />}
                  {pattern.trend}
                </Badge>
              </div>

              {/* Tipo y categoría */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{pattern.type}</Badge>
                <Badge variant="outline" className="text-xs">{pattern.category}</Badge>
              </div>

              {/* Descripción */}
              <p className="text-sm text-muted-foreground">{pattern.description}</p>

              {/* Señales */}
              <div className="bg-muted/50 p-3 rounded space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Señales:</p>
                {pattern.signals.map((signal, i) => (
                  <p key={i} className="text-xs text-foreground">✓ {signal}</p>
                ))}
              </div>

              {/* Confiabilidad */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Confiabilidad:</span>
                <span className="font-bold text-primary">{pattern.reliability}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron patrones</p>
        </div>
      )}
    </div>
  );
}