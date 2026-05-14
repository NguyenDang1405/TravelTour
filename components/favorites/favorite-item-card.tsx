import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FavoriteItem {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
  savedAt: string;
}

interface FavoriteItemCardProps {
  item: FavoriteItem;
  onPress?: (item: FavoriteItem) => void;
  onRemove?: (item: FavoriteItem) => void;
  onBookNow?: (item: FavoriteItem) => void;
  onAddToTrip?: (item: FavoriteItem) => void;
}

const getTypeIcon = (type: FavoriteItem['type']) => {
  switch (type) {
    case 'hotel':
      return '🏨';
    case 'flight':
      return '✈️';
    case 'attraction':
      return '🏛️';
    case 'restaurant':
      return '🍽️';
    case 'transport':
      return '🚗';
    default:
      return '📍';
  }
};

export default function FavoriteItemCard({
  item,
  onPress,
  onRemove,
  onBookNow,
  onAddToTrip,
}: FavoriteItemCardProps) {
  const router = useRouter();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      router.push(`/item-details?id=${item.id}&type=${item.type}`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>{getTypeIcon(item.type)}</Text>
          </View>
        )}
        {Platform.OS === 'web' ? (
          <View
            style={styles.removeButton}
            // @ts-ignore
            onClick={(e: any) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              onRemove?.(item);
            }}
            // @ts-ignore
            onMouseEnter={(e: any) => {
              if (e?.currentTarget) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }
            }}
            // @ts-ignore
            onMouseLeave={(e: any) => {
              if (e?.currentTarget) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = COLORS.surface;
              }
            }}
          >
            <Ionicons name="heart" size={20} color="#FF6B6B" />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              onRemove?.(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
        {item.rating !== undefined && item.rating !== 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.contentTop}>
          <View style={styles.header}>
            <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.location} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : (
            <View style={styles.descriptionPlaceholder} />
          )}
        </View>

        <View style={styles.footer}>
          {item.price !== undefined && (
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
          )}
          <View style={styles.actions}>
            {onAddToTrip && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddToTrip(item);
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {onBookNow && (
              <TouchableOpacity
                style={[styles.actionButton, styles.bookButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  onBookNow(item);
                }}
              >
                <Text style={styles.bookButtonText}>Đặt ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 400,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  contentTop: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    minHeight: 40,
  },
  descriptionPlaceholder: {
    minHeight: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

