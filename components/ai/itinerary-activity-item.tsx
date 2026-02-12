import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ItineraryActivity {
  id: string;
  name: string;
  type: string;
  location: {
    name: string;
    address: string;
  };
  time: string;
  duration: number;
  cost?: number;
  description?: string;
}

interface ItineraryActivityItemProps {
  activity: ItineraryActivity;
  onEdit?: (activity: ItineraryActivity) => void;
  onRemove?: (activityId: string) => void;
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

export default function ItineraryActivityItem({
  activity,
  onEdit,
  onRemove,
}: ItineraryActivityItemProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineLine} />
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
                onPress={() => onEdit(activity)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(activity.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeline: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  typeIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
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
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text,
  },
  detailSeparator: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
});

