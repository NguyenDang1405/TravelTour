import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AmenitiesListProps {
  amenities: string[];
  maxDisplay?: number;
}

const amenityIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'WiFi': 'wifi-outline',
  'Pool': 'water-outline',
  'Spa': 'flower-outline',
  'Gym': 'barbell-outline',
  'Restaurant': 'restaurant-outline',
  'Bar': 'wine-outline',
  'Parking': 'car-outline',
  'Air Conditioning': 'snow-outline',
  'TV': 'tv-outline',
  'Room Service': 'call-outline',
  'Beach Access': 'water-outline',
  'Free Breakfast': 'cafe-outline',
};

export default function AmenitiesList({ amenities, maxDisplay = 8 }: AmenitiesListProps) {
  const displayAmenities = amenities.slice(0, maxDisplay);
  const remainingCount = amenities.length - maxDisplay;

  const getIcon = (amenity: string) => {
    return amenityIcons[amenity] || 'checkmark-circle-outline';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tiện nghi</Text>
      <View style={styles.grid}>
        {displayAmenities.map((amenity, index) => (
          <View key={index} style={styles.amenityItem}>
            <Ionicons
              name={getIcon(amenity)}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>
      {remainingCount > 0 && (
        <Text style={styles.moreText}>+{remainingCount} tiện nghi khác</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: 120,
  },
  amenityText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: '500',
  },
});

