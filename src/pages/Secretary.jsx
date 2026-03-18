import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Bot, Send, Loader2, Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

const AGENT_BY_PROFILE = {
  trader: "trader_specialist",
  drone_pilot: "drone_pilot_specialist",
  startup: "startup_specialist",
  elite_human: "elite_human_specialist",
};

const PROFILE_LABELS = {
  trader: "Especialista Trader",
  drone_pilot: "Especialista Drone Pilot",
  startup: "Especialista Startup",
  elite_human: "Coach Elite Human",
};

const QUICK_PROMPTS = {
  trader: ["Analiza mis finanzas", "Crea un plan de trading", "¿Qué trades tengo pendientes?", "Crea una rutina de análisis"],
  drone_pilot: ["¿Cómo están mis drones?", "Crea un plan de mantenimiento", "Revisa mis pilotos activos", "Crea tareas de inspección"],
  startup: ["Resumen de mis proyectos", "Crea un roadmap", "¿Cómo van mis finanzas?", "Crea tareas para el equipo"],
  elite_human: ["¿Cómo va mi semana?", "Crea un plan de metas", "Diseña mi rutina diaria", "¿Qué tareas tengo hoy?"],
};

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const hasToolCalls = message.tool_calls?.length > 0;

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={cn("max-w-[80%] space-y-2", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
        {hasToolCalls && (
          <div className="space-y-1">
            {message.tool_calls.map((tc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tc.status === "completed" ? "bg-emerald-500" : tc.status === "running" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
                )} />
                <span>{tc.status === "completed" ? "✓" : "⋯"} {tc.name?.split(".").reverse().join(" ").toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Secretary() {
  const { activeProfileId } = useProfile();
  const user = useCurrentUser();
  const agentName = AGENT_BY_PROFILE[activeProfileId] || "elite_human_specialist";
  const agentLabel = PROFILE_LABELS[activeProfileId] || "Asistente IA";
  const quickPrompts = QUICK_PROMPTS[activeProfileId] || QUICK_PROMPTS.elite_human;

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [agentName]);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeConvId) return;
    const unsub = base44.agents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConvId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(convs || []);
      if (convs?.length > 0) {
        openConversation(convs[0].id);
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (_) {}
    setLoadingConvs(false);
  };

  const openConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const conv = await base44.agents.getConversation(convId);
      setMessages(conv.messages || []);
    } catch (_) {}
  };

  const createNewConversation = async () => {
    const now = format(new Date(), "d MMM yyyy HH:mm", { locale: es });
    const conv = await base44.agents.createConversation({
      agent_name: agentName,
      metadata: { name: `Sesión ${now}` },
    });
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    let convId = activeConvId;
    if (!convId) {
      const now = format(new Date(), "d MMM yyyy HH:mm", { locale: es });
      const conv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { name: msg.slice(0, 40) },
      });
      convId = conv.id;
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(convId);
    }

    const conv = conversations.find(c => c.id === convId) || { id: convId };
    await base44.agents.addMessage(conv, { role: "user", content: msg });
    setSending(false);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar: conversations */}
      <div className="w-60 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button onClick={createNewConversation} size="sm" className="w-full gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Nueva sesión
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sin sesiones previas</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2",
                  conv.id === activeConvId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{conv.metadata?.name || "Sesión"}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{agentLabel}</p>
            <p className="text-xs text-muted-foreground">
              {activeConv ? activeConv.metadata?.name : "Accede a tus datos y crea planes en tiempo real"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{agentLabel}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Tengo acceso a todos tus datos. Puedo leer, crear y actualizar tareas, proyectos, notas y más.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {quickPrompts.map(q => (
                  <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {sending && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Pregunta a tu ${agentLabel}...`}
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}