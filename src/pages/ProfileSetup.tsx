import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { VerificationSelfie } from '@/components/VerificationSelfie';
import { CheckCircle, User, Shield } from 'lucide-react';

export default function ProfileSetup() {
  const [firstName, setFirstName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [verificationSelfieUrl, setVerificationSelfieUrl] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load existing profile data
    const loadProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || '');
        setProfilePhotoUrl(profile.profile_photo_url || '');
        setVerificationSelfieUrl(profile.verification_selfie_url || '');
        setIsVerified(profile.is_verified || false);

        // Determine current step based on completed data
        if (profile.is_verified) {
          setStep(4); // Completed
        } else if (profile.verification_selfie_url) {
          setStep(3); // Ready to verify
        } else if (profile.profile_photo_url && profile.first_name) {
          setStep(3); // Upload verification selfie
        } else if (profile.first_name) {
          setStep(2); // Upload profile photo
        }
      }
    };

    loadProfile();
  }, [user, navigate]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: firstName.trim(),
          last_name: '', // Required field, can be updated later
          email: user.email || '',
          birthday: '1990-01-01' // Default birthday, can be updated later
        });

      if (error) throw error;

      toast({
        title: "Name saved!",
        description: "Let's add your profile photo.",
      });

      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoUploaded = (url: string) => {
    setProfilePhotoUrl(url);
    setStep(3);
  };

  const handleVerificationSelfieUploaded = (url: string) => {
    setVerificationSelfieUrl(url);
  };

  const handleVerificationComplete = () => {
    setIsVerified(true);
    setStep(4);
  };

  const handleFinish = () => {
    navigate('/feed');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <User className="w-4 h-4" />
          </div>
          <div className={`h-px w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            📷
          </div>
          <div className={`h-px w-12 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Shield className="w-4 h-4" />
          </div>
          <div className={`h-px w-12 ${step >= 4 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 4 ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">What's your first name?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading || !firstName.trim()} className="w-full">
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile Photo */}
        {step === 2 && (
          <ProfilePhotoUpload
            onPhotoUploaded={handleProfilePhotoUploaded}
            currentPhotoUrl={profilePhotoUrl}
          />
        )}

        {/* Step 3: Verification Selfie */}
        {step === 3 && (
          <VerificationSelfie
            onSelfieUploaded={handleVerificationSelfieUploaded}
            currentSelfieUrl={verificationSelfieUrl}
            onVerificationComplete={handleVerificationComplete}
          />
        )}

        {/* Step 4: Completed */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-success" />
                Profile Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-success">
                  {profilePhotoUrl && (
                    <img 
                      src={profilePhotoUrl} 
                      alt={firstName} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold">Welcome, {firstName}!</h3>
                <p className="text-muted-foreground mt-2">
                  Your profile has been set up and {isVerified ? 'verified' : 'is pending verification'}.
                </p>
              </div>

              <Button onClick={handleFinish} className="w-full">
                Start Using the App
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}