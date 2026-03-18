import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ConversationManager({ agentName }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadConversations();
  }, [agentName]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await base44.agents.listConversations({ agent_name: agentName });
      const deleted = await base44.entities.DeletedConversation.list();
      const deletedIds = new Set(deleted.map(d => d.conversation_id));
      setConversations((convs || []).filter(c => !deletedIds.has(c.id)));
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setDeleting(conversationId);
      // Eliminar usando updateConversation con is_deleted flag si existe
      // O usar una función backend para eliminar
      await base44.functions.invoke('deleteAgentConversation', { 
        conversation_id: conversationId,
        agent_name: agentName 
      });
      setMessage("✓ Conversación eliminada");
      await loadConversations();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.startsWith('✓') 
            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground text-sm">No hay conversaciones</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {conv.metadata?.name || `Conversación ${conv.id.slice(0, 8)}`}
                </p>
                {conv.metadata?.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.metadata.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {conv.messages?.length || 0} mensajes
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.created_date).toLocaleDateString('es-CO')}
                  </span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteConversation(conv.id)}
                disabled={deleting === conv.id}
                className="ml-2 flex-shrink-0"
              >
                {deleting === conv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}