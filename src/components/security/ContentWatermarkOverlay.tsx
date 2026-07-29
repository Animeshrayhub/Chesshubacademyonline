'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { DrmUserMetadata } from '@/hooks/useContentDrm';

interface ContentWatermarkOverlayProps {
  metadata: DrmUserMetadata;
  opacity?: number;
  density?: 'compact' | 'normal' | 'dense';
  showSteganographyDots?: boolean;
  onTamperDetected?: (reason: string) => void;
  className?: string;
}

export const ContentWatermarkOverlay: React.FC<ContentWatermarkOverlayProps> = ({
  metadata,
  opacity = 0.15,
  density = 'normal',
  showSteganographyDots = true,
  onTamperDetected,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isEnforcingRef = useRef(false);

  // Render dynamic HTML5 canvas watermark
  const renderWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || canvas.parentElement?.clientWidth || 800;
    const height = rect.height || canvas.parentElement?.clientHeight || 600;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Dynamic watermark text composition
    const line1 = `ChessHub Academy DRM • ${metadata.userName} (${metadata.email})`;
    const line2 = `HASH: ${metadata.sessionHash} • IP: ${metadata.ipAddress || '127.0.0.1'} • ${metadata.timestamp}`;

    const fontSpacing = density === 'compact' ? 180 : density === 'dense' ? 120 : 220;
    const verticalGap = density === 'compact' ? 120 : density === 'dense' ? 80 : 160;

    ctx.save();
    ctx.fillStyle = `rgba(160, 174, 192, ${opacity})`;
    ctx.font = '600 13px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';

    // Rotate canvas for diagonal text effect (-25 degrees)
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.translate(-width, -height);

    const extendedWidth = width * 2.5;
    const extendedHeight = height * 2.5;

    for (let y = -extendedHeight / 2; y < extendedHeight; y += verticalGap) {
      for (let x = -extendedWidth / 2; x < extendedWidth; x += fontSpacing * 2) {
        ctx.fillText(line1, x, y);
        ctx.fillStyle = `rgba(226, 232, 240, ${opacity * 0.85})`;
        ctx.font = '400 11px monospace';
        ctx.fillText(line2, x + 20, y + 18);
        ctx.font = '600 13px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = `rgba(160, 174, 192, ${opacity})`;
      }
    }
    ctx.restore();

    // Steganographic micro-dots encoding binary User ID
    if (showSteganographyDots) {
      ctx.save();
      const userIdBytes = Array.from(metadata.userId).map((c) => c.charCodeAt(0));
      ctx.fillStyle = `rgba(255, 215, 0, ${opacity * 0.9})`; // Golden micro dots

      let dotIndex = 0;
      for (let py = 30; py < height; py += 90) {
        for (let px = 30; px < width; px += 110) {
          const charCode = userIdBytes[dotIndex % userIdBytes.length];
          const radius = (charCode % 3) + 1.2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          dotIndex++;
        }
      }
      ctx.restore();
    }
  }, [metadata, opacity, density, showSteganographyDots]);

  // Handle window resizing
  useEffect(() => {
    renderWatermark();
    const handleResize = () => renderWatermark();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderWatermark]);

  // DOM MutationObserver to catch DevTools tampering (Inspect Element deletion or style changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const enforceSecurityStyles = () => {
      if (isEnforcingRef.current) return;
      isEnforcingRef.current = true;

      // Ensure style attributes stay strictly non-tampered
      if (canvas.style.display === 'none' || canvas.style.visibility === 'hidden' || Number(canvas.style.opacity) < opacity * 0.5) {
        canvas.style.setProperty('display', 'block', 'important');
        canvas.style.setProperty('visibility', 'visible', 'important');
        canvas.style.setProperty('opacity', '1', 'important');
        canvas.style.setProperty('pointer-events', 'none', 'important');
        if (onTamperDetected) onTamperDetected('DevTools CSS style modification detected');
      }

      isEnforcingRef.current = false;
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Node removed attempt
        if (mutation.type === 'childList') {
          const removedNodes = Array.from(mutation.removedNodes);
          const wasCanvasRemoved = removedNodes.some((node) => node === canvas);
          if (wasCanvasRemoved) {
            container.appendChild(canvas);
            renderWatermark();
            if (onTamperDetected) onTamperDetected('Watermark node deletion attempt blocked');
          }
        }
        // Attribute / style manipulation attempt
        if (mutation.type === 'attributes' && mutation.target === canvas) {
          enforceSecurityStyles();
        }
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    observer.observe(canvas, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    return () => observer.disconnect();
  }, [opacity, renderWatermark, onTamperDetected]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none select-none z-50 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none select-none"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
};
