import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Activity } from './day-timeline';

interface ActivityCardProps {
  activity: Activity;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
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
    case 'activity':
      return '🎯';
    default:
      return '📍';
  }
};

export default function ActivityCard({
  activity,
  isFirst = false,
  isLast = false,
  onPress,
  onEdit,
  onDelete,
}: ActivityCardProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.timeline}>
        {!isFirst && <View style={styles.timelineLine} />}
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.typeIcon}>{getTypeIcon(activity.type)}</Text>
            <View style={styles.headerText}>
              <Text style={styles.name}>{activity.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.location}>{activity.location.name}</Text>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={styles.actionButton}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activity.image && (
          <Image source={{ uri: activity.image }} style={styles.image} />
        )}

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{activity.time}</Text>
            {activity.duration > 0 && (
              <>
                <Text style={styles.detailSeparator}>•</Text>
                <Text style={styles.detailText}>{activity.duration} phút</Text>
              </>
            )}
          </View>

          {activity.cost && activity.cost > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="wallet-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{formatPrice(activity.cost)}</Text>
            </View>
          )}

          {activity.description && (
            <Text style={styles.description} numberOfLines={2}>
              {activity.description}
            </Text>
          )}

          {activity.bookingId && (
            <View style={styles.bookingBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
              <Text style={styles.bookingText}>Đã đặt chỗ</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
  },
  timeline: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    minHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
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
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
  },
  detailSeparator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  bookingText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
});



