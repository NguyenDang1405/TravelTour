import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SortOption = 'date-desc' | 'date-asc' | 'budget-desc' | 'budget-asc' | 'title-asc';

interface SortOptionsProps {
  onSortChange?: (sort: SortOption) => void;
}

const sortOptions: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'date-desc', label: 'Mới nhất', icon: 'calendar-outline' },
  { value: 'date-asc', label: 'Cũ nhất', icon: 'calendar-outline' },
  { value: 'budget-desc', label: 'Ngân sách cao', icon: 'wallet-outline' },
  { value: 'budget-asc', label: 'Ngân sách thấp', icon: 'wallet-outline' },
  { value: 'title-asc', label: 'Tên A-Z', icon: 'text-outline' },
];

export default function SortOptions({ onSortChange }: SortOptionsProps) {
  const [selectedSort, setSelectedSort] = useState<SortOption>('date-desc');
  const [showModal, setShowModal] = useState(false);

  const handleSortChange = (sort: SortOption) => {
    setSelectedSort(sort);
    onSortChange?.(sort);
    setShowModal(false);
  };

  const selectedOption = sortOptions.find((opt) => opt.value === selectedSort);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="swap-vertical-outline" size={20} color={COLORS.primary} />
        <Text style={styles.sortText}>
          Sắp xếp: {selectedOption?.label || 'Mới nhất'}
        </Text>
        <Ionicons name="chevron-down-outline" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sắp xếp theo</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionsList}>
              {sortOptions.map((option) => {
                const isSelected = selectedSort === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSortChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionsList: {
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
});

