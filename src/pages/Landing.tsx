import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Heart, Camera } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-meetcute.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"landing" | "signup">("landing");
  const [formData, setFormData] = useState({
    name: "",
    birthday: undefined as Date | undefined,
    email: "",
    selfiePhoto: null as File | null,
    profilePhoto: null as File | null,
  });

  const handleGetStarted = () => {
    setStep("signup");
  };

  const handleSignup = () => {
    // Here you'd normally save to database
    console.log("Signup data:", formData);
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
                Turn those magical missed connections into real relationships. 
                Describe a moment, and if they remember it too, we'll spark the connection.
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
                      Our AI compares your stories to find perfect matches
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
                    <Camera className="w-12 h-12 text-midnight mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Privacy First</h3>
                    <p className="text-muted-foreground">
                      Your stories stay private until there's a mutual match
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
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your first name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Birthday</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.birthday && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.birthday ? format(formData.birthday, "PPP") : "Pick your birthday"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.birthday}
                  onSelect={(date) => setFormData(prev => ({ ...prev, birthday: date }))}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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

          <div className="space-y-2">
            <Label>Verification Photo</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Take a quick selfie for identity verification
              </p>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload("selfie", file);
                }}
                className="hidden"
                id="selfie-upload"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById("selfie-upload")?.click()}
              >
                Take Selfie
              </Button>
              {formData.selfiePhoto && (
                <p className="text-xs text-spark mt-2">✓ Photo taken</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Heart className="w-8 h-8 text-coral mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload your best photo for your profile
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload("profile", file);
                }}
                className="hidden"
                id="profile-upload"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById("profile-upload")?.click()}
              >
                Choose Photo
              </Button>
              {formData.profilePhoto && (
                <p className="text-xs text-spark mt-2">✓ Photo uploaded</p>
              )}
            </div>
          </div>

          <Button 
            variant="spark" 
            className="w-full" 
            onClick={handleSignup}
            disabled={!formData.name || !formData.birthday || !formData.email || !formData.selfiePhoto || !formData.profilePhoto}
          >
            Create Account
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By signing up, you agree to help create magical connections
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Landing;