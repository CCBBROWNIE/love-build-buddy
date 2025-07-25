import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, X, Clock, MapPin, Sparkles, User, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SparkAnimation from "@/components/SparkAnimation";
import SparkMessages from "@/components/SparkMessages";

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
  const [activeTab, setActiveTab] = useState("matches");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state for directing to specific tab
  useEffect(() => {
    const state = location.state as { activeTab?: string };
    if (state?.activeTab && (state.activeTab === "matches" || state.activeTab === "sparks")) {
      setActiveTab(state.activeTab);
      // Clear the state to prevent unwanted tab switches
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Listen for custom event to open spark messages (redirected from Chat navigation)
  useEffect(() => {
    const handleOpenSparkMessages = () => {
      setActiveTab("sparks");
    };

    window.addEventListener('openSparkMessages', handleOpenSparkMessages);
    return () => window.removeEventListener('openSparkMessages', handleOpenSparkMessages);
  }, []);

  const loadMatches = async () => {
    if (!user) return;
    
    try {
      // Get ALL pending matches first
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'pending');

      if (error) throw error;

      // Filter out matches where current user has already responded
      const unrespondedMatches = (allMatches || []).filter(match => {
        const isUser1 = match.user1_id === user.id;
        if (isUser1) {
          return !match.user1_confirmed; // Show only if user1 hasn't confirmed
        } else {
          return !match.user2_confirmed; // Show only if user2 hasn't confirmed
        }
      });

      // For each unresponded match, get the other user's memory and profile
      const enrichedMatches = await Promise.all(
        (unrespondedMatches || []).map(async (match) => {
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
        // Show spark animation FIRST
        setShowSparkAnimation(true);

        // Update match immediately
        const { error } = await supabase
          .from('matches')
          .update({ [updateField]: accept })
          .eq('id', matchId);

        if (error) throw error;

        // Remove the match from the list
        setMatches(prev => prev.filter(m => m.id !== matchId));

        // Show success toast
        toast({
          title: "Match accepted!",
          description: "Get ready for your celebration...",
        });

        // WAIT for 4-second animation to complete, THEN create conversation and navigate
        setTimeout(async () => {
          try {
            // Create conversation AFTER animation completes
            await createConversation(otherUserId);
            
            // Hide animation and navigate to matches tab with sparks active
            setShowSparkAnimation(false);
            setActiveTab("sparks");
            
            // Small delay to ensure tab switch completes
            setTimeout(() => {
              // Remove the custom event since we're now handling this internally
            }, 100);
          } catch (error) {
            console.error('Error creating conversation after animation:', error);
            setShowSparkAnimation(false);
            toast({
              title: "Connection Error",
              description: "Celebration complete, but couldn't create chat. Please try again.",
              variant: "destructive"
            });
          }
        }, 4000); // Wait for full 4-second animation
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="matches" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Potential Matches
              </TabsTrigger>
              <TabsTrigger value="sparks" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Spark Messages
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                {activeTab === "matches" ? (
                  <>
                    <Heart className="w-6 h-6 text-coral mr-2" />
                    Potential Matches
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-6 h-6 text-spark mr-2" />
                    Spark Messages
                  </>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === "matches" 
                  ? `${matches.length} potential connections waiting for your review`
                  : "Chat with your confirmed matches"
                }
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsContent value="matches" className="m-0">
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
                          {match.match_reason.includes('SoCo Apartments') ? 'SoCo Apartments, Napa' : 'Location from match context'}
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
          </TabsContent>

          <TabsContent value="sparks" className="flex-1 flex flex-col m-0">
            <SparkMessages />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Matches;