import React from 'react';
import { passwordSchema } from '@/lib/security';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    label: 'One special character',
    test: (password) => /[^a-zA-Z0-9]/.test(password),
  },
];

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className,
}) => {
  const metRequirements = requirements.filter(req => req.test(password));
  const strength = metRequirements.length;
  const isValid = passwordSchema.safeParse(password).success;

  const getStrengthColor = () => {
    if (strength < 2) return 'text-red-500';
    if (strength < 4) return 'text-yellow-500';
    if (strength === 5) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStrengthText = () => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Fair';
    if (strength === 5) return 'Strong';
    return '';
  };

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password strength:</span>
        <span className={cn('text-sm font-medium', getStrengthColor())}>
          {getStrengthText()}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1 rounded-full transition-colors',
              index <= strength
                ? strength < 2
                  ? 'bg-red-500'
                  : strength < 4
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      <div className="space-y-1">
        {requirements.map((requirement, index) => {
          const isMet = requirement.test(password);
          return (
            <div
              key={index}
              className="flex items-center gap-2 text-xs"
            >
              {isMet ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-gray-400" />
              )}
              <span className={cn(
                isMet ? 'text-green-700' : 'text-gray-500'
              )}>
                {requirement.label}
              </span>
            </div>
          );
        })}
      </div>

      {isValid && (
        <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
          <CheckCircle className="w-3 h-3" />
          Password meets all requirements
        </div>
      )}
    </div>
  );
};