import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BookingItem {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price: number;
  quantity?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

interface BookingSummaryProps {
  bookingId: string;
  items: BookingItem[];
  subtotal: number;
  taxes?: number;
  fees?: number;
  discount?: number;
  total: number;
  currency?: string;
  paymentMethod?: string;
  paymentId?: string;
  bookingDate?: string;
}

export default function BookingSummary({
  bookingId,
  items,
  subtotal,
  taxes = 0,
  fees = 0,
  discount = 0,
  total,
  currency = 'VND',
  paymentMethod,
  paymentId,
  bookingDate,
}: BookingSummaryProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTypeIcon = (type: BookingItem['type']) => {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Thông tin đặt chỗ</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mã đặt chỗ</Text>
        <Text style={styles.bookingId}>{bookingId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết đặt chỗ</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemIcon}>{getTypeIcon(item.type)}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemLocation}>{item.location}</Text>
                {item.checkIn && item.checkOut && (
                  <Text style={styles.itemDates}>
                    {item.checkIn} - {item.checkOut}
                  </Text>
                )}
                {item.guests && (
                  <Text style={styles.itemGuests}>{item.guests} khách</Text>
                )}
              </View>
            </View>
            <Text style={styles.itemPrice}>
              {formatPrice(item.price * (item.quantity || 1))}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tổng thanh toán</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Tạm tính</Text>
          <Text style={styles.priceValue}>{formatPrice(subtotal)}</Text>
        </View>
        {taxes > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Thuế</Text>
            <Text style={styles.priceValue}>{formatPrice(taxes)}</Text>
          </View>
        )}
        {fees > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí dịch vụ</Text>
            <Text style={styles.priceValue}>{formatPrice(fees)}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, styles.discountLabel]}>Giảm giá</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              -{formatPrice(discount)}
            </Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>
      </View>

      {paymentMethod && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <Text style={styles.paymentMethod}>{paymentMethod}</Text>
          {paymentId && (
            <Text style={styles.paymentId}>Mã giao dịch: {paymentId}</Text>
          )}
        </View>
      )}

      {bookingDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngày đặt</Text>
          <Text style={styles.bookingDate}>
            {new Date(bookingDate).toLocaleString('vi-VN')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingId: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  itemInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  itemIcon: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  itemDates: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemGuests: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  discountLabel: {
    color: COLORS.primary,
  },
  discountValue: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentId: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  bookingDate: {
    fontSize: 14,
    color: COLORS.text,
  },
});

