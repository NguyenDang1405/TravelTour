import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import TripDetailsMobile from './[id].mobile';
import TripDetailsWeb from './[id].web';

export default function TripDetailsIndexScreen() {
  const params = useLocalSearchParams<{ 
    id?: string | string[]; 
    _id?: string | string[];
    tripId?: string | string[];
  }>();
  
  // Helper to extract string from param (handles both string and array)
  const getParamValue = (value: string | string[] | undefined): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value[0] || '';
    return String(value);
  };
  
  // Extract trip ID from query params
  const tripId = React.useMemo((): string => {
    // Try all possible param names
    const paramId = getParamValue(params.id);
    const paramIdUnderscore = getParamValue(params._id);
    const paramTripId = getParamValue(params.tripId);
    
    // PRIORITY 1: Check query params from useLocalSearchParams
    if (paramId && paramId.length >= 10) {
      console.log('✅ TripDetailsIndex - Found ID from params.id:', paramId);
      return paramId;
    }
    
    if (paramTripId && paramTripId.length >= 10) {
      console.log('✅ TripDetailsIndex - Found ID from params.tripId:', paramTripId);
      return paramTripId;
    }
    
    if (paramIdUnderscore && paramIdUnderscore.length >= 10) {
      console.log('✅ TripDetailsIndex - Found ID from params._id:', paramIdUnderscore);
      return paramIdUnderscore;
    }
    
    // PRIORITY 2: On web, try window.location.search (most reliable)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const idFromQuery = urlParams.get('id') || urlParams.get('_id') || urlParams.get('tripId');
        if (idFromQuery && idFromQuery.length >= 10) {
          console.log('✅ TripDetailsIndex - Found ID from window.location.search:', idFromQuery);
          return idFromQuery;
        }
      } catch (error) {
        console.error('Error extracting from query params:', error);
      }
    }
    
    // Debug: log what we have
    console.log('❌ TripDetailsIndex - Could not extract tripId:', {
      params,
      paramId,
      paramIdUnderscore,
      paramTripId,
      windowSearch: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : 'N/A',
    });
    
    return '';
  }, [params.id, params._id, params.tripId]);
  
  // Ensure tripId is always a string (never undefined)
  const safeTripId = tripId || '';
  
  console.log('🎬 TripDetailsIndex - Rendering with tripId:', safeTripId, 'isValid:', safeTripId && safeTripId.length >= 10);
  
  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <TripDetailsWeb tripId={safeTripId} />;
  }

  return <TripDetailsMobile tripId={safeTripId} />;
}

