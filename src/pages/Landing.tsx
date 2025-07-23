import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Heart, Camera, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-meetcute-city.jpg";
import CameraModal from "@/components/CameraModal";
import EmailVerification from "@/components/EmailVerification";

const Landing = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"landing" | "signup" | "email-verification" | "identity-verification">("landing");
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthday: undefined as Date | undefined,
    email: "",
    selfiePhoto: null as File | null,
    profilePhoto: null as File | null,
  });

  const handleGetStarted = () => {
    setStep("signup");
  };

  const handleEmailSignup = () => {
    // Move to email verification step
    setStep("email-verification");
  };

  const handleEmailVerified = () => {
    // Move to identity verification (camera selfie)
    setStep("identity-verification");
  };

  const handleSignup = () => {
    // Here you'd normally save to database and proceed
    console.log("Signup completed:", formData);
    navigate("/permissions");
  };

  const handleFileUpload = (type: "selfie" | "profile", file: File) => {
    setFormData(prev => ({
      ...prev,
      [type === "selfie" ? "selfiePhoto" : "profilePhoto"]: file
    }));
  };

  if (step === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-border/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden">`
          <div className="absolute inset-0 bg-gradient-to-br from-spark/20 to-coral/20" />
          <img 
            src={heroImage} 
            alt="MeetCute Hero" 
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          
          <div className="relative z-10 container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto animate-fade-in">
              {/* Logo */}
              <div className="flex items-center justify-center mb-8">
                <Sparkles className="w-8 h-8 text-spark mr-3 animate-spark-pulse" />
                <h1 className="text-5xl font-bold">
                  <span className="text-midnight">Meet</span>
                  <span className="text-spark">Cute</span>
                </h1>
              </div>

              {/* Tagline */}
              <p className="text-2xl text-foreground/80 mb-6 font-light">
                created with real-life friction, not online pressure
              </p>
              
              <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Turn those memorable missed connections into real connections. 
                Describe a moment, and if they remember it too, we'll spark the conversation.
              </p>

              {/* CTA */}
              <Button 
                variant="spark" 
                size="lg" 
                onClick={handleGetStarted}
                className="text-lg px-8 py-6 mb-16 animate-gentle-bounce"
              >
                <Heart className="mr-2" />
                Start Your Story
              </Button>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
                  <CardContent className="pt-6 text-center">
                    <Sparkles className="w-12 h-12 text-spark mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">AI Memory Matching</h3>
                    <p className="text-muted-foreground">
                      AI compares your messages to create IRL connections.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
                  <CardContent className="pt-6 text-center">
                    <Heart className="w-12 h-12 text-coral mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Real Connections</h3>
                    <p className="text-muted-foreground">
                      Based on genuine moments, not superficial swipes
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
                  <CardContent className="pt-6 text-center">
                    <Lock className="w-12 h-12 text-midnight mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Privacy First</h3>
                    <p className="text-muted-foreground">
                      Your messages stay private until there's a mutual match
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "email-verification") {
    return (
      <EmailVerification
        email={formData.email}
        onBack={() => setStep("signup")}
        onVerified={handleEmailVerified}
      />
    );
  }

  if (step === "identity-verification") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-spark mr-2" />
              <CardTitle className="text-2xl">
                <span className="text-midnight">Meet</span>
                <span className="text-spark">Cute</span>
              </CardTitle>
            </div>
            <p className="text-muted-foreground">Identity Verification</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <Camera className="w-16 h-16 text-spark mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Verify it's really you</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Take a live selfie to confirm your identity. This helps keep MeetCute authentic and builds trust for meaningful connections.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-spark rounded-full"></div>
                  <span className="text-sm">Live photo verification</span>
                </div>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="w-2 h-2 bg-spark rounded-full"></div>
                  <span className="text-sm">Your photo stays private</span>
                </div>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="w-2 h-2 bg-spark rounded-full"></div>
                  <span className="text-sm">Used only for verification</span>
                </div>
              </div>

              <Button
                variant="spark"
                className="w-full"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Verification Selfie
              </Button>

              {formData.selfiePhoto && (
                <div className="text-center">
                  <p className="text-sm text-spark font-medium">✓ Verification photo captured</p>
                  <Button
                    variant="spark"
                    className="w-full mt-4"
                    onClick={handleSignup}
                  >
                    Complete Verification
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <CameraModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={(file) => handleFileUpload("selfie", file)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-spark mr-2" />
            <CardTitle className="text-2xl">
              <span className="text-midnight">Meet</span>
              <span className="text-spark">Cute</span>
            </CardTitle>
          </div>
          <p className="text-muted-foreground">Create your account</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday ? formData.birthday.toISOString().split('T')[0] : ""}
              onChange={(e) => {
                if (e.target.value) {
                  const date = new Date(e.target.value + 'T00:00:00');
                  setFormData(prev => ({ ...prev, birthday: date }));
                } else {
                  setFormData(prev => ({ ...prev, birthday: undefined }));
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              min="1940-01-01"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <Button 
            variant="spark" 
            className="w-full" 
            onClick={handleEmailSignup}
            disabled={!formData.firstName || !formData.lastName || !formData.birthday || !formData.email}
          >
            Continue to Verification
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We'll verify your email and identity to keep MeetCute authentic
          </p>
        </CardContent>
      </Card>

      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => handleFileUpload("selfie", file)}
      />
    </div>
  );
};

export default Landing;