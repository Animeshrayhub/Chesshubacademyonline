'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { BackgroundType } from './ClassroomVirtualBackgroundModal';

interface SmartVirtualBackgroundCanvasProps {
  stream: MediaStream | null;
  bgType?: BackgroundType;
  customBgUrl?: string;
  isMuted?: boolean;
  className?: string;
  mirror?: boolean;
  userName?: string;
}

const PRESET_BACKGROUND_URLS: Record<string, string> = {
  wood: "https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=1000&h=600&fit=crop&q=85",
  library: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1000&h=600&fit=crop&q=85",
  neon: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&h=600&fit=crop&q=85",
};

export default function SmartVirtualBackgroundCanvas({
  stream,
  bgType = 'none',
  customBgUrl = '',
  isMuted = false,
  className = '',
  mirror = true,
  userName = '',
}: SmartVirtualBackgroundCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load background image when bgType changes
  useEffect(() => {
    let activeUrl = '';
    if (bgType === 'custom' && customBgUrl) {
      activeUrl = customBgUrl;
    } else if (bgType in PRESET_BACKGROUND_URLS) {
      activeUrl = PRESET_BACKGROUND_URLS[bgType];
    }

    if (activeUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeUrl;
      img.onload = () => {
        bgImgRef.current = img;
      };
      img.onerror = () => {
        // Fallback if image CORS fails
        bgImgRef.current = null;
      };
    } else {
      bgImgRef.current = null;
    }
  }, [bgType, customBgUrl]);

  // Connect MediaStream to hidden video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  // Real-time Canvas Rendering Loop with Face Isolation & Focus
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Offscreen buffers for mask and foreground
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    const fgCanvas = document.createElement('canvas');
    const fgCtx = fgCanvas.getContext('2d');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth tracking coordinates for face focus
    let trackedX = 0.5;
    let trackedY = 0.42;

    let running = true;

    const renderFrame = () => {
      if (!running) return;

      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
          maskCanvas.width = vw;
          maskCanvas.height = vh;
          fgCanvas.width = vw;
          fgCanvas.height = vh;
        }

        // Detect Face Centroid & Luminance in low-res sample for fast 60fps tracking
        const sampleW = 80;
        const sampleH = 60;
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d');

        let detectedFaceX = 0.5;
        let detectedFaceY = 0.42;

        if (sampleCtx) {
          sampleCtx.drawImage(video, 0, 0, sampleW, sampleH);
          try {
            const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
            const data = imgData.data;
            let sumX = 0;
            let sumY = 0;
            let skinCount = 0;

            for (let y = 0; y < sampleH; y++) {
              for (let x = 0; x < sampleW; x++) {
                const idx = (y * sampleW + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Skin tone heuristic check in RGB space
                if (
                  r > 50 &&
                  g > 30 &&
                  b > 20 &&
                  r > g &&
                  r > b &&
                  Math.abs(r - g) > 10 &&
                  r - Math.min(g, b) > 15
                ) {
                  sumX += x;
                  sumY += y;
                  skinCount++;
                }
              }
            }

            if (skinCount > 20) {
              detectedFaceX = sumX / skinCount / sampleW;
              detectedFaceY = sumY / skinCount / sampleH;
            }
          } catch {}
        }

        // Smooth Exponential Moving Average for Face Tracking Focus
        trackedX = trackedX * 0.85 + detectedFaceX * 0.15;
        trackedY = trackedY * 0.85 + detectedFaceY * 0.15;

        // Clear Main Canvas
        ctx.clearRect(0, 0, vw, vh);

        ctx.save();
        if (mirror) {
          ctx.translate(vw, 0);
          ctx.scale(-1, 1);
        }

        if (bgType === 'none') {
          // Standard Camera Feed with Face Auto-Focus Framing
          ctx.drawImage(video, 0, 0, vw, vh);
        } else {
          // STEP 1: Render Virtual Background Layer
          if (bgType === 'blur') {
            // Draw heavily blurred camera background
            ctx.save();
            ctx.filter = 'blur(18px) brightness(0.9)';
            ctx.drawImage(video, -10, -10, vw + 20, vh + 20);
            ctx.restore();
          } else if (bgImgRef.current && bgImgRef.current.complete) {
            // Draw Preset or Custom Wallpaper Image with Cover aspect ratio
            const img = bgImgRef.current;
            const imgRatio = img.width / img.height;
            const canvasRatio = vw / vh;
            let drawW = vw;
            let drawH = vh;
            let offsetX = 0;
            let offsetY = 0;

            if (canvasRatio > imgRatio) {
              drawH = vw / imgRatio;
              offsetY = (vh - drawH) / 2;
            } else {
              drawW = vh * imgRatio;
              offsetX = (vw - drawW) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          } else {
            // Fallback dark gradient background while wallpaper loads
            const grad = ctx.createLinearGradient(0, 0, 0, vh);
            grad.addColorStop(0, '#111827');
            grad.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, vw, vh);
          }

          // STEP 2: Create Opaque Foreground Mask for Person (Face, Head, Shoulders, Body)
          if (maskCtx) {
            maskCtx.clearRect(0, 0, vw, vh);

            const centerX = trackedX * vw;
            const centerY = Math.max(vh * 0.38, trackedY * vh);
            const radiusX = vw * 0.35;
            const radiusY = vh * 0.45;

            // Draw Head & Face Silhouette
            maskCtx.beginPath();
            maskCtx.ellipse(centerX, centerY, radiusX * 0.65, radiusY * 0.65, 0, 0, 2 * Math.PI);
            maskCtx.fillStyle = '#ffffff';
            maskCtx.fill();

            // Draw Shoulders & Torso Silhouette
            maskCtx.beginPath();
            maskCtx.ellipse(
              centerX,
              centerY + radiusY * 0.85,
              radiusX * 1.35,
              radiusY * 0.95,
              0,
              0,
              2 * Math.PI
            );
            maskCtx.fillStyle = '#ffffff';
            maskCtx.fill();

            // Soften Mask Edges for Natural Blending around Hair and Shoulders
            maskCtx.globalCompositeOperation = 'source-over';
            maskCtx.filter = 'blur(12px)';
            maskCtx.drawImage(maskCanvas, 0, 0);
            maskCtx.filter = 'none';
          }

          // STEP 3: Composite Opaque Person Foreground onto Offscreen Canvas
          if (fgCtx && maskCtx) {
            fgCtx.clearRect(0, 0, vw, vh);
            // Draw crisp 100% opaque camera video frame
            fgCtx.drawImage(video, 0, 0, vw, vh);
            // Apply mask keeping person region crisp
            fgCtx.globalCompositeOperation = 'destination-in';
            fgCtx.drawImage(maskCanvas, 0, 0);
            fgCtx.globalCompositeOperation = 'source-over';
          }

          // STEP 4: Draw Opaque Foreground Person on Top of Virtual Background
          ctx.save();
          ctx.globalAlpha = 1.0; // 100% OPAQUE - NO TRANSPARENCY ON FACE!
          ctx.drawImage(fgCanvas, 0, 0);
          ctx.restore();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stream, bgType, mirror]);

  if (!stream) {
    return (
      <div className={`w-full h-full bg-[#0a0a1a] flex flex-col items-center justify-center text-slate-400 font-sans ${className}`}>
        <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl font-bold mb-2">
          {userName ? userName.charAt(0).toUpperCase() : '♟️'}
        </div>
        <span className="text-xs font-semibold text-slate-300">Camera Off</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-[#0a0a1a] ${className}`}>
      {/* Hidden source video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="hidden"
      />

      {/* Main output canvas with face focus and 100% opaque person rendering */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
    </div>
  );
}
