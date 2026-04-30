import { COLORS } from '@/constants/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Trip } from '@/store/useTripStore';

interface FilterBarProps {
  onFilterChange?: (filters: {
    status?: Trip['status'];
    search?: string;
  }) => void;
}

const statusOptions: Array<{ value: Trip['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'planning', label: 'Đang lên kế hoạch' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'ongoing', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [selectedStatus, setSelectedStatus] = useState<Trip['status'] | 'all'>('all');

  const handleStatusChange = (status: Trip['status'] | 'all') => {
    setSelectedStatus(status);
    onFilterChange?.({
      status: status === 'all' ? undefined : status,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {statusOptions.map((option) => {
          const isSelected = selectedStatus === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => handleStatusChange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.filterText, isSelected && styles.filterTextSelected]}
              >
                {option.label}
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
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextSelected: {
    color: COLORS.white,
  },
});

