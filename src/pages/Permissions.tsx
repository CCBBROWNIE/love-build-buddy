import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Camera, Mic, Sparkles, ArrowRight } from "lucide-react";

const Permissions = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [permissions, setPermissions] = useState({
    location: false,
    camera: false,
    microphone: false,
  });

  const permissionSteps = [
    {
      id: "location",
      icon: MapPin,
      title: "Location Access",
      description: "Help us match you with people from the same places where your memories happened",
      detail: "We'll only use your location to improve memory matching accuracy",
      color: "text-spark",
    },
    {
      id: "camera",
      icon: Camera,
      title: "Camera Access",
      description: "Capture moments and upload photos to tell your story better",
      detail: "Take photos for verification and future AR features",
      color: "text-coral",
    },
    {
      id: "microphone",
      icon: Mic,
      title: "Microphone Access",
      description: "Record voice messages to describe your memories more naturally",
      detail: "Voice recordings make it easier to share detailed stories",
      color: "text-midnight",
    },
  ];

  const currentPermission = permissionSteps[currentStep];

  const handlePermissionResponse = async (granted: boolean) => {
    const permissionType = currentPermission.id as keyof typeof permissions;
    
    // Request actual browser permissions
    try {
      if (granted) {
        if (permissionType === "location") {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
        } else if (permissionType === "camera") {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } else if (permissionType === "microphone") {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }
    } catch (error) {
      console.log("Permission denied or not available:", error);
    }

    setPermissions(prev => ({
      ...prev,
      [permissionType]: granted,
    }));

    if (currentStep < permissionSteps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 500);
    } else {
      setTimeout(() => {
        navigate("/chat");
      }, 1000);
    }
  };

  if (currentStep >= permissionSteps.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <Sparkles className="w-16 h-16 text-spark mx-auto mb-4 animate-spark-pulse" />
            <h2 className="text-2xl font-bold mb-2">All Set!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for trusting us with your story. Let's find your connection!
            </p>
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-spark animate-gentle-bounce" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = currentPermission.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {permissionSteps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-spark scale-125"
                    : index < currentStep
                    ? "bg-coral"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="shadow-xl animate-fade-in">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-spark mr-2" />
              <CardTitle className="text-xl">
                <span className="text-midnight">Meet</span>
                <span className="text-spark">Cute</span>
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {permissionSteps.length}
            </p>
          </CardHeader>

          <CardContent className="text-center space-y-6">
            <div>
              <Icon className={`w-20 h-20 mx-auto mb-4 ${currentPermission.color}`} />
              <h2 className="text-2xl font-bold mb-3">{currentPermission.title}</h2>
              <p className="text-foreground mb-2">{currentPermission.description}</p>
              <p className="text-sm text-muted-foreground">{currentPermission.detail}</p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                variant="spark"
                className="w-full"
                onClick={() => handlePermissionResponse(true)}
              >
                Allow Access
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handlePermissionResponse(false)}
              >
                Not Now
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              You can change these permissions later in settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Permissions;