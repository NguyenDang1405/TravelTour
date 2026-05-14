import { COLORS } from '@/constants/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Category = 'all' | 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';

interface CategoryTabsProps {
  onCategoryChange?: (category: Category) => void;
}

const categories: Array<{ value: Category; label: string; icon: string }> = [
  { value: 'all', label: 'Tất cả', icon: '📍' },
  { value: 'hotel', label: 'Khách sạn', icon: '🏨' },
  { value: 'flight', label: 'Chuyến bay', icon: '✈️' },
  { value: 'attraction', label: 'Điểm tham quan', icon: '🏛️' },
  { value: 'restaurant', label: 'Nhà hàng', icon: '🍽️' },
  { value: 'transport', label: 'Vận chuyển', icon: '🚗' },
];

export default function CategoryTabs({ onCategoryChange }: CategoryTabsProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    onCategoryChange?.(category);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;
          return (
            <TouchableOpacity
              key={category.value}
              style={[styles.tab, isSelected && styles.tabSelected]}
              onPress={() => handleCategoryChange(category.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{category.icon}</Text>
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  tab: {
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
  tabSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextSelected: {
    color: COLORS.white,
  },
});

