import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SparkMessage {
  id: string;
  otherUserId: string;
  otherUser: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  matchReason: string;
  confidenceScore: number;
  createdAt: string;
}

const SparkMessages = () => {
  const [sparkMessages, setSparkMessages] = useState<SparkMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSparkMessages();
    }
  }, [user]);

  const loadSparkMessages = async () => {
    if (!user) return;

    try {
      // Get accepted matches where both users confirmed
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('user1_confirmed', true)
        .eq('user2_confirmed', true);

      if (error) throw error;

      // For each match, get the other user's profile
      const sparkMessagesData = await Promise.all(
        (matches || []).map(async (match) => {
          const isUser1 = match.user1_id === user.id;
          const otherUserId = isUser1 ? match.user2_id : match.user1_id;

          // Get other user's profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_photo_url')
            .eq('user_id', otherUserId)
            .single();

          return {
            id: match.id,
            otherUserId: otherUserId,
            otherUser: profileData || {
              first_name: 'Unknown',
              last_name: 'User',
              profile_photo_url: null
            },
            matchReason: match.match_reason,
            confidenceScore: match.confidence_score,
            createdAt: match.created_at
          };
        })
      );

      setSparkMessages(sparkMessagesData);
    } catch (error) {
      console.error('Error loading spark messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSparkMessageClick = async (sparkMessage: SparkMessage) => {
    try {
      // Check if conversation already exists
      const { data: existingConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);

      if (existingConversations) {
        const conversationIds = existingConversations.map(c => c.conversation_id);
        
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', sparkMessage.otherUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipants && otherParticipants.length > 0) {
          // Conversation exists, navigate to it
          navigate(`/chat/${otherParticipants[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (conversationError) throw conversationError;

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: user!.id },
          { conversation_id: conversation.id, user_id: sparkMessage.otherUserId }
        ]);

      if (participantsError) throw participantsError;

      // Navigate to the new conversation
      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Error opening spark message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-spark border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading spark messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {sparkMessages.length > 0 ? (
        <div className="space-y-3">
          {sparkMessages.map((sparkMessage) => (
            <Card 
              key={sparkMessage.id} 
              className="p-4 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleSparkMessageClick(sparkMessage)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="border-2 border-spark/20 group-hover:border-spark/50 transition-colors">
                    <AvatarImage src={sparkMessage.otherUser.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-spark/20 to-coral/20">
                      {sparkMessage.otherUser.first_name[0]}
                      {sparkMessage.otherUser.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-4 h-4 text-spark" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium">
                      {sparkMessage.otherUser.first_name} {sparkMessage.otherUser.last_name}
                    </h3>
                    <Badge variant="secondary" className="bg-gradient-to-r from-spark/20 to-coral/20 text-xs">
                      {Math.round(sparkMessage.confidenceScore * 100)}% Match
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {sparkMessage.matchReason}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Matched {new Date(sparkMessage.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center text-spark text-sm">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      <span>Chat</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-spark/20 to-coral/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-spark" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Spark Messages</h2>
            <p className="text-muted-foreground mb-6">
              When you and someone else both confirm a match, you'll be able to start chatting here!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>No matches confirmed yet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparkMessages;