import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
  paymentId?: string;
  bookingDate?: string;
  tripId?: string;
  description?: string;
}

interface BookingDetailsModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onCancel?: (booking: Booking) => void;
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

export default function BookingDetailsModal({
  visible,
  booking,
  onClose,
  onCancel,
  onDelete,
}: BookingDetailsModalProps) {
  const router = useRouter();

  if (!booking) return null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const statusColor = getStatusColor(booking.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chi tiết đặt chỗ</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(booking.status)}
              </Text>
            </View>

            {/* Booking Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{getTypeIcon(booking.type)}</Text>
                <Text style={styles.sectionTitle}>{booking.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>{booking.location}</Text>
              </View>
              {booking.description && (
                <Text style={styles.description}>{booking.description}</Text>
              )}
            </View>

            {/* Dates */}
            {(booking.checkIn || booking.checkOut) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Ngày</Text>
                {booking.checkIn && (
                  <View style={styles.infoRow}>
                    <Ionicons name="log-in-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>Check-in: {booking.checkIn}</Text>
                  </View>
                )}
                {booking.checkOut && (
                  <View style={styles.infoRow}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>Check-out: {booking.checkOut}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Guests */}
            {booking.guests && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Số khách</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>{booking.guests} khách</Text>
                </View>
              </View>
            )}

            {/* Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Thanh toán</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tổng tiền</Text>
                <Text style={styles.price}>{formatPrice(booking.price)}</Text>
              </View>
              {booking.paymentMethod && (
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>{booking.paymentMethod}</Text>
                </View>
              )}
              {booking.paymentId && (
                <View style={styles.infoRow}>
                  <Ionicons name="receipt-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>Mã giao dịch: {booking.paymentId}</Text>
                </View>
              )}
              {booking.bookingDate && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>
                    Đặt ngày: {new Date(booking.bookingDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              )}
            </View>

            {/* Trip Link */}
            {booking.tripId && (
              <TouchableOpacity
                style={styles.tripLink}
                onPress={() => {
                  onClose();
                  router.push(`/trip/${booking.tripId}`);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.tripLinkText}>Xem chuyến đi liên quan</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  onDelete(booking);
                  onClose();
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={styles.deleteButtonText}>Xóa đặt chỗ</Text>
              </TouchableOpacity>
            )}
            {booking.status === 'confirmed' && onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  onCancel(booking);
                  onClose();
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FF6B6B" />
                <Text style={styles.cancelButtonText}>Hủy đặt chỗ</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.closeButtonAction}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    marginTop: 8,
  },
  tripLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B' + '10',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  closeButtonAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});

