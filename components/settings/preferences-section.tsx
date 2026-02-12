import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PreferencesSectionProps {
  interests?: string[];
  budget?: number;
  onInterestsChange?: (interests: string[]) => void;
  onBudgetChange?: (budget: number) => void;
}

const availableInterests = [
  { id: 'beach', label: '🏖️ Bãi biển', icon: '🏖️' },
  { id: 'culture', label: '🏛️ Văn hóa', icon: '🏛️' },
  { id: 'adventure', label: '⛰️ Phiêu lưu', icon: '⛰️' },
  { id: 'food', label: '🍽️ Ẩm thực', icon: '🍽️' },
  { id: 'nature', label: '🌲 Thiên nhiên', icon: '🌲' },
  { id: 'shopping', label: '🛍️ Mua sắm', icon: '🛍️' },
  { id: 'nightlife', label: '🌃 Cuộc sống đêm', icon: '🌃' },
  { id: 'relaxation', label: '🧘 Thư giãn', icon: '🧘' },
  { id: 'sports', label: '⚽ Thể thao', icon: '⚽' },
  { id: 'photography', label: '📸 Nhiếp ảnh', icon: '📸' },
];

const budgetRanges = [
  { label: 'Tiết kiệm', min: 0, max: 2000000 },
  { label: 'Trung bình', min: 2000000, max: 5000000 },
  { label: 'Cao cấp', min: 5000000, max: 10000000 },
  { label: 'Sang trọng', min: 10000000, max: Infinity },
];

export default function PreferencesSection({
  interests = [],
  budget,
  onInterestsChange,
  onBudgetChange,
}: PreferencesSectionProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests);
  const [selectedBudget, setSelectedBudget] = useState<number | undefined>(budget);

  const handleInterestToggle = (interestId: string) => {
    const newInterests = selectedInterests.includes(interestId)
      ? selectedInterests.filter((id) => id !== interestId)
      : [...selectedInterests, interestId];
    setSelectedInterests(newInterests);
    onInterestsChange?.(newInterests);
  };

  const handleBudgetSelect = (min: number, max: number) => {
    const avgBudget = max === Infinity ? min + 5000000 : (min + max) / 2;
    setSelectedBudget(avgBudget);
    onBudgetChange?.(avgBudget);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Sở thích & Ngân sách</Text>
      </View>

      <View style={styles.content}>
        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sở thích du lịch</Text>
          <Text style={styles.sectionHint}>
            Chọn các sở thích của bạn để chúng tôi đề xuất phù hợp hơn
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.interestsContainer}
          >
            {availableInterests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => handleInterestToggle(interest.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.interestIcon}>{interest.icon}</Text>
                  <Text
                    style={[
                      styles.interestLabel,
                      isSelected && styles.interestLabelSelected,
                    ]}
                  >
                    {interest.label.split(' ')[1]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngân sách dự kiến</Text>
          <Text style={styles.sectionHint}>
            Chọn mức ngân sách phù hợp với bạn
          </Text>
          <View style={styles.budgetContainer}>
            {budgetRanges.map((range, index) => {
              const isSelected =
                selectedBudget !== undefined &&
                selectedBudget >= range.min &&
                selectedBudget < range.max;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.budgetChip,
                    isSelected && styles.budgetChipSelected,
                  ]}
                  onPress={() => handleBudgetSelect(range.min, range.max)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.budgetLabel,
                      isSelected && styles.budgetLabelSelected,
                    ]}
                  >
                    {range.label}
                  </Text>
                  <Text
                    style={[
                      styles.budgetRange,
                      isSelected && styles.budgetRangeSelected,
                    ]}
                  >
                    {range.max === Infinity
                      ? `> ${formatPrice(range.min)}`
                      : `${formatPrice(range.min)} - ${formatPrice(range.max)}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
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
  content: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  interestsContainer: {
    gap: 8,
    paddingRight: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  interestChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  interestIcon: {
    fontSize: 18,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  interestLabelSelected: {
    color: COLORS.white,
  },
  budgetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetChip: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    alignItems: 'center',
    gap: 4,
  },
  budgetChipSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  budgetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  budgetLabelSelected: {
    color: COLORS.primary,
  },
  budgetRange: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  budgetRangeSelected: {
    color: COLORS.primary,
  },
});

