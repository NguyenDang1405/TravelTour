import { COLORS } from '@/constants/theme';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AvailabilityCalendarProps {
  onDateSelect?: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  unavailableDates?: string[]; // Array of YYYY-MM-DD
}

export default function AvailabilityCalendar({
  onDateSelect,
  minDate,
  maxDate,
  unavailableDates = [],
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const handleDateSelect = (date: string) => {
    if (unavailableDates.includes(date)) return;
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // Mock calendar - Simple version
  // In production, use a proper calendar library
  const renderCalendar = () => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    return (
      <View style={styles.calendar}>
        <View style={styles.weekDays}>
          {days.map((day) => (
            <View key={day} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {Array.from({ length: firstDay }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.dayCell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isUnavailable = unavailableDates.includes(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === today.toISOString().split('T')[0];

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                  isUnavailable && styles.unavailableCell,
                ]}
                onPress={() => handleDateSelect(dateStr)}
                disabled={isUnavailable}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    isUnavailable && styles.unavailableDayText,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn ngày</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.webCalendar}>
          <input
            type="date"
            style={styles.dateInput}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              const date = e.target.value;
              if (date) {
                handleDateSelect(date);
              }
            }}
          />
        </View>
      ) : (
        renderCalendar()
      )}
      {selectedDate && (
        <Text style={styles.selectedDateText}>
          Đã chọn: {new Date(selectedDate).toLocaleDateString('vi-VN')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  webCalendar: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  dateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  calendar: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  todayCell: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  unavailableCell: {
    opacity: 0.3,
  },
  unavailableDayText: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  selectedDateText: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 12,
    fontWeight: '500',
  },
});

