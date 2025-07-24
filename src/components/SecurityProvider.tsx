import React, { createContext, useContext, useEffect, useState } from 'react';
import { logAuditEvent, generateNonce, validateSession } from '@/lib/security';
import { useAuth } from '@/hooks/useAuth';

interface SecurityContextType {
  nonce: string;
  reportSecurityEvent: (eventType: string, details?: Record<string, any>) => void;
  validateUserSession: () => boolean;
  isSecureConnection: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [nonce] = useState(() => generateNonce());
  const [isSecureConnection] = useState(() => 
    window.location.protocol === 'https:' || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const reportSecurityEvent = (eventType: string, details: Record<string, any> = {}) => {
    logAuditEvent(eventType, user?.id || null, {
      ...details,
      timestamp: new Date().toISOString(),
      sessionValid: validateSession(session)
    });
  };

  const validateUserSession = (): boolean => {
    return validateSession(session);
  };

  // Monitor for security-relevant events
  useEffect(() => {
    // Log security provider initialization
    reportSecurityEvent('security_provider_initialized', {
      secureConnection: isSecureConnection,
      userAgent: navigator.userAgent
    });

    // Monitor for suspicious activities
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportSecurityEvent('page_hidden', { duration: Date.now() });
      } else {
        reportSecurityEvent('page_visible', { duration: Date.now() });
      }
    };

    const handleBeforeUnload = () => {
      reportSecurityEvent('page_unload', { 
        duration: Date.now(),
        url: window.location.href 
      });
    };

    // Security event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Check for potential security issues
    const securityCheck = () => {
      // Warn if not on secure connection in production
      if (!isSecureConnection && window.location.hostname !== 'localhost') {
        console.warn('Insecure connection detected');
        reportSecurityEvent('insecure_connection_warning', {
          protocol: window.location.protocol,
          hostname: window.location.hostname
        });
      }

      // Check for developer tools (basic detection)
      const devtools = {
        open: false,
        orientation: null as string | null
      };

      const threshold = 160;
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            reportSecurityEvent('devtools_opened', {
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              outerWidth: window.outerWidth,
              outerHeight: window.outerHeight
            });
          }
        } else {
          devtools.open = false;
        }
      }, 500);
    };

    securityCheck();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSecureConnection, user?.id, session]);

  // Monitor authentication state changes
  useEffect(() => {
    if (user) {
      reportSecurityEvent('user_authenticated', {
        userId: user.id,
        email: user.email,
        loginTime: new Date().toISOString()
      });
    } else {
      reportSecurityEvent('user_logged_out', {
        logoutTime: new Date().toISOString()
      });
    }
  }, [user]);

  const contextValue: SecurityContextType = {
    nonce,
    reportSecurityEvent,
    validateUserSession,
    isSecureConnection
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// Security monitoring hook for components
export const useSecurityMonitoring = (componentName: string) => {
  const { reportSecurityEvent } = useSecurity();

  useEffect(() => {
    reportSecurityEvent('component_mounted', { componentName });
    
    return () => {
      reportSecurityEvent('component_unmounted', { componentName });
    };
  }, [componentName, reportSecurityEvent]);

  const reportError = (error: Error, context?: Record<string, any>) => {
    reportSecurityEvent('component_error', {
      componentName,
      error: error.message,
      stack: error.stack,
      ...context
    });
  };

  const reportSuspiciousActivity = (activity: string, details?: Record<string, any>) => {
    reportSecurityEvent('suspicious_activity', {
      componentName,
      activity,
      ...details
    });
  };

  return { reportError, reportSuspiciousActivity };
};