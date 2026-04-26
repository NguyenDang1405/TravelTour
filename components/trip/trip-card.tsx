import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Trip } from '@/store/useTripStore';

interface TripCardProps {
  trip: Trip;
  onPress?: (trip: Trip) => void;
  onEdit?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
}

const getStatusColor = (status: Trip['status']) => {
  switch (status) {
    case 'planning':
      return COLORS.warning;
    case 'confirmed':
      return COLORS.primary;
    case 'ongoing':
      return COLORS.success;
    case 'completed':
      return COLORS.textSecondary;
    case 'cancelled':
      return '#FF6B6B';
    default:
      return COLORS.textSecondary;
  }
};

const getStatusText = (status: Trip['status']) => {
  switch (status) {
    case 'planning':
      return 'Đang lên kế hoạch';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'ongoing':
      return 'Đang diễn ra';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

export default function TripCard({ trip, onPress, onEdit, onDelete }: TripCardProps) {
  const router = useRouter();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysCount = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePress = () => {
    if (onPress) {
      onPress(trip);
    } else {
      // Ensure trip._id is a string
      const tripId = String(trip._id || '');
      console.log('🔍 TripCard - Navigating to trip:', {
        tripId,
        tripIdType: typeof tripId,
        tripIdLength: tripId.length,
        trip: { _id: trip._id, title: trip.title },
      });
      
      if (!tripId || tripId.length < 10) {
        console.error('❌ TripCard - Invalid trip ID:', tripId);
        return;
      }
      
      // Use query params instead of dynamic route (more reliable)
      router.push(`/trip?id=${encodeURIComponent(tripId)}`);
    }
  };

  const statusColor = getStatusColor(trip.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
          }}
          style={styles.image}
        />
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText(trip.status)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {trip.title}
          </Text>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit(trip);
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
                  onDelete(trip);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.destination} numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.date}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>
          <Text style={styles.days}>({getDaysCount()} ngày)</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.budgetRow}>
            <Ionicons name="wallet-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.budget}>{formatPrice(trip.budget)}</Text>
          </View>
          {trip.participants && trip.participants.length > 0 && (
            <View style={styles.participantsRow}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.participants}>{trip.participants.length} người</Text>
            </View>
          )}
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destination: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  days: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budget: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participants: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

