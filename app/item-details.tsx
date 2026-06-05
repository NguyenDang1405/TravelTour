import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import ItemDetailsMobile from './item-details.mobile';
import ItemDetailsWeb from './item-details.web';

export default function ItemDetailsScreen() {
  const params = useLocalSearchParams<{ 
    id?: string; 
    type?: string; 
    itemId?: string; 
    itemType?: string;
    location?: string;
  }>();
  
  // Validate và normalize params - support both id/itemId and type/itemType
  const itemId = (params.itemId || params.id || '').trim();
  const itemType = ((params.itemType || params.type || 'hotel').trim()) as 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  const location = params.location?.trim() || undefined;

  // Debug: Log params
  console.log('ItemDetails params:', { itemId, itemType, location, params });

  // Nếu không có itemId hợp lệ, không render component
  if (!itemId) {
    console.warn('ItemDetails: Missing itemId, skipping render');
    return null;
  }

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <ItemDetailsWeb />;
  }

  return <ItemDetailsMobile />;
}

