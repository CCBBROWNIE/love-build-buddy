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
  console.log('=== PRIVATE CHAT COMPONENT RENDERING ===');
  const { conversationId, userId } = useParams();
  console.log('=== ROUTE PARAMS ===', { conversationId, userId });
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = conversation?.participants.find(p => p.user_id !== user?.id);

  // Simple test - just create conversation immediately if we're on /new route
  useEffect(() => {
    console.log('PrivateChat useEffect - Route params:', { conversationId, userId });
    console.log('PrivateChat useEffect - Auth state:', { user: !!user, session: !!session });
    
    if (!user) {
      console.log('No user - waiting for auth');
      return;
    }

    // If we're on the /new route and have a userId, create conversation immediately  
    if (!conversationId && userId) {
      console.log('Creating conversation between', user.id, 'and', userId);
      createConversationNow();
    } else if (conversationId) {
      console.log('Loading existing conversation:', conversationId);
      loadConversation(conversationId);
    }
  }, [user, conversationId, userId]);

  const createConversationNow = async () => {
    try {
      // Create new conversation
      console.log('Creating new conversation...');
      
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        throw conversationError;
      }

      console.log('Created conversation:', newConversation.id);

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: userId }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        throw participantsError;
      }

      console.log('Added participants successfully');
      navigate(`/private-chat/${newConversation.id}`, { replace: true });
      
    } catch (error: any) {
      console.error('Error in createConversationNow:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      // Load conversation participants separately (no foreign key relationship defined)
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId);

      if (participantsError) throw participantsError;

      // Get profiles for participants
      const userIds = participantsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create conversation object
      setConversation({
        id: convId,
        participants: profilesData.map(profile => ({
          user_id: profile.user_id,
          profile: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            profile_photo_url: profile.profile_photo_url
          }
        }))
      });

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('conversation_id', convId)
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
      
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  

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
    console.log('Send message clicked!');
    console.log('Current conversation ID:', currentConversationId);
    console.log('Message content:', newMessage);
    console.log('User:', user?.id);
    console.log('Sending state:', sending);
    
    if (!newMessage.trim() || !user || !currentConversationId || sending) {
      console.log('Send message blocked:', {
        hasMessage: !!newMessage.trim(),
        hasUser: !!user,
        hasConversation: !!currentConversationId,
        notSending: !sending
      });
      return;
    }

    setSending(true);
    try {
      console.log('Attempting to send message...');
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Message sent successfully!');
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
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