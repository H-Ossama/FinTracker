/**
 * Image Optimization Utilities
 * Provides optimized image loading, caching, and WebP support
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Asset } from 'expo-asset';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types
interface OptimizedImageProps {
  source: any;
  style?: any;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
  lazy?: boolean;
  placeholder?: any;
  fallback?: any;
  cacheKey?: string;
  [key: string]: any;
}

// Image source cache
const imageSourceCache = new Map<string, { uri: string }>();
const assetCache = new Map<number, string>();

// LRU Cache implementation for images
class LRUImageCache {
  private cache = new Map<string, { uri: string; timestamp: number }>();
  private maxSize = 100;

  set(key: string, value: { uri: string }): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { ...value, timestamp: Date.now() });
  }

  get(key: string): { uri: string } | undefined {
    const item = this.cache.get(key);
    if (item) {
      item.timestamp = Date.now();
      return { uri: item.uri };
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const lruImageCache = new LRUImageCache();

// Optimize image URI with size and format parameters
export const getOptimizedImageUri = (
  uri: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string => {
  const cacheKey = `${uri}_${JSON.stringify(options)}`;
  
  if (lruImageCache.has(cacheKey)) {
    const cached = lruImageCache.get(cacheKey);
    return cached?.uri || uri;
  }

  let optimizedUri = uri;

  // For remote images, add optimization parameters
  if (uri.startsWith('http')) {
    try {
      const url = new URL(uri);
      
      // Add size constraints
      if (options.width) {
        url.searchParams.set('w', Math.round(options.width).toString());
      }
      if (options.height) {
        url.searchParams.set('h', Math.round(options.height).toString());
      }
      
      // Add quality (1-100)
      const quality = options.quality || 80;
      url.searchParams.set('q', quality.toString());
      
      // Add format preference
      const format = options.format || 'webp';
      if (format !== 'auto') {
        url.searchParams.set('f', format);
      }
      
      // Add responsive size hints
      url.searchParams.set('fit', 'cover');
      url.searchParams.set('auto', 'format,compress');
      
      optimizedUri = url.toString();
    } catch (error) {
      console.warn('Failed to optimize image URI:', error);
    }
  }

  // Cache the result
  lruImageCache.set(cacheKey, { uri: optimizedUri });
  
  return optimizedUri;
};

// Preload and cache assets
export const preloadAssets = async (assetIds: number[]): Promise<void> => {
  try {
    const assets = await Asset.loadAsync(assetIds);
    
    assets.forEach((asset, index) => {
      if (asset.localUri) {
        assetCache.set(assetIds[index], asset.localUri);
      }
    });
  } catch (error) {
    console.warn('Failed to preload assets:', error);
  }
};

// Get cached asset URI
const getCachedAssetUri = (assetId: number): string | null => {
  return assetCache.get(assetId) || null;
};

// Optimized Image Component
export const OptimizedImage = memo<OptimizedImageProps>(({ 
  source, 
  style, 
  width, 
  height, 
  quality = 80,
  format = 'auto',
  lazy = false,
  placeholder,
  fallback,
  cacheKey,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(lazy);

  // Calculate optimal dimensions
  const optimizedDimensions = useMemo(() => {
    if (width && height) {
      return { width, height };
    }
    
    // If only one dimension provided, calculate the other maintaining aspect ratio
    if (width) {
      return { width, height: width }; // Square fallback
    }
    if (height) {
      return { width: height, height }; // Square fallback
    }
    
    // Default to reasonable sizes based on style
    const styleObj = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
    return {
      width: styleObj.width || screenWidth * 0.3,
      height: styleObj.height || screenWidth * 0.3,
    };
  }, [width, height, style]);

  // Optimize image source
  const optimizedSource = useMemo(() => {
    if (typeof source === 'number') {
      // Asset ID - check cache first
      const cachedUri = getCachedAssetUri(source);
      return cachedUri ? { uri: cachedUri } : source;
    }
    
    if (typeof source === 'object' && 'uri' in source && source.uri) {
      const key = cacheKey || source.uri;
      const optimizedUri = getOptimizedImageUri(source.uri, {
        width: optimizedDimensions.width,
        height: optimizedDimensions.height,
        quality,
        format: format === 'auto' ? (Platform.OS === 'android' ? 'webp' : 'jpg') : format,
      });
      
      return { ...source, uri: optimizedUri };
    }
    
    return source;
  }, [source, optimizedDimensions, quality, format, cacheKey]);

  // Handle lazy loading
  const handleLayout = useCallback(() => {
    if (lazy && !isLoaded) {
      setIsLoaded(true);
      setIsLoading(false);
    }
  }, [lazy, isLoaded]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Show placeholder while loading or error fallback
  if (lazy && !isLoaded) {
    return (
      <Image
        source={placeholder}
        style={[style, optimizedDimensions]}
        onLayout={handleLayout}
        {...props}
      />
    );
  }

  if (hasError && fallback) {
    return (
      <Image
        source={fallback}
        style={[style, optimizedDimensions]}
        {...props}
      />
    );
  }

  return (
    <Image
      source={optimizedSource}
      style={[style, optimizedDimensions]}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
      onError={handleError}
      {...props}
    />
  );
});

// Image preloader for better UX
export class ImagePreloader {
  private static preloadedImages = new Set<string>();
  
  static async preload(sources: (string | any)[]): Promise<void> {
    const promises = sources.map(source => {
      const uri = typeof source === 'string' ? source : 
                  (typeof source === 'object' && 'uri' in source ? source.uri : null);
      
      if (!uri || this.preloadedImages.has(uri)) {
        return Promise.resolve();
      }
      
      return new Promise<void>((resolve) => {
        Image.prefetch(uri)
          .then(() => {
            this.preloadedImages.add(uri);
            resolve();
          })
          .catch(() => {
            // Fail silently for preloading
            resolve();
          });
      });
    });
    
    await Promise.all(promises);
  }
  
  static clearCache(): void {
    this.preloadedImages.clear();
    lruImageCache.clear();
    assetCache.clear();
  }
  
  static getCacheSize(): number {
    return this.preloadedImages.size + lruImageCache.size() + assetCache.size;
  }
}

// Utility to get optimal image dimensions
export const getOptimalImageDimensions = (
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 1
): { width: number; height: number } => {
  const maxWidth = Math.min(containerWidth, screenWidth * 0.9);
  const maxHeight = Math.min(containerHeight, screenHeight * 0.6);
  
  let width = maxWidth;
  let height = width / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

export default OptimizedImage;