import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface Conversation {
  id: string;
  last_message_at: string;
  otherParticipant: {
    profiles: {
      first_name: string;
      last_name: string;
      profile_photo_url: string | null;
    };
  };
}

const PrivateMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { markConversationAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const conversationIds = participantData.map(p => p.conversation_id);
        
        // Get conversation details
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('last_message_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        // For each conversation, get the other participant's profile
        const conversationsWithProfiles = await Promise.all(
          conversationsData.map(async (conv) => {
            // Get other participants in this conversation
            const { data: participants, error: participantsError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id);

            if (participantsError) throw participantsError;

            if (participants && participants.length > 0) {
              // Get the profile for the other participant
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('first_name, last_name, profile_photo_url')
                .eq('user_id', participants[0].user_id)
                .single();

              if (profileError) {
                console.error('Error fetching profile:', profileError);
              }

              return {
                ...conv,
                otherParticipant: {
                  profiles: profileData || {
                    first_name: 'Unknown',
                    last_name: 'User', 
                    profile_photo_url: null
                  }
                }
              };
            }

            return {
              ...conv,
              otherParticipant: {
                profiles: {
                  first_name: 'Unknown',
                  last_name: 'User',
                  profile_photo_url: null
                }
              }
            };
          })
        );

        setConversations(conversationsWithProfiles);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = async (conversationId: string) => {
    // Mark messages as read in this conversation
    await markConversationAsRead(conversationId);
    // Navigate to the conversation
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleConversationClick(conversation.id)}
            >
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={conversation.otherParticipant?.profiles?.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {conversation.otherParticipant?.profiles?.first_name?.[0]}
                    {conversation.otherParticipant?.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {conversation.otherParticipant?.profiles?.first_name} {conversation.otherParticipant?.profiles?.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {conversation.last_message_at ? 
                      new Date(conversation.last_message_at).toLocaleDateString() : 
                      'New conversation'
                    }
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Private Messages</h2>
            <p className="text-muted-foreground mb-6">
              Direct conversations with people who found you through other means will appear here.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>No private messages yet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateMessages;