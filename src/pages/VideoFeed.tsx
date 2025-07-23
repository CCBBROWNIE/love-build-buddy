import { useState, useEffect, useRef } from "react";
import userVideo1 from "@/assets/user-video-1.mp4";
import userVideo2 from "@/assets/user-video-2.mp4";
import userVideo3 from "@/assets/user-video-3-new.mp4";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VideoUpload } from "@/components/VideoUpload";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoPost {
  id: string;
  username: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  category: "love-story" | "dating-advice" | "relationship-tips" | "ad";
}

// Mock video data - in real app this would come from API
const mockVideos: VideoPost[] = [
  {
    id: "1",
    username: "@user_content",
    title: "Real video content 🎥",
    description: "User-generated content about relationships and dating. This is real video content uploaded to the feed! #realcontent #dating #relationships",
    videoUrl: userVideo1,
    thumbnailUrl: "",
    likes: 1250,
    comments: 89,
    shares: 23,
    isLiked: false,
    category: "love-story"
  },
  {
    id: "2", 
    username: "@authentic_stories",
    title: "Real life moments ✨",
    description: "Capturing authentic experiences and genuine connections. This is what real life looks like! #authentic #reallife #moments #genuine",
    videoUrl: userVideo2,
    thumbnailUrl: "",
    likes: 3200,
    comments: 198,
    shares: 89,
    isLiked: false,
    category: "love-story"
  }
];

const VideoFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
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
        // Fallback to mock videos
        setVideos(mockVideos);
        return;
      }

      const formattedVideos: VideoPost[] = videosData.map(video => ({
        id: video.id,
        username: `@user_${video.id.slice(0, 8)}`,
        title: video.title,
        description: video.description || '',
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url || '',
        likes: video.likes_count || 0,
        comments: video.comments_count || 0,
        shares: video.shares_count || 0,
        isLiked: false, // We'll check this separately
        category: video.category as VideoPost['category'] || 'love-story'
      }));

      // Mix user videos with mock videos for demo
      setVideos([...formattedVideos, ...mockVideos]);
    } catch (error) {
      console.error('Error in fetchVideos:', error);
      setVideos(mockVideos);
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

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const itemHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentVideoIndex(newIndex);
      
      // Pause all videos except the current one
      videoRefs.current.forEach((video, idx) => {
        if (video) {
          if (idx === newIndex) {
            video.play().catch(error => {
              console.error(`Error playing video ${idx}:`, error);
            });
          } else {
            video.pause();
          }
        }
      });
    }
  };

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
      case "love-story": return "bg-pink-500";
      case "dating-advice": return "bg-blue-500";
      case "relationship-tips": return "bg-purple-500";
      case "ad": return "bg-yellow-500";
    }
  };

  const getCategoryText = (category: VideoPost['category']) => {
    switch (category) {
      case "love-story": return "Love Story";
      case "dating-advice": return "Dating Advice";
      case "relationship-tips": return "Tips";
      case "ad": return "Sponsored";
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video Feed Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="relative h-screen w-full snap-start flex items-center justify-center bg-gray-900"
          >
            {/* Video Background */}
            {video.videoUrl ? (
              <div>
                <video
                  ref={el => videoRefs.current[index] = el}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay={index === currentVideoIndex}
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onCanPlay={() => {
                    console.log(`✅ Video ${index} CAN PLAY`);
                  }}
                  onError={(e) => {
                    console.error(`❌ Video ${index} ERROR:`, e.currentTarget.error);
                  }}
                  onLoadStart={() => console.log(`📥 Video ${index} LOAD START`)}
                  onLoadedData={() => console.log(`✅ Video ${index} DATA LOADED`)}
                >
                  <source src={video.videoUrl} type="video/mp4" />
                </video>
                {/* Show video info for debugging */}
                <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
                  Video {index}: {video.videoUrl.split('/').pop()}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/50 text-6xl font-bold">
                    {index + 1}
                  </div>
                </div>
              </div>
            )}

            {/* Video Overlay */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24">
              <div className="flex items-end justify-between">
                {/* Left Side - Video Info */}
                <div className="flex-1 mr-4">
                  {/* Category Badge */}
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-medium text-white mb-3",
                    getCategoryColor(video.category)
                  )}>
                    {getCategoryText(video.category)}
                  </div>

                  {/* Username */}
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full mr-2 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-semibold">{video.username}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white text-lg font-bold mb-2 leading-tight">
                    {video.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/90 text-sm leading-relaxed mb-4 max-w-xs">
                    {video.description}
                  </p>
                </div>

                {/* Right Side - Actions */}
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
                    className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                  >
                    <Share className="w-7 h-7 text-white mb-1" />
                    <span className="text-white text-xs font-medium">
                      {formatCount(video.shares)}
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
                      {user && video.id && !video.id.startsWith('mock') && (
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

      {/* Scroll Indicator */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1">
        {videos.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-1 h-8 rounded-full transition-all duration-300",
              index === currentVideoIndex 
                ? "bg-white" 
                : "bg-white/30"
            )}
          />
        ))}
      </div>

      {/* Video Upload Button */}
      <VideoUpload onVideoUploaded={fetchVideos} />

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