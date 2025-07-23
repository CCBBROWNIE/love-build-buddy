import { useState, useEffect, useRef } from "react";
import userVideo1 from "@/assets/user-video-1.mp4";
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
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    username: "@dating_coach_mike",
    title: "3 Signs They're Actually Interested",
    description: "Stop overthinking! Here are the real signs someone wants to get to know you better. Save this for your next date! 🔥 #datingtips #datingadvice",
    videoUrl: "",
    thumbnailUrl: "",
    likes: 8900,
    comments: 543,
    shares: 167,
    isLiked: true,
    category: "dating-advice"
  },
  {
    id: "3",
    username: "@jenny_relationships",
    title: "Red flags vs Green flags in early dating",
    description: "Pay attention to these subtle signs! Your future self will thank you 🚩✅ What would you add to this list? #redflags #greenflags #datingadvice",
    videoUrl: "",
    thumbnailUrl: "",
    likes: 15600,
    comments: 1204,
    shares: 445,
    isLiked: false,
    category: "relationship-tips"
  },
  {
    id: "4",
    username: "@meetcute_official",
    title: "Real connections start with real moments",
    description: "Download MeetCute and turn your missed connections into real relationships. Available now! 💫 #MeetCute #RealConnections #sponsored",
    videoUrl: "",
    thumbnailUrl: "",
    likes: 2300,
    comments: 156,
    shares: 89,
    isLiked: false,
    category: "ad"
  }
];

const VideoFeed = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState(mockVideos);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLike = (videoId: string) => {
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { 
            ...video, 
            isLiked: !video.isLiked,
            likes: video.isLiked ? video.likes - 1 : video.likes + 1
          }
        : video
    ));
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
            video.play();
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
        currentVideo.play();
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
              <video
                ref={el => videoRefs.current[index] = el}
                className="absolute inset-0 w-full h-full object-cover"
                src={video.videoUrl}
                autoPlay={index === currentVideoIndex}
                loop
                muted={isMuted}
                playsInline
                onLoadedData={() => {
                  if (index === currentVideoIndex && videoRefs.current[index]) {
                    videoRefs.current[index]?.play();
                  }
                }}
              />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-white/10 rounded-full"
                  >
                    <MoreHorizontal className="w-7 h-7 text-white" />
                  </Button>
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