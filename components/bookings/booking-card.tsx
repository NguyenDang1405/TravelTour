import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Booking {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  paymentMethod?: string;
  bookingDate?: string;
  tripId?: string;
  image?: string;
}

interface BookingCardProps {
  booking: Booking;
  onPress?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
  onViewDetails?: (booking: Booking) => void;
}

const getTypeIcon = (type: Booking['type']) => {
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

const getStatusColor = (status: Booking['status']) => {
  switch (status) {
    case 'pending':
      return COLORS.warning;
    case 'confirmed':
      return COLORS.primary;
    case 'cancelled':
      return '#FF6B6B';
    case 'completed':
      return COLORS.textSecondary;
    default:
      return COLORS.textSecondary;
  }
};

const getStatusText = (status: Booking['status']) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'cancelled':
      return 'Đã hủy';
    case 'completed':
      return 'Đã hoàn thành';
    default:
      return status;
  }
};

export default function BookingCard({
  booking,
  onPress,
  onCancel,
  onDelete,
  onViewDetails,
}: BookingCardProps) {
  const router = useRouter();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handlePress = () => {
    if (onPress) {
      onPress(booking);
    } else if (onViewDetails) {
      onViewDetails(booking);
    } else {
      router.push(`/item-details?id=${booking.id}&type=${booking.type}`);
    }
  };

  const statusColor = getStatusColor(booking.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {booking.image ? (
          <Image source={{ uri: booking.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>
              {getTypeIcon(booking.type)}
            </Text>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText(booking.status)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.typeIcon}>{getTypeIcon(booking.type)}</Text>
            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={2}>
                {booking.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.location} numberOfLines={1}>
                  {booking.location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {(booking.checkIn || booking.checkOut) && (
          <View style={styles.datesRow}>
            {booking.checkIn && (
              <View style={styles.dateItem}>
                <Ionicons name="log-in-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>Check-in: {booking.checkIn}</Text>
              </View>
            )}
            {booking.checkOut && (
              <View style={styles.dateItem}>
                <Ionicons name="log-out-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>Check-out: {booking.checkOut}</Text>
              </View>
            )}
          </View>
        )}

        {booking.guests && (
          <View style={styles.guestsRow}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.guestsText}>{booking.guests} khách</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>{formatPrice(booking.price)}</Text>
            {booking.paymentMethod && (
              <Text style={styles.paymentMethod}>{booking.paymentMethod}</Text>
            )}
            {booking.bookingDate && (
              <Text style={styles.bookingDate}>
                Đặt ngày: {new Date(booking.bookingDate).toLocaleDateString('vi-VN')}
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(booking);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            )}
            {booking.status === 'confirmed' && onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCancel(booking);
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FF6B6B" />
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            )}
            {onViewDetails && (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onViewDetails(booking);
                }}
              >
                <Text style={styles.detailsText}>Chi tiết</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {booking.tripId && (
          <TouchableOpacity
            style={styles.tripLink}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/trip/${booking.tripId}`);
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={styles.tripLinkText}>Xem chuyến đi</Text>
          </TouchableOpacity>
        )}
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
    height: 160,
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
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  guestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B' + '10',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  tripLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  tripLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
});

