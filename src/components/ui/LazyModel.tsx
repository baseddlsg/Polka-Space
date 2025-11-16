import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { preloadModel, getCachedModelUrl } from '@/services/cacheService';
import { cn } from '@/lib/utils';

interface LazyModelProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  autoRotate?: boolean;
  enableControls?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  placeholder?: React.ReactNode;
  intersectionThreshold?: number;
}

/**
 * 3D Model component that loads when visible
 */
function Model({ 
  src, 
  onLoad, 
  onError 
}: { 
  src: string; 
  onLoad?: () => void; 
  onError?: (error: Error) => void; 
}) {
  const { scene } = useGLTF(getCachedModelUrl(src));
  
  useEffect(() => {
    if (scene && onLoad) {
      onLoad();
    }
  }, [scene, onLoad]);

  return <primitive object={scene} />;
}

/**
 * Loading placeholder component
 */
function ModelPlaceholder({ width, height }: { width: number; height: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-muted rounded-lg"
      style={{ width, height }}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Error placeholder component
 */
function ModelError({ 
  width, 
  height, 
  error 
}: { 
  width: number; 
  height: number; 
  error: string; 
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-muted rounded-lg text-muted-foreground"
      style={{ width, height }}
    >
      <div className="text-2xl mb-2">⚠️</div>
      <div className="text-sm text-center px-2">
        Failed to load 3D model
        <br />
        <span className="text-xs">{error}</span>
      </div>
    </div>
  );
}

/**
 * Lazy loading 3D model component with intersection observer
 */
export function LazyModel({
  src,
  alt = "3D Model",
  className,
  width = 300,
  height = 300,
  autoRotate = false,
  enableControls = true,
  onLoad,
  onError,
  placeholder,
  intersectionThreshold = 0.1
}: LazyModelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Intersection Observer for lazy loading
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: intersectionThreshold,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [intersectionThreshold]);

  /**
   * Preload model when visible
   */
  useEffect(() => {
    if (isVisible && !isLoading && !isLoaded && !error) {
      setIsLoading(true);
      
      preloadModel(src)
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          setIsLoading(false);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        });
    }
  }, [isVisible, isLoading, isLoaded, error, src, onError]);

  /**
   * Handle model load success
   */
  const handleModelLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  /**
   * Handle model load error
   */
  const handleModelError = (err: Error) => {
    setError(err.message);
    onError?.(err);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width, height }}
    >
      {!isVisible && (
        placeholder || <ModelPlaceholder width={width} height={height} />
      )}

      {isVisible && isLoading && (
        <ModelPlaceholder width={width} height={height} />
      )}

      {isVisible && error && (
        <ModelError width={width} height={height} error={error} />
      )}

      {isVisible && isLoaded && !error && (
        <Canvas
          style={{ width, height }}
          camera={{ position: [0, 0 
     )}
    </div>
  );
}

// Preload useGLTF for better performance
useGLTF.preload = (url: string) => {
  preloadModel(url);
};

export default LazyModel;