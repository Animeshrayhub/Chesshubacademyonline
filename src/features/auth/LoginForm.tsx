'use client';

import { useState, useEffect, useId } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { LoginFormValues } from '@/types/auth';

export default function LoginForm() {
  const { loading, errors, handleSignIn } = useAuth();
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const generalErrorId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const [countdown, setCountdown] = useState<number | null>(null);

  // 18-second auto-reload countdown timer when error occurs
  useEffect(() => {
    if (errors.general) {
      setCountdown(18);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [errors.general]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSignIn(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Sign in to your ChessHub Academy account"
    >
      {/* General error with 18-second auto-reload countdown */}
      {errors.general && (
        <div
          id={generalErrorId}
          role="alert"
          aria-live="assertive"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm space-y-2"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="flex-1">
              <span className="font-semibold">{errors.general}</span>
              {countdown !== null && (
                <div className="mt-2 flex items-center justify-between text-xs text-red-600 bg-red-100/60 p-2 rounded-lg border border-red-200">
                  <span>
                    Auto-refreshing page in <strong className="font-mono text-red-800">{countdown}s</strong> to retry credentials...
                  </span>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                  >
                    Retry Now 🔄
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email */}
      <div className="mb-5">
        <label
          htmlFor={emailId}
          className="block text-sm font-semibold text-text-primary mb-2"
        >
          Email Address
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={handleChange}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          placeholder="you@example.com"
          className={`
            w-full px-4 py-3.5 rounded-xl border bg-white text-text-primary text-base
            placeholder:text-text-secondary/50
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-colors duration-200
            ${errors.email
              ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
              : 'border-border hover:border-primary/40'
            }
          `}
        />
        {errors.email && (
          <p
            id={emailErrorId}
            role="alert"
            aria-live="polite"
            className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="mb-5">
        <label
          htmlFor={passwordId}
          className="block text-sm font-semibold text-text-primary mb-2"
        >
          Password
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={values.password}
            onChange={handleChange}
            aria-required="true"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? passwordErrorId : undefined}
            placeholder="Enter your password"
            className={`
              w-full px-4 py-3.5 pr-12 rounded-xl border bg-white text-text-primary text-base
              placeholder:text-text-secondary/50
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition-colors duration-200
              ${errors.password
                ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
                : 'border-border hover:border-primary/40'
              }
            `}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            {showPassword ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round" />
                <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id={passwordErrorId}
            role="alert"
            aria-live="polite"
            className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {errors.password}
          </p>
        )}
      </div>

      {/* Remember Me */}
      <div className="flex items-center mb-7">
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          checked={values.rememberMe}
          onChange={handleChange}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 focus:ring-offset-1 cursor-pointer"
          aria-label="Keep me signed in on this device"
        />
        <label
          htmlFor="rememberMe"
          className="ml-2.5 text-sm text-text-secondary cursor-pointer select-none"
        >
          Keep me signed in
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        aria-label={loading ? 'Signing in, please wait…' : 'Sign in to your account'}
        className="
          w-full py-4 px-6 rounded-xl font-bold text-base
          bg-primary hover:bg-primary-dark text-white
          shadow-blue hover:shadow-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
          flex items-center justify-center gap-3
        "
      >
        {loading ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : (
          <>
            Sign In
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
