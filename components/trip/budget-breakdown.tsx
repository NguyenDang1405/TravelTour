import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BudgetCategory {
  category: string;
  planned: number;
  actual: number;
  icon: string;
}

interface BudgetBreakdownProps {
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
  currency?: string;
}

export default function BudgetBreakdown({
  totalBudget,
  totalSpent,
  categories,
  currency = 'VND',
}: BudgetBreakdownProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const remaining = totalBudget - totalSpent;
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = totalSpent > totalBudget;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Ngân sách</Text>
      </View>

      {/* Total Budget Overview */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng ngân sách</Text>
          <Text style={styles.totalValue}>{formatPrice(totalBudget)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Đã chi</Text>
          <Text style={[styles.totalValue, isOverBudget && styles.overBudget]}>
            {formatPrice(totalSpent)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Còn lại</Text>
          <Text
            style={[
              styles.totalValue,
              remaining < 0 ? styles.overBudget : styles.remaining,
            ]}
          >
            {formatPrice(remaining)}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: isOverBudget ? '#FF6B6B' : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {percentage.toFixed(0)}% đã sử dụng
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Chi tiết theo danh mục</Text>
        {categories.map((category, index) => {
          const categoryPercentage =
            category.planned > 0 ? (category.actual / category.planned) * 100 : 0;
          const isCategoryOver = category.actual > category.planned;

          return (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.category}</Text>
                </View>
                <View style={styles.categoryAmounts}>
                  <Text style={styles.categoryActual}>
                    {formatPrice(category.actual)}
                  </Text>
                  <Text style={styles.categoryPlanned}>
                    / {formatPrice(category.planned)}
                  </Text>
                </View>
              </View>
              <View style={styles.categoryProgress}>
                <View style={styles.categoryProgressBar}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      {
                        width: `${Math.min(categoryPercentage, 100)}%`,
                        backgroundColor: isCategoryOver ? '#FF6B6B' : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryPercentage,
                    isCategoryOver && styles.overBudget,
                  ]}
                >
                  {categoryPercentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        })}
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
  totalSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  remaining: {
    color: COLORS.success,
  },
  overBudget: {
    color: '#FF6B6B',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  categoriesSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  categoryActual: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryPlanned: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
});

