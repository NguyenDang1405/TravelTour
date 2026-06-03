import { COLORS, RADIUS, SHADOWS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RecommendationCardProps {
  id: string;
  name: string;
  type: 'hotel' | 'attraction' | 'restaurant' | 'flight' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
  onPress?: () => void;
  onAddToTrip?: () => void;
  onBook?: () => void;
}

export default function RecommendationCard({
  name,
  type,
  location,
  price,
  rating,
  image,
  description,
  onPress,
  onAddToTrip,
  onBook,
}: RecommendationCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'hotel':
        return '🏨';
      case 'attraction':
        return '🏛️';
      case 'restaurant':
        return '🍽️';
      case 'flight':
        return '✈️';
      default:
        return '📍';
    }
  };

  const formatPrice = (amount?: number) => {
    if (!amount) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.touchableArea} onPress={onPress} activeOpacity={0.8}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>{getTypeIcon()}</Text>
          </View>
        )}
        
        <View style={styles.topContent}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
            {rating !== undefined && rating !== 0 && (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.location}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>

          {!!description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}

          {price ? (
            price > 0 && <Text style={styles.price}>{formatPrice(price)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={styles.bottomContent}>
        <View style={styles.actions}>
          {onPress && (
            <TouchableOpacity
              style={[styles.actionButton, styles.detailButton]}
              onPress={(e) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                onPress();
              }}
              // @ts-ignore - web only property
              onClick={(e: any) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                onPress();
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.detailButtonText}>Chi tiết</Text>
            </TouchableOpacity>
          )}

          {onAddToTrip && (
            <TouchableOpacity
              style={[styles.actionButton, styles.addButton]}
              onPress={(e) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                onAddToTrip();
              }}
              // @ts-ignore - web only property
              onClick={(e: any) => {
                e?.stopPropagation?.();
                e?.preventDefault?.();
                onAddToTrip();
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>Thêm lịch trình</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  image: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  touchableArea: {
    flex: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          transform: 'translateY(-2px)',
        },
      },
    }),
  },
  topContent: {
    padding: 12,
    paddingBottom: 0,
  },
  bottomContent: {
    padding: 12,
    paddingTop: 8,
    marginTop: 'auto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          transform: 'scale(1.05)',
        },
      },
    }),
  },
  detailButton: {
    backgroundColor: COLORS.surfaceLight,
  },
  detailButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  addButtonText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
  },
});

