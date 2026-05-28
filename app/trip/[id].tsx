import { useLocalSearchParams, usePathname, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import TripDetailsMobile from './[id].mobile';
import TripDetailsWeb from './[id].web';

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; _id?: string | string[] }>();
  const segments = useSegments();
  const pathname = usePathname();
  const [windowPath, setWindowPath] = React.useState<string>('');
  
  // Track window.location.pathname changes (for web)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setWindowPath(window.location.pathname);
      
      // Also listen for popstate events (back/forward navigation)
      const handlePopState = () => {
        setWindowPath(window.location.pathname);
      };
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);
  
  // Update windowPath when pathname changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setWindowPath(window.location.pathname);
    }
  }, [pathname]);
  
  // Debug: Log raw params immediately
  useEffect(() => {
    console.log('🔍 TripDetailsScreen - Raw params:', {
      params,
      paramsId: params.id,
      paramsIdType: typeof params.id,
      paramsIdUnderscore: params._id,
      pathname,
      segments,
      windowPath: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      windowHref: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'N/A',
      windowSearch: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : 'N/A',
    });
  }, [params, pathname, segments, windowPath]);
  
  // Helper to extract string from param (handles both string and array)
  const getParamValue = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value);
  };
  
  // Extract trip ID using useMemo to ensure it's stable
  // PRIORITY: Query params first (most reliable), then dynamic route, then other methods
  const tripId = useMemo((): string => {
    // PRIORITY 1: On web, try window.location.search FIRST (most reliable for query params)
    // This is the most reliable way to get query params on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const idFromQuery = urlParams.get('id') || urlParams.get('_id') || urlParams.get('tripId');
        if (idFromQuery && idFromQuery.length >= 10) {
          console.log('✅ Found ID from window.location.search (query params):', idFromQuery);
          return idFromQuery;
        }
        // Debug: log what we found
        console.log('🔍 window.location.search:', window.location.search, 'idFromQuery:', idFromQuery);
      } catch (error) {
        console.error('Error extracting from query params:', error);
      }
    }
    
    // Extract both id and _id from params (useLocalSearchParams)
    const paramId = getParamValue(params.id);
    const paramIdUnderscore = getParamValue(params._id);
    
    // PRIORITY 2: Check query params from useLocalSearchParams
    // This works for both web and mobile
    if (paramId && paramId.length >= 10) {
      console.log('✅ Found ID from params.id (useLocalSearchParams):', paramId);
      return paramId;
    }
    
    if (paramIdUnderscore && paramIdUnderscore.length >= 10) {
      console.log('✅ Found ID from params._id (useLocalSearchParams):', paramIdUnderscore);
      return paramIdUnderscore;
    }
    
    // Debug: log what params we have
    console.log('🔍 useLocalSearchParams:', {
      params,
      paramId,
      paramIdUnderscore,
      paramIdLength: paramId?.length,
      paramIdUnderscoreLength: paramIdUnderscore?.length,
    });
    
    // PRIORITY 3: Try dynamic route param from pathname (for /trip/[id] format)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const fullPath = window.location.pathname;
        const pathParts = fullPath.split('/').filter(p => p);
        const tripIndex = pathParts.indexOf('trip');
        
        if (tripIndex >= 0 && tripIndex < pathParts.length - 1) {
          const candidateId = pathParts[tripIndex + 1];
          // Remove any query params or hash from the ID
          const cleanId = candidateId.split('?')[0].split('#')[0].trim();
          if (cleanId && cleanId.length >= 10 && !cleanId.includes('=')) {
            // Make sure it's not a query param key
            console.log('✅ Found ID from window.location.pathname (dynamic route):', cleanId, 'from path:', fullPath);
            return cleanId;
          }
        }
      } catch (error) {
        console.error('Error extracting from window.location:', error);
      }
    }
    
    // PRIORITY 4: Try to get from pathname (expo-router)
    if (pathname) {
      try {
        const pathParts = pathname.split('/').filter(p => p);
        const tripIndex = pathParts.indexOf('trip');
        if (tripIndex >= 0 && tripIndex < pathParts.length - 1) {
          const candidateId = pathParts[tripIndex + 1];
          const cleanId = candidateId.split('?')[0].split('#')[0].trim();
          if (cleanId && cleanId.length >= 10 && !cleanId.includes('=')) {
            console.log('✅ Found ID from pathname (dynamic route):', cleanId);
            return cleanId;
          }
        }
      } catch (error) {
        console.error('Error extracting from pathname:', error);
      }
    }
    
    // PRIORITY 5: Try to get from URL segments
    if (segments.length > 0) {
      const tripSegment = segments.find(seg => 
        seg !== 'trip' && 
        seg !== '(tabs)' && 
        !seg.startsWith('(') && 
        !seg.startsWith('[') &&
        seg.length >= 10 &&
        !seg.includes('=')
      );
      if (tripSegment) {
        console.log('✅ Found ID from segments:', tripSegment);
        return tripSegment;
      }
    }
    
    // Debug: Log all available data when extraction fails
    console.log('❌ Could not extract tripId from:', {
      params: params,
      paramsId: params.id,
      paramsIdUnderscore: params._id,
      paramIdValue: paramId,
      paramIdUnderscoreValue: paramIdUnderscore,
      pathname,
      segments,
      windowPath: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      windowHref: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'N/A',
      windowSearch: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : 'N/A',
    });
    
    return '';
  }, [params.id, params._id, pathname, segments, windowPath]);
  
  // Log final tripId before rendering
  console.log('🎬 TripDetailsScreen - Rendering with tripId:', tripId, 'isValid:', tripId && tripId.length >= 10);

  // Ensure tripId is always a string (never undefined)
  const safeTripId = tripId || '';

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <TripDetailsWeb tripId={safeTripId} />;
  }

  return <TripDetailsMobile tripId={safeTripId} />;
}



