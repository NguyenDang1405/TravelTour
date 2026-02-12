import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Booking {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  checkIn?: string;
  checkOut?: string;
  paymentMethod?: string;
  externalId?: string;
  description?: string;
  provider?: string;
  image?: string;
}

interface BookingsListProps {
  bookings: Booking[];
  onBookingPress?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
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

export default function BookingsList({ bookings, onBookingPress, onDelete }: BookingsListProps) {
  const router = useRouter();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleBookingPress = (booking: Booking) => {
    if (onBookingPress) {
      onBookingPress(booking);
    } else {
      const params = new URLSearchParams({
        id: booking.externalId || booking.id,
        type: booking.type,
        name: booking.name || '',
        location: booking.location || '',
        price: booking.price?.toString() || '',
        description: booking.description || '',
        image: booking.image || '',
        isAi: booking.provider === 'ai' ? 'true' : 'false',
      });
      router.push(`/item-details?${params.toString()}`);
    }
  };

  if (bookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
          <Text style={styles.headerText}>Đặt chỗ</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Chưa có đặt chỗ nào</Text>
          <Text style={styles.emptySubtext}>
            Các đặt chỗ liên quan đến chuyến đi này sẽ hiển thị ở đây
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Đặt chỗ ({bookings.length})</Text>
      </View>

      <View style={styles.bookingsList}>
        {bookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={styles.bookingCard}
            onPress={() => handleBookingPress(booking)}
            activeOpacity={0.7}
          >
            <View style={styles.bookingHeader}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingIcon}>{getTypeIcon(booking.type)}</Text>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingName}>{booking.name}</Text>
                  <View style={styles.bookingLocation}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.bookingLocationText}>{booking.location}</Text>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) + '20' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(booking.status) },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(booking.status) }]}
                >
                  {getStatusText(booking.status)}
                </Text>
              </View>
            </View>

            {(booking.checkIn || booking.checkOut) && (
              <View style={styles.bookingDates}>
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

            <View style={styles.bookingFooter}>
              <Text style={styles.bookingPrice}>{formatPrice(booking.price)}</Text>
              {booking.paymentMethod && (
                <Text style={styles.paymentMethod}>{booking.paymentMethod}</Text>
              )}
            </View>
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
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  bookingIcon: {
    fontSize: 24,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  bookingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingLocationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
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
  bookingDates: {
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
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  bookingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentMethod: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});



