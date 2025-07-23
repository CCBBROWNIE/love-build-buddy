import { useState, useEffect } from "react";
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
import barScene from "@/assets/scene-bar.jpg";
import groceryScene from "@/assets/scene-grocery.jpg";
import campusScene from "@/assets/scene-campus.jpg";
import concertScene from "@/assets/scene-concert.jpg";
import gymScene from "@/assets/scene-gym.jpg";
import CameraModal from "@/components/CameraModal";
import EmailVerification from "@/components/EmailVerification";

const Landing = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"landing" | "signup" | "email-verification" | "identity-verification">("landing");
  const [showCamera, setShowCamera] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  
  const scenes = [
    { image: barScene, title: "At the bar" },
    { image: groceryScene, title: "Grocery shopping" },
    { image: campusScene, title: "On campus" },
    { image: concertScene, title: "At concerts" },
    { image: gymScene, title: "At the gym" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 6000); // 6 second intervals

    return () => clearInterval(interval);
  }, [scenes.length]);

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
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Cycling Background Images */}
        <div className="absolute inset-0">
          {scenes.map((scene, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSceneIndex ? 'opacity-70' : 'opacity-0'
              }`}
            >
              <img 
                src={scene.image} 
                alt={scene.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <Sparkles className="w-8 h-8 text-yellow-400 mr-3 animate-pulse" />
              <h1 className="text-6xl font-bold text-white drop-shadow-2xl">
                <span>Meet</span>
                <span className="text-yellow-400">Cute</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-2xl text-white mb-6 font-light drop-shadow-lg">
              Real connections happen everywhere
            </p>
            
            <p className="text-lg text-gray-200 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              Share your moments. When someone else remembers it too, we'll connect you.
            </p>

            {/* CTA */}
            <Button 
              className="bg-yellow-400 hover:bg-yellow-500 text-black text-lg px-8 py-6 mb-16 font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
              size="lg" 
              onClick={handleGetStarted}
            >
              <Heart className="mr-2" />
              Start Connecting
            </Button>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2 text-white">AI Memory Matching</h3>
                  <p className="text-gray-200">
                    AI compares your messages to create IRL connections.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2 text-white">Real Connections</h3>
                  <p className="text-gray-200">
                    Based on genuine moments, not superficial swipes
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <Lock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2 text-white">Privacy First</h3>
                  <p className="text-gray-200">
                    Your messages stay private until there's a mutual match
                  </p>
                </CardContent>
              </Card>
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