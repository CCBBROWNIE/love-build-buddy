import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EmailVerificationProps {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}

const EmailVerification = ({ email, onBack, onVerified }: EmailVerificationProps) => {
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Countdown timer for resend button
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newCode.every(digit => digit !== "") && newCode.join("").length === 6) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsVerifying(true);
    
    const { error } = await verifyEmail(email, verificationCode);
    
    
    setIsVerifying(false);
    
    if (!error) {
      onVerified();
    } else {
      // Reset code on failure
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    
    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store new verification code
    await supabase
      .from('email_verifications')
      .insert({
        email: email,
        code: verificationCode
      });

    // Send new verification email
    await supabase.functions.invoke('send-verification', {
      body: {
        email: email,
        code: verificationCode
      }
    });
    
    console.log("Resent verification code to:", email);
  };

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
          <p className="text-muted-foreground">Verify your email</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <Mail className="w-12 h-12 text-spark mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Check your email</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We've sent a 6-digit verification code to
            </p>
            <p className="font-medium text-foreground">{email}</p>
          </div>

          <div>
            <Label className="text-center block mb-3">Enter verification code</Label>
            <div className="flex justify-center space-x-2 mb-4">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold border-2 border-black focus:border-spark focus:ring-spark"
                  disabled={isVerifying}
                />
              ))}
            </div>
          </div>

          {isVerifying && (
            <div className="flex items-center justify-center text-spark">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="text-sm">Verifying...</span>
            </div>
          )}

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={!canResend}
              className="text-spark hover:text-spark/80"
            >
              {canResend ? "Resend code" : `Resend in ${countdown}s`}
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to signup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;