import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, agent_name } = await req.json();

    if (!conversation_id || !agent_name) {
      return Response.json({ error: 'Missing conversation_id or agent_name' }, { status: 400 });
    }

    // Registrar la eliminación en la base de datos
    await base44.asServiceRole.entities.DeletedConversation.create({
      conversation_id,
      agent_name,
      user_email: user.email
    });

    return Response.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});