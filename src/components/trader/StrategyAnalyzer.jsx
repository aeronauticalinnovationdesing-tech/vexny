import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Send, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const QUICK_QUESTIONS = [
  "¿Cuál es mi setup más rentable?",
  "¿Estoy haciendo revenge trading?",
  "¿Cómo mejorar mi gestión de riesgo?",
  "¿Cuándo debo dejar de operar en el día?",
  "Dame un plan de mejora para este mes",
];

export default function StrategyAnalyzer({ trades = [], accountType = "general" }) {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setAnalysis("");
    setExpanded(true);
    try {
      const res = await base44.functions.invoke("analyzeStrategy", {
        trades,
        question: query,
        accountType,
      });
      setAnalysis(res.data?.analysis || "No se pudo generar el análisis.");
    } catch (err) {
      setAnalysis("Error al analizar. Intenta de nuevo.");
    }
    setLoading(false);
    setQuestion("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h3 className="font-semibold">Analizador de Estrategia IA</h3>
          <p className="text-xs text-muted-foreground">Análisis profundo de tu operativa · Claude Sonnet</p>
        </div>
      </div>

      {/* Quick questions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => analyze(q)} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 border border-border transition-all disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Haz una pregunta sobre tu estrategia..."
          onKeyDown={e => e.key === "Enter" && analyze()}
          disabled={loading}
          className="text-sm"
        />
        <Button onClick={() => analyze()} disabled={loading || !question.trim()} size="icon">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Analysis result */}
      {loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
          <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">Analizando tu estrategia con IA...</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="rounded-xl bg-muted/40 border border-border">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Análisis de tu estrategia
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4 text-sm prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {trades.length < 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          💡 Registra al menos 5 trades para análisis más precisos
        </p>
      )}
    </div>
  );
}