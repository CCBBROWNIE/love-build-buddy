import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, RotateCcw } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraModal = ({ isOpen, onClose, onCapture }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setError(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop any existing stream first
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      if (videoRef.current && stream) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().then(() => {
                  setIsStreaming(true);
                  resolve();
                }).catch((playError) => {
                  console.error("Error playing video:", playError);
                  setError("Failed to start camera preview");
                  resolve();
                });
              }
            };
          }
        });
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
      stopCamera();
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Flip horizontally for selfie effect
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Stop camera immediately after capture
    stopCamera();
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        onCapture(file);
        onClose(); // Close modal after successful capture
      }
    }, "image/jpeg", 0.9);
  }, [isStreaming, onCapture, stopCamera, onClose]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <Camera className="w-5 h-5 mr-2 text-spark" />
              Identity Verification
            </h3>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Take a live selfie to verify it's really you. This helps keep MeetCute authentic and builds trust for meaningful connections.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {error ? (
                <div className="flex items-center justify-center h-full text-white text-sm text-center p-4">
                  {error}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex space-x-3">
              {!isStreaming ? (
                <Button
                  variant="spark"
                  onClick={startCamera}
                  className="flex-1"
                  disabled={!!error}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {error ? "Camera Error" : "Start Camera"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={startCamera}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart
                  </Button>
                  <Button
                    variant="spark"
                    onClick={capturePhoto}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraModal;