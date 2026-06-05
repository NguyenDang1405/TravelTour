import { COLORS } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PriceBreakdownProps {
  basePrice: number;
  currency?: string;
  taxes?: number;
  fees?: number;
  discount?: number;
  totalPrice?: number;
  period?: string; // "per night", "per person", etc.
}

export default function PriceBreakdown({
  basePrice,
  currency = 'VND',
  taxes = 0,
  fees = 0,
  discount = 0,
  totalPrice,
  period,
}: PriceBreakdownProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const calculatedTotal = totalPrice || basePrice + taxes + fees - discount;

  return (
    <View style={styles.container}>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Giá cơ bản</Text>
        <Text style={styles.priceValue}>{formatPrice(basePrice)}</Text>
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
          <Text style={[styles.priceValue, styles.discountValue]}>-{formatPrice(discount)}</Text>
        </View>
      )}
      <View style={[styles.priceRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Tổng cộng</Text>
        <View style={styles.totalContainer}>
          <Text style={styles.totalValue}>{formatPrice(calculatedTotal)}</Text>
          {period && <Text style={styles.periodText}>{period}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

