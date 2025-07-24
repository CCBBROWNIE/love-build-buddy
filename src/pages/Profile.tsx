import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { 
  User, 
  Edit3, 
  Calendar,
  Mail,
  Video,
  Heart,
  MessageCircle,
  Users,
  UserPlus,
  Camera
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio?: string;
  birthday: string;
  profile_photo_url?: string;
  verification_selfie_url?: string;
  is_verified: boolean;
  created_at: string;
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

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bio, setBio] = useState('');
  const [totalLikes, setTotalLikes] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserVideos();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setBio(data.bio || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVideos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, video_url, thumbnail_url, likes_count, comments_count, created_at, category')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
      
      // Calculate total likes
      const totalVideoLikes = data?.reduce((sum, video) => sum + (video.likes_count || 0), 0) || 0;
      setTotalLikes(totalVideoLikes);
      
      // Mock data for followers/following - you can replace with real data later
      setFollowers(42);
      setFollowing(23);
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUploaded = (url: string) => {
    if (profile) {
      setProfile({ ...profile, profile_photo_url: url });
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, bio });
      setIsEditingProfile(false);
      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-muted-foreground">Unable to load your profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage 
                  src={profile.profile_photo_url || undefined} 
                  className="object-cover w-full h-full"
                />
                <AvatarFallback className="text-2xl">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.is_verified && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center text-muted-foreground mb-4">
                <Mail className="w-4 h-4 mr-2" />
                <span>{profile.email}</span>
              </div>

              <div className="flex items-center text-muted-foreground mb-4">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>

              {/* Social Stats */}
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{followers}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Followers</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{following}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Following</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{totalLikes}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Likes</span>
                </div>
              </div>

              {/* Bio Section */}
              <div className="w-full">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {profile.bio || "No bio added yet."}
                  </p>
                </div>
              </div>

              {/* Edit Profile Button */}
              <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Profile Photo Upload */}
                    <ProfilePhotoUpload
                      onPhotoUploaded={handlePhotoUploaded}
                      currentPhotoUrl={profile.profile_photo_url}
                    />
                    
                    {/* Bio Edit */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="resize-none"
                        rows={3}
                        maxLength={150}
                      />
                      <p className="text-xs text-muted-foreground">{bio.length}/150 characters</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} className="flex-1">
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditingProfile(false);
                          setBio(profile.bio || '');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Videos Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              My Videos ({videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground">
                  Start creating content to see your videos here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {videos.map((video) => (
                  <div key={video.id} className="relative">
                    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200">
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
                              poster=""
                            />
                          )}
                          
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          {/* Category badge */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className={getCategoryColor(video.category)}>
                              {getCategoryText(video.category)}
                            </Badge>
                          </div>
                          
                          {/* Video info overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-white text-sm font-medium truncate mb-1">
                              {video.title}
                            </p>
                            <div className="flex items-center justify-between text-white/80 text-xs">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  <Heart className="w-3 h-3 mr-1" />
                                  <span>{video.likes_count || 0}</span>
                                </div>
                                <div className="flex items-center">
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  <span>{video.comments_count || 0}</span>
                                </div>
                              </div>
                              <span className="text-xs">
                                {new Date(video.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}