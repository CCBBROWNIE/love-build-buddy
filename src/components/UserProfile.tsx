import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, X } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;
}

interface UserVideo {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  category: string;
}

interface UserProfileProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ userId, username, isOpen, onClose }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
      fetchUserVideos();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, bio, profile_photo_url')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile.",
        variant: "destructive",
      });
    }
  };

  const fetchUserVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, video_url, thumbnail_url, likes_count, comments_count, created_at, category')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    toast({
      title: "Messaging",
      description: "Private messaging coming soon!",
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'memory': return 'bg-purple-500/80';
      case 'user-content': return 'bg-blue-500/80';
      default: return 'bg-gray-500/80';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'memory': return 'Memory';
      case 'user-content': return 'Content';
      default: return 'Video';
    }
  };

  if (!profile && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="sr-only">User Profile</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto">
            {/* Profile Header */}
            <div className="p-6 text-center border-b">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={profile.profile_photo_url || undefined} />
                <AvatarFallback className="text-lg">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold mb-1">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-muted-foreground mb-2">@{username}</p>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
              )}
              <Button onClick={handleMessage} className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>

            {/* Videos Section */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Videos ({videos.length})
              </h3>
              {videos.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No videos posted yet
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative aspect-[9/16] bg-gray-100">
                          {video.thumbnail_url ? (
                            <img 
                              src={video.thumbnail_url} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={video.video_url}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className={getCategoryColor(video.category)}>
                              {getCategoryText(video.category)}
                            </Badge>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                            <p className="text-white text-xs font-medium truncate">
                              {video.title}
                            </p>
                            <div className="flex items-center text-white/70 text-xs mt-1">
                              <span>{video.likes_count} likes</span>
                              <span className="mx-1">•</span>
                              <span>{video.comments_count} comments</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}