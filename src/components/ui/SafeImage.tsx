'use client';

import React, { useState, useEffect } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function SafeImage({
  src,
  alt,
  className = '',
  fallbackSrc = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=500&fit=crop&q=85',
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [retryStage, setRetryStage] = useState<number>(0);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setRetryStage(0);
  }, [src, fallbackSrc]);

  const handleError = () => {
    // If it's a google drive URL that failed, try fallback Google Drive formats
    if (imgSrc.includes('lh3.googleusercontent.com/d/') && retryStage === 0) {
      const fileId = imgSrc.split('/d/')[1]?.split('?')[0];
      if (fileId) {
        setRetryStage(1);
        setImgSrc(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`);
        return;
      }
    }

    if (imgSrc.includes('drive.google.com/thumbnail') && retryStage === 1) {
      const match = imgSrc.match(/id=([^&]+)/);
      if (match && match[1]) {
        setRetryStage(2);
        setImgSrc(`https://drive.google.com/uc?export=view&id=${match[1]}`);
        return;
      }
    }

    // Final fallback
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={handleError}
    />
  );
}
