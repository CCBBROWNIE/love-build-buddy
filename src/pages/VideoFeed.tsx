import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  MoreHorizontal,
  User,
  Trash2,
  Repeat2,
  Copy,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VideoUpload } from "@/components/VideoUpload";
import { VideoComments } from "@/components/VideoComments";
import { UserProfile } from "@/components/UserProfile";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoPost {
  id: string;
  userId: string;
  username: string;
  profilePhotoUrl?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  category: "memory" | "user-content" | "ad";
}


const VideoFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch videos from database
  const fetchVideos = async () => {
    try {
      const { data: videosData, error } = await supabase
        .from('videos')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        setVideos([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(videosData.map(v => v.user_id))];
      
      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const formattedVideos: VideoPost[] = videosData.map(video => {
        const profile = profilesMap.get(video.user_id);
        const username = profile ? `@${profile.first_name.toLowerCase()}` : '@user';
        
        return {
          id: video.id,
          userId: video.user_id,
          username,
          profilePhotoUrl: profile?.profile_photo_url,
          title: video.title,
          description: video.description || '',
          videoUrl: video.video_url,
          thumbnailUrl: video.thumbnail_url || '',
          likes: video.likes_count || 0,
          comments: video.comments_count || 0,
          shares: video.shares_count || 0,
          isLiked: false, // We'll check this separately
          category: video.category as VideoPost['category'] || 'user-content'
        };
      });

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error in fetchVideos:', error);
      setVideos([]);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleLike = async (videoId: string) => {
    if (!user) return;

    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    try {
      if (video.isLiked) {
        // Unlike
        await supabase
          .from('video_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .eq('interaction_type', 'like');
      } else {
        // Like
        await supabase
          .from('video_interactions')
          .insert({
            user_id: user.id,
            video_id: videoId,
            interaction_type: 'like'
          });
      }

      // Update local state
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { 
              ...v, 
              isLiked: !v.isLiked,
              likes: v.isLiked ? v.likes - 1 : v.likes + 1
            }
          : v
      ));
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;

    try {
      // Check if this video belongs to the current user
      const { data: videoData, error: fetchError } = await supabase
        .from('videos')
        .select('user_id, video_url')
        .eq('id', videoId)
        .single();

      if (fetchError) {
        console.error('Error fetching video:', fetchError);
        return;
      }

      if (videoData.user_id !== user.id) {
        toast({
          title: "Cannot delete video",
          description: "You can only delete your own videos.",
          variant: "destructive",
        });
        return;
      }

      // Delete video from database
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) {
        console.error('Error deleting video:', deleteError);
        toast({
          title: "Error deleting video",
          description: "Failed to delete video. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Delete video file from storage
      if (videoData.video_url) {
        const url = new URL(videoData.video_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts.slice(-2).join('/'); // user_id/filename
        
        await supabase.storage
          .from('user-videos')
          .remove([fileName]);
      }

      // Update local state
      setVideos(prev => prev.filter(v => v.id !== videoId));
      
      toast({
        title: "Video deleted",
        description: "Your video has been deleted successfully.",
      });

      // Refresh videos to ensure consistency
      fetchVideos();

    } catch (error) {
      console.error('Error in handleDeleteVideo:', error);
      toast({
        title: "Error deleting video",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRepost = async (videoId: string) => {
    // For now, just show a toast - you can implement repost logic later
    toast({
      title: "Repost feature",
      description: "Repost functionality coming soon!",
    });
  };

  const handleShare = async (video: VideoPost) => {
    try {
      if (navigator.share) {
        // Use native share API if available
        await navigator.share({
          title: video.title,
          text: video.description,
          url: video.videoUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(video.videoUrl);
        toast({
          title: "Link copied!",
          description: "Video link has been copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share this video. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Intersection observer to handle video playback based on visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0');
          const video = videoRefs.current[videoIndex];
          
          if (entry.isIntersecting) {
            // Video is in view - play it and pause others
            setCurrentVideoIndex(videoIndex);
            videoRefs.current.forEach((vid, idx) => {
              if (vid) {
                if (idx === videoIndex) {
                  vid.play().catch(error => {
                    console.error(`Error playing video ${idx}:`, error);
                  });
                } else {
                  vid.pause();
                }
              }
            });
          } else if (video) {
            // Video is out of view - pause it
            video.pause();
          }
        });
      },
      {
        threshold: 0.5, // Video needs to be 50% visible to start playing
        rootMargin: '0px'
      }
    );

    // Observe all video containers
    const videoContainers = document.querySelectorAll('[data-video-index]');
    videoContainers.forEach(container => observer.observe(container));

    return () => {
      videoContainers.forEach(container => observer.unobserve(container));
    };
  }, [videos]);

  const togglePlayPause = () => {
    const currentVideo = videoRefs.current[currentVideoIndex];
    if (currentVideo) {
      if (currentVideo.paused) {
        currentVideo.play().catch(error => {
          console.error(`Error playing current video:`, error);
        });
        setIsPlaying(true);
      } else {
        currentVideo.pause();
        setIsPlaying(false);
      }
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getCategoryColor = (category: VideoPost['category']) => {
    switch (category) {
      case "memory": return "bg-purple-500";
      case "user-content": return "bg-blue-500";
      case "ad": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryText = (category: VideoPost['category']) => {
    switch (category) {
      case "memory": return "Memory";
      case "user-content": return "Content";
      case "ad": return "Sponsored";
      default: return "Video";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Video Feed Container */}
      <div
        ref={containerRef}
        className="max-w-md mx-auto space-y-6 overflow-y-auto"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            data-video-index={index}
            className="relative w-full max-w-md mx-auto bg-card rounded-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: '9/16', maxHeight: '600px' }}
          >
            {/* Video Background */}
            {video.videoUrl ? (
              <div className="relative w-full h-full">
                <video
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full object-cover rounded-xl"
                  autoPlay={index === currentVideoIndex}
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                >
                  <source src={video.videoUrl} type="video/mp4" />
                </video>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 rounded-xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-muted-foreground text-6xl font-bold">
                    {index + 1}
                  </div>
                </div>
              </div>
            )}

            {/* Video Overlay */}
            <div className="absolute inset-0 bg-black/10 rounded-xl" />

            {/* Content Overlay - Bottom Left Corner */}
            <div className="absolute bottom-4 left-4">
              <div className="flex flex-col">
                {/* Profile Picture and Username - Top */}
                <div className="flex items-center mb-2">
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarImage 
                      src={video.profilePhotoUrl || undefined} 
                      className="object-cover w-full h-full"
                    />
                    <AvatarFallback className="bg-white/20">
                      <User className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => {
                      setSelectedUserId(video.userId);
                      setSelectedUsername(video.username);
                    }}
                    className="text-white font-semibold hover:text-white/80 transition-colors"
                  >
                    {video.username}
                  </button>
                </div>
                
                {/* Caption/Title - Middle */}
                <h3 className="text-white text-base font-bold mb-2 leading-tight max-w-xs">
                  {video.title}
                </h3>
                
                {/* Description - Bottom */}
                <p className="text-white/90 text-sm leading-relaxed max-w-xs">
                  {video.description}
                </p>
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="absolute bottom-0 right-4 pb-24">
              <div className="flex flex-col items-center space-y-6">
                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(video.id)}
                  className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                >
                  <Heart
                    className={cn(
                      "w-7 h-7 mb-1",
                      video.isLiked ? "text-red-500 fill-red-500" : "text-white"
                    )}
                  />
                  <span className="text-white text-xs font-medium">
                    {formatCount(video.likes)}
                  </span>
                </Button>

                {/* Comment Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommentsOpen(video.id)}
                  className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                >
                  <MessageCircle className="w-7 h-7 text-white mb-1" />
                  <span className="text-white text-xs font-medium">
                    {formatCount(video.comments)}
                  </span>
                </Button>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShare(video)}
                  className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                >
                  <Share className="w-7 h-7 text-white mb-1" />
                  <span className="text-white text-xs font-medium">
                    {formatCount(video.shares)}
                  </span>
                </Button>

                {/* Repost Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRepost(video.id)}
                  className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                >
                  <Repeat2 className="w-7 h-7 text-white mb-1" />
                  <span className="text-white text-xs font-medium">
                    Repost
                  </span>
                </Button>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                    >
                      <MoreHorizontal className="w-7 h-7 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border border-border">
                    <DropdownMenuItem
                      onClick={() => handleShare(video)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.open(video.videoUrl, '_blank')}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </DropdownMenuItem>
                    {user && video.userId === user.id && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteVideo(video.id)}
                        className="text-destructive flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Video
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Video Controls */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Video Upload Button */}
      <VideoUpload onVideoUploaded={fetchVideos} />

      {/* Comments Modal */}
      {commentsOpen && (
        <VideoComments
          videoId={commentsOpen}
          isOpen={!!commentsOpen}
          onClose={() => setCommentsOpen(null)}
        />
      )}

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          username={selectedUsername}
          isOpen={!!selectedUserId}
          onClose={() => {
            setSelectedUserId(null);
            setSelectedUsername('');
          }}
        />
      )}

      {/* Custom CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default VideoFeed;