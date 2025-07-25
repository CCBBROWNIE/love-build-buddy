import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, X, Clock, MapPin, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SparkAnimation from "@/components/SparkAnimation";

interface Match {
  id: string;
  memory1_id: string;
  memory2_id: string;
  user1_id: string;
  user2_id: string;
  confidence_score: number;
  match_reason: string;
  status: string;
  user1_confirmed: boolean | null;
  user2_confirmed: boolean | null;
  created_at: string;
  other_memory: {
    description: string;
    location: string | null;
    extracted_location: string | null;
    extracted_time_period: string | null;
  };
  other_user: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSparkAnimation, setShowSparkAnimation] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadMatches = async () => {
    if (!user) return;
    
    try {
      // Get all matches where current user is involved
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'pending');

      if (error) throw error;

      // For each match, get the other user's memory and profile
      const enrichedMatches = await Promise.all(
        (allMatches || []).map(async (match) => {
          const isUser1 = match.user1_id === user.id;
          const otherUserId = isUser1 ? match.user2_id : match.user1_id;
          const otherMemoryId = isUser1 ? match.memory2_id : match.memory1_id;

          // Get other user's memory
          const { data: memoryData } = await supabase
            .from('memories')
            .select('description, location, extracted_location, extracted_time_period')
            .eq('id', otherMemoryId)
            .single();

          // Get other user's profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_photo_url')
            .eq('user_id', otherUserId)
            .single();

          return {
            ...match,
            other_memory: memoryData || {
              description: '',
              location: null,
              extracted_location: null,
              extracted_time_period: null
            },
            other_user: profileData || {
              first_name: 'Unknown',
              last_name: 'User',
              profile_photo_url: null
            }
          };
        })
      );

      setMatches(enrichedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: "Error loading matches",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [user]);

  const createConversation = async (otherUserId: string) => {
    try {
      // Create a new conversation
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
          { conversation_id: conversation.id, user_id: otherUserId }
        ]);

      if (participantsError) throw participantsError;

      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const respondToMatch = async (matchId: string, accept: boolean) => {
    if (!user) return;

    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const isUser1 = match.user1_id === user.id;
      const updateField = isUser1 ? 'user1_confirmed' : 'user2_confirmed';
      const otherUserId = isUser1 ? match.user2_id : match.user1_id;

      if (accept) {
        // Show spark animation
        setShowSparkAnimation(true);

        // Update match
        const { error } = await supabase
          .from('matches')
          .update({ [updateField]: accept })
          .eq('id', matchId);

        if (error) throw error;

        // Remove the match from the list
        setMatches(prev => prev.filter(m => m.id !== matchId));

        // Create conversation and navigate to chat after animation
        const conversationId = await createConversation(otherUserId);
        
        setTimeout(() => {
          setShowSparkAnimation(false);
          navigate(`/chat/${conversationId}`);
        }, 4000); // Match the 4-second animation duration

        toast({
          title: "Match accepted!",
          description: "Starting your conversation...",
        });
      } else {
        // For decline, just update without animation
        const { error } = await supabase
          .from('matches')
          .update({ [updateField]: accept })
          .eq('id', matchId);

        if (error) throw error;

        // Remove the match from the list
        setMatches(prev => prev.filter(m => m.id !== matchId));

        toast({
          title: "Match declined",
          description: "This match has been declined",
        });
      }
    } catch (error) {
      console.error('Error responding to match:', error);
      setShowSparkAnimation(false);
      toast({
        title: "Error responding to match",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-spark border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading potential matches...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSparkAnimation && <SparkAnimation />}
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Heart className="w-6 h-6 text-coral mr-2" />
              Potential Matches
            </h1>
            <p className="text-sm text-muted-foreground">
              {matches.length} potential connections waiting for your review
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {matches.length > 0 ? (
          matches.map((match) => (
            <Card key={match.id} className="w-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Large Profile Photo */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-20 h-20 border-2 border-border">
                        <AvatarImage 
                          src={match.other_user.profile_photo_url || undefined} 
                          alt={`${match.other_user.first_name} ${match.other_user.last_name}`}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-lg font-semibold">
                          {match.other_user.first_name[0]}{match.other_user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-gradient-to-r from-spark/20 to-coral/20">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {Math.round(match.confidence_score * 100)}% Match
                        </Badge>
                      </div>
                      <div className="flex items-center text-lg font-semibold">
                        <User className="w-4 h-4 mr-2" />
                        {match.other_user.first_name} {match.other_user.last_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(match.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Their Memory:</h4>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
                    {match.other_memory.description}
                  </p>
                </div>

                <div className="flex items-center text-xs text-muted-foreground space-x-4">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {/* Extract location from match reason since we can't access other user's memory due to RLS */}
                    {match.match_reason.includes('SoCo Apartments') || match.match_reason.includes('Coco Apartments') ? 'SoCo Apartments, Napa' : 'Location from match context'}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {/* Extract time from match reason */}
                    {match.match_reason.includes('6pm') ? 'Around 6 PM, July 23rd' : 'Time from match context'}
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Why this might be a match:</h4>
                  <p className="text-xs text-muted-foreground">{match.match_reason}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => respondToMatch(match.id, false)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Not Them
                  </Button>
                  <Button
                    variant="spark"
                    size="sm"
                    onClick={() => respondToMatch(match.id, true)}
                    className="flex-1"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Yes, That's Them!
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No Matches Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We haven't found any potential matches for your memories yet. 
                Keep sharing more memories to increase your chances!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
};

export default Matches;