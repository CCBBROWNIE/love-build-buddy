import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_profile?: {
    first_name: string;
    profile_photo_url?: string;
  };
}

interface Conversation {
  id: string;
  participants: {
    user_id: string;
    profile: {
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
    };
  }[];
}

export default function PrivateChat() {
  const { conversationId, userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = conversation?.participants.find(p => p.user_id !== user?.id);

  useEffect(() => {
    if (!user) return;

    const initializeConversation = async () => {
      try {
        let currentConversationId = conversationId;

        // If no conversationId but we have a userId, create or find conversation
        if (!conversationId && userId) {
          // Check if conversation already exists between these users
          const { data: existingConversation } = await supabase
            .from('conversations')
            .select(`
              id,
              conversation_participants!inner (user_id)
            `)
            .eq('conversation_participants.user_id', user.id)
            .contains('conversation_participants', [{ user_id: userId }]);

          if (existingConversation && existingConversation.length > 0) {
            currentConversationId = existingConversation[0].id;
            navigate(`/private-chat/${currentConversationId}`, { replace: true });
          } else {
            // Create new conversation
            const { data: newConversation, error: conversationError } = await supabase
              .from('conversations')
              .insert({})
              .select()
              .single();

            if (conversationError) throw conversationError;

            // Add participants
            const { error: participantsError } = await supabase
              .from('conversation_participants')
              .insert([
                { conversation_id: newConversation.id, user_id: user.id },
                { conversation_id: newConversation.id, user_id: userId }
              ]);

            if (participantsError) throw participantsError;

            currentConversationId = newConversation.id;
            navigate(`/private-chat/${currentConversationId}`, { replace: true });
          }
        }

        if (currentConversationId) {
          // Load conversation details
          const { data: conversationData, error: conversationError } = await supabase
            .from('conversations')
            .select(`
              id,
              conversation_participants!inner (
                user_id,
                profiles!inner (
                  first_name,
                  last_name,
                  profile_photo_url
                )
              )
            `)
            .eq('id', currentConversationId)
            .single();

          if (conversationError) throw conversationError;

          setConversation({
            id: conversationData.id,
            participants: conversationData.conversation_participants.map((cp: any) => ({
              user_id: cp.user_id,
              profile: cp.profiles
            }))
          });

          // Load messages with separate profile query
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at')
            .eq('conversation_id', currentConversationId)
            .order('created_at', { ascending: true });

          if (messagesError) throw messagesError;

          // Get profiles for all message senders
          const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, profile_photo_url')
            .in('user_id', senderIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          setMessages(messagesData.map((msg: any) => ({
            ...msg,
            sender_profile: profileMap.get(msg.sender_id)
          })));
        }

      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [user, conversationId, userId, navigate, toast]);

  useEffect(() => {
    const currentConversationId = conversationId || conversation?.id;
    if (!currentConversationId) return;

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversationId}`
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              sender_id,
              created_at
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && newMessage) {
            // Get sender profile separately
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('first_name, profile_photo_url')
              .eq('user_id', newMessage.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMessage,
              sender_profile: senderProfile || undefined
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentConversationId = conversationId || conversation?.id;
    if (!newMessage.trim() || !user || !currentConversationId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <Card className="h-[80vh] flex flex-col">
          {/* Header */}
          <CardHeader className="flex-row items-center space-y-0 pb-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/feed')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {otherParticipant && (
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={otherParticipant.profile.profile_photo_url} />
                  <AvatarFallback>
                    {otherParticipant.profile.first_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {otherParticipant.profile.first_name} {otherParticipant.profile.last_name}
                  </CardTitle>
                </div>
              </div>
            )}
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground">
                Start your conversation! 👋
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" disabled={!newMessage.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}