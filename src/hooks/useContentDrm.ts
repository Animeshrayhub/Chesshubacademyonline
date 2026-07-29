'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DrmUserMetadata {
  userId: string;
  email: string;
  userName: string;
  ipAddress?: string;
  sessionHash: string;
  timestamp: string;
}

export interface UseContentDrmOptions {
  enabled?: boolean;
  user?: Partial<DrmUserMetadata>;
  onTamperDetected?: (reason: string) => void;
  onScreenshotAttempt?: () => void;
}

export function useContentDrm(options: UseContentDrmOptions = {}) {
  const { enabled = true, user, onTamperDetected, onScreenshotAttempt } = options;

  const [isTampered, setIsTampered] = useState(false);
  const [tamperCount, setTamperCount] = useState(0);
  const [screenshotAlert, setScreenshotAlert] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate fallback DRM user metadata
  const drmMetadata: DrmUserMetadata = {
    userId: user?.userId || 'USR-8942-CH',
    email: user?.email || 'student@chesshubacademy.com',
    userName: user?.userName || 'Grandmaster Student',
    ipAddress: user?.ipAddress || '192.168.1.104',
    sessionHash: user?.sessionHash || Math.random().toString(36).substring(2, 10).toUpperCase(),
    timestamp: user?.timestamp || new Date().toISOString().slice(0, 16).replace('T', ' '),
  };

  // Trigger temporary security alert on screenshot attempt
  const triggerScreenshotAlert = useCallback(() => {
    setScreenshotAlert(true);
    if (onScreenshotAttempt) onScreenshotAttempt();
    const timer = setTimeout(() => setScreenshotAlert(false), 3500);
    return () => clearTimeout(timer);
  }, [onScreenshotAttempt]);

  // Intercept keyboard shortcuts for printing & screenshots
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenshotAlert();
      }

      // Windows + Shift + S or Cmd + Shift + 4 (Mac screenshot)
      if ((e.metaKey || e.ctrlKey || e.shiftKey) && (e.key === 'S' || e.key === 's' || e.key === '4')) {
        if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
          triggerScreenshotAlert();
        }
      }

      // Ctrl + P or Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerScreenshotAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, triggerScreenshotAlert]);

  // Tamper recovery trigger
  const recoverWatermark = useCallback(() => {
    setIsTampered(false);
  }, []);

  return {
    drmMetadata,
    containerRef,
    canvasRef,
    isTampered,
    tamperCount,
    screenshotAlert,
    triggerScreenshotAlert,
    recoverWatermark,
    setIsTampered,
    setTamperCount,
  };
}
