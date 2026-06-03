import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ItineraryDay } from './itinerary-day-tab';

interface ItinerarySummaryProps {
  days: ItineraryDay[];
}

export default function ItinerarySummary({ days }: ItinerarySummaryProps) {
  const totalCost = useMemo(() => {
    return days.reduce((sum, day) => {
      return (
        sum +
        day.activities.reduce((daySum, activity) => {
          return daySum + (activity.cost || 0);
        }, 0)
      );
    }, 0);
  }, [days]);

  const totalActivities = useMemo(() => {
    return days.reduce((sum, day) => sum + day.activities.length, 0);
  }, [days]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const costByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    days.forEach((day) => {
      day.activities.forEach((activity) => {
        const category = activity.type;
        categories[category] = (categories[category] || 0) + (activity.cost || 0);
      });
    });
    return categories;
  }, [days]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
        <Text style={styles.headerText}>Tóm tắt</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.summaryLabel}>Số ngày</Text>
            <Text style={styles.summaryValue}>{days.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.summaryLabel}>Hoạt động</Text>
            <Text style={styles.summaryValue}>{totalActivities}</Text>
          </View>
        </View>

        {Object.keys(costByCategory).length > 0 && (
          <View style={styles.costSection}>
            <Text style={styles.costSectionTitle}>Chi phí theo danh mục</Text>
            {Object.entries(costByCategory).map(([category, cost]) => (
              <View key={category} style={styles.costRow}>
                <Text style={styles.costCategory}>{category}</Text>
                <Text style={styles.costAmount}>{formatPrice(cost)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng ước tính</Text>
          <Text style={styles.totalValue}>{formatPrice(totalCost)}</Text>
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
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  costSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  costSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  costCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  costAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

