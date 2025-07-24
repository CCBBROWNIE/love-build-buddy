import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Camera, X, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validateVideoFile, sanitizeText, videoDescriptionSchema } from '@/lib/security';

interface VideoUploadProps {
  onVideoUploaded?: () => void;
}

export function VideoUpload({ onVideoUploaded }: VideoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Enhanced file validation
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !formData.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a video",
        variant: "destructive"
      });
      return;
    }

    // Validate description if provided
    if (formData.description.trim()) {
      const descValidation = videoDescriptionSchema.safeParse(formData.description.trim());
      if (!descValidation.success) {
        toast({
          title: "Invalid description",
          description: descValidation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload video to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      // Save video metadata to database with sanitized content
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: sanitizeText(formData.title.trim()),
          description: formData.description.trim() ? sanitizeText(formData.description.trim()) : '',
          video_url: publicUrl,
          category: 'user-content'
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Video uploaded!",
        description: "Your video has been uploaded successfully and will appear in the feed"
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({ title: '', description: '' });
      setIsOpen(false);
      onVideoUploaded?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="spark" className="fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-lg z-50">
          <Upload className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Selection */}
          <div className="space-y-2">
            <Label>Select Video</Label>
            {!selectedFile ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-spark/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Click to select video</p>
                <p className="text-xs text-muted-foreground">MP4, WebM, MOV up to 100MB</p>
              </div>
            ) : (
              <div className="relative">
                <video 
                  src={previewUrl || undefined}
                  className="w-full h-32 object-cover rounded-lg"
                  controls
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 w-6 h-6 p-0"
                  onClick={clearSelection}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What's your video about?"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us more about this moment..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !formData.title.trim()}
            className="w-full"
            variant="spark"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}