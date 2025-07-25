import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Upload, Shield, Check } from 'lucide-react';
import CameraModal from './CameraModal';

interface VerificationSelfieProps {
  onSelfieUploaded: (url: string) => void;
  currentSelfieUrl?: string;
  onVerificationComplete?: () => void;
}

export function VerificationSelfie({ onSelfieUploaded, currentSelfieUrl, onVerificationComplete }: VerificationSelfieProps) {
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSelfieUrl || null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/verification-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-selfies')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-selfies')
        .getPublicUrl(fileName);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ verification_selfie_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      onSelfieUploaded(publicUrl);
      toast({
        title: "Verification photo uploaded!",
        description: "Your verification selfie has been uploaded successfully.",
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload verification photo. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl(currentSelfieUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleCameraCapture = async (file: File) => {
    await handleFileUpload(file);
  };

  const handleVerifyIdentity = async () => {
    if (!user) return;

    setVerifying(true);

    try {
      // Get user's profile to check if both images exist
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('profile_photo_url, verification_selfie_url')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile.profile_photo_url || !profile.verification_selfie_url) {
        toast({
          title: "Missing photos",
          description: "Please upload both a profile photo and verification selfie first.",
          variant: "destructive",
        });
        return;
      }

      console.log('Starting verification for user:', user.id);
      
      // Call our face verification edge function
      console.log('Calling face-verification function...');
      
      try {
        const { data, error } = await supabase.functions.invoke('face-verification', {
          body: { userId: user.id }
        });
        
        console.log('Face verification response data:', data);
        console.log('Face verification response error:', error);
        
        if (error) {
          console.error('Supabase function error:', error);
          toast({
            title: "Function Error",
            description: `Error: ${error.message || 'Unknown error'}`,
            variant: "destructive",
          });
          return;
        }
        
        if (data && data.verified) {
          toast({
            title: "Identity Verified!",
            description: data.reasoning || "Verification successful!",
          });
          onVerificationComplete();
          return;
        } else {
          toast({
            title: "Verification Failed",
            description: data?.reasoning || "Verification failed for unknown reason.",
            variant: "destructive",
          });
          return;
        }
      } catch (networkError) {
        console.error('Network/other error:', networkError);
        toast({
          title: "Connection Error",
          description: `Network error: ${networkError.message}`,
          variant: "destructive",
        });
        return;
      }

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify identity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Shield className="w-5 h-5" />
          Identity Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Selfie Preview */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Verification selfie" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
            {currentSelfieUrl && (
              <div className="absolute top-0 right-0 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-success-foreground" />
              </div>
            )}
          </div>

          {/* Take Selfie Button */}
          <Button
            onClick={() => setShowCameraModal(true)}
            disabled={uploading}
            variant="default"
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Take Verification Selfie'}
          </Button>

          {/* Verify Button */}
          {currentSelfieUrl && (
            <Button
              onClick={handleVerifyIdentity}
              disabled={verifying}
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              {verifying ? 'Verifying...' : 'Verify Identity'}
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>Take a clear selfie for identity verification.</p>
            <p className="text-xs">This helps ensure profile authenticity and safety.</p>
          </div>
        </div>
      </CardContent>
      
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />
    </Card>
  );
}