import { Platform } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, usePathname, useSegments } from 'expo-router';
import BlogDetailWeb from './[slug].web';
import BlogDetailMobile from './[slug].mobile';

export default function BlogDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[]; id?: string | string[] }>();
  const segments = useSegments();
  const pathname = usePathname();
  
  // Helper to extract string from param
  const getParamValue = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value);
  };
  
  // Extract slug immediately using useMemo (runs synchronously)
  const slug = useMemo((): string => {
    // PRIORITY 1: Extract from URL pathname (most reliable for dynamic routes on web)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(p => p);
        const blogIndex = pathParts.indexOf('blog');
        
        if (blogIndex >= 0 && pathParts[blogIndex + 1]) {
          return pathParts[blogIndex + 1];
        }
      } catch (error) {
        // Silent fail, try next method
      }
    }
    
    // PRIORITY 2: Extract from pathname (expo-router)
    if (pathname) {
      try {
        const pathParts = pathname.split('/').filter(p => p);
        const blogIndex = pathParts.indexOf('blog');
        if (blogIndex >= 0 && pathParts[blogIndex + 1]) {
          return pathParts[blogIndex + 1];
        }
      } catch (error) {
        // Silent fail, try next method
      }
    }
    
    // PRIORITY 3: Extract from params.slug
    const slugFromParams = getParamValue(params.slug);
    if (slugFromParams) return slugFromParams;
    
    // PRIORITY 4: Extract from params.id (backward compatibility)
    const idFromParams = getParamValue(params.id);
    if (idFromParams) return idFromParams;
    
    // PRIORITY 5: Extract from segments
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment !== 'blog') {
        return lastSegment;
      }
    }
    
    return '';
  }, [params, segments, pathname]);
  
  if (!slug) {
    return null;
  }
  
  if (Platform.OS === 'web') {
    return <BlogDetailWeb slug={slug} />;
  }
  
  return <BlogDetailMobile slug={slug} />;
}

