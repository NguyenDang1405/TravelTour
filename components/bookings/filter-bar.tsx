import { COLORS } from '@/constants/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type BookingType = 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';

interface FilterBarProps {
  onFilterChange?: (filters: {
    status?: BookingStatus;
    type?: BookingType;
  }) => void;
}

const statusOptions: Array<{ value: BookingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const typeOptions: Array<{ value: BookingType | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'Tất cả', icon: '📍' },
  { value: 'hotel', label: 'Khách sạn', icon: '🏨' },
  { value: 'flight', label: 'Chuyến bay', icon: '✈️' },
  { value: 'attraction', label: 'Điểm tham quan', icon: '🏛️' },
  { value: 'restaurant', label: 'Nhà hàng', icon: '🍽️' },
  { value: 'transport', label: 'Vận chuyển', icon: '🚗' },
];

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<BookingType | 'all'>('all');

  const handleStatusChange = (status: BookingStatus | 'all') => {
    setSelectedStatus(status);
    onFilterChange?.({
      status: status === 'all' ? undefined : status,
      type: selectedType === 'all' ? undefined : selectedType,
    });
  };

  const handleTypeChange = (type: BookingType | 'all') => {
    setSelectedType(type);
    onFilterChange?.({
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      type: type === 'all' ? undefined : type,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionLabel}>Trạng thái:</Text>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.typeScroll}
      >
        <Text style={styles.sectionLabel}>Loại:</Text>
        {typeOptions.map((option) => {
          const isSelected = selectedType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => handleTypeChange(option.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterIcon}>{option.icon}</Text>
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
    alignItems: 'center',
  },
  typeScroll: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  filterIcon: {
    fontSize: 14,
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

