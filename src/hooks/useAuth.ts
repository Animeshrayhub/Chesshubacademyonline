'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getDashboardRoute } from '@/lib/auth';
import type { LoginFormValues, LoginFormErrors, UseAuthReturn } from '@/types/auth';

function validateForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return errors;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const handleSignIn = async (values: LoginFormValues) => {
    // Client-side validation first
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await signIn(values.email.trim(), values.password);

      if (!result.success || !result.user) {
        setErrors({ general: result.error ?? 'Invalid email or password. Please try again.' });
        return;
      }

      // Navigate to role-specific dashboard instantly
      const destination = await getDashboardRoute(result.user.role);
      window.location.href = destination;
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      setLoading(false);
    }
  };

  return { loading, errors, handleSignIn };
}
