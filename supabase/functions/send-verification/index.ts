import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
};

interface VerificationRequest {
  email: string;
  code: string;
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get client IP address from request headers
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfIP = req.headers.get('cf-connecting-ip');
  
  return cfIP || realIP || forwarded?.split(',')[0]?.trim() || 'unknown';
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Sanitize email for logging
function sanitizeEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '[INVALID_EMAIL]';
  
  const sanitizedLocal = localPart.slice(0, 2) + '*'.repeat(Math.max(0, localPart.length - 4)) + localPart.slice(-2);
  return `${sanitizedLocal}@${domain}`;
}

// Check rate limiting
async function checkRateLimit(identifier: string, actionType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_max_attempts: 5,
      p_window_minutes: 60
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return false; // Fail closed
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    return false; // Fail closed
  }
}

// Log security event
async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  ipAddress: string,
  userAgent: string | null,
  metadata: Record<string, any>,
  severity: string = 'medium'
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata,
      p_severity: severity,
      p_source: 'edge_function'
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    await logSecurityEvent(
      'invalid_method',
      null,
      clientIP,
      userAgent,
      { method: req.method },
      'medium'
    );
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  let email: string;
  let code: string;
  
  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type');
    }

    // Parse and validate request body
    const body = await req.json();
    
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    ({ email, code } = body as VerificationRequest);

    // Input validation
    if (!email || !code) {
      throw new Error('Email and code are required');
    }

    if (typeof email !== 'string' || typeof code !== 'string') {
      throw new Error('Email and code must be strings');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      await logSecurityEvent(
        'invalid_email_format',
        null,
        clientIP,
        userAgent,
        { email: sanitizeEmail(email) },
        'medium'
      );
      
      throw new Error('Invalid email format');
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      await logSecurityEvent(
        'invalid_code_format',
        null,
        clientIP,
        userAgent,
        { email: sanitizeEmail(email), codeLength: code.length },
        'medium'
      );
      
      throw new Error('Invalid verification code format');
    }

    // Check rate limiting by email
    const emailAllowed = await checkRateLimit(email, 'email_verification');
    if (!emailAllowed) {
      await logSecurityEvent(
        'rate_limit_exceeded',
        null,
        clientIP,
        userAgent,
        { email: sanitizeEmail(email), limitType: 'email' },
        'high'
      );
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "3600",
            ...corsHeaders 
          },
        }
      );
    }

    // Check rate limiting by IP
    const ipAllowed = await checkRateLimit(clientIP, 'email_verification_ip');
    if (!ipAllowed) {
      await logSecurityEvent(
        'rate_limit_exceeded',
        null,
        clientIP,
        userAgent,
        { email: sanitizeEmail(email), limitType: 'ip' },
        'high'
      );
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "3600",
            ...corsHeaders 
          },
        }
      );
    }

    console.log(`Sending verification email to ${sanitizeEmail(email)}`);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "MeetCute <hello@meetcuteapp.ai>",
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

    // Log successful email send
    await logSecurityEvent(
      'verification_email_sent',
      null,
      clientIP,
      userAgent,
      { 
        email: sanitizeEmail(email),
        messageId: emailResponse.data?.id,
        processingTime: Date.now() - startTime
      },
      'low'
    );

    console.log("Email sent successfully:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    // Log security event for errors
    await logSecurityEvent(
      'verification_email_error',
      null,
      clientIP,
      userAgent,
      { 
        email: email ? sanitizeEmail(email) : '[MISSING]',
        error: error.message,
        processingTime: Date.now() - startTime
      },
      'medium'
    );

    console.error("Error in send-verification function:", error);
    
    // Don't expose internal error details
    const isValidationError = error.message.includes('Invalid') || 
                              error.message.includes('required') ||
                              error.message.includes('format');
    
    return new Response(
      JSON.stringify({ 
        error: isValidationError ? error.message : 'Failed to send verification email'
      }),
      {
        status: isValidationError ? 400 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);