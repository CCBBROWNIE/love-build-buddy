import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerificationRequest = await req.json();

    console.log(`Sending verification email to ${email} with code ${code}`);

    const emailResponse = await resend.emails.send({
      from: "MeetCute <onboarding@resend.dev>",
      to: [email],
      subject: "Your MeetCute Verification Code",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0;">MeetCute</h1>
            <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Real Connections in Real Life</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; margin: 0 0 16px 0; font-size: 24px;">Verification Code</h2>
            <div style="background: white; color: #1f2937; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 4px; font-family: monospace;">
              ${code}
            </div>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
              Enter this 6-digit code in the app to verify your email address.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This code will expire in 10 minutes.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            If you didn't request this verification code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);