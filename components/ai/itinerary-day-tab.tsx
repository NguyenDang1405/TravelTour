import { COLORS } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ItineraryActivityItem, { ItineraryActivity } from './itinerary-activity-item';

export interface ItineraryDay {
  day: number;
  date: string;
  activities: ItineraryActivity[];
}

interface ItineraryDayTabProps {
  days: ItineraryDay[];
  selectedDay: number;
  onDayChange: (day: number) => void;
  onActivityEdit?: (activity: ItineraryActivity) => void;
  onActivityRemove?: (activityId: string) => void;
}

export default function ItineraryDayTab({
  days,
  selectedDay,
  onDayChange,
  onActivityEdit,
  onActivityRemove,
}: ItineraryDayTabProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      dayName: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
      day: date.getDate(),
      month: date.toLocaleDateString('vi-VN', { month: 'short' }),
    };
  };

  const currentDay = days.find((d) => d.day === selectedDay);
  const formattedDate = currentDay ? formatDate(currentDay.date) : null;

  return (
    <View style={styles.container}>
      {/* Day Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabs}
        contentContainerStyle={styles.dayTabsContent}
      >
        {days.map((day) => {
          const formatted = formatDate(day.date);
          const isSelected = day.day === selectedDay;
          return (
            <TouchableOpacity
              key={day.day}
              style={[styles.dayTab, isSelected && styles.dayTabSelected]}
              onPress={() => onDayChange(day.day)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayTabNumber, isSelected && styles.dayTabNumberSelected]}>
                {day.day}
              </Text>
              <Text style={[styles.dayTabMonth, isSelected && styles.dayTabMonthSelected]}>
                {formatted.month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Day Content */}
      {currentDay && formattedDate && (
        <View style={styles.dayContent}>
          <View style={styles.dayHeader}>
            <View>
              <Text style={styles.dayTitle}>
                Ngày {currentDay.day} - {formattedDate.dayName}
              </Text>
              <Text style={styles.dayDate}>{currentDay.date}</Text>
            </View>
            <Text style={styles.activitiesCount}>
              {currentDay.activities.length} hoạt động
            </Text>
          </View>

          {currentDay.activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {currentDay.activities.map((activity, index) => (
                <ItineraryActivityItem
                  key={activity.id}
                  activity={activity}
                  onEdit={onActivityEdit}
                  onRemove={onActivityRemove}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  dayTabs: {
    marginBottom: 8,
  },
  dayTabsContent: {
    gap: 8,
    paddingRight: 8,
  },
  dayTab: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    minWidth: 60,
  },
  dayTabSelected: {
    backgroundColor: COLORS.primary,
  },
  dayTabNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayTabNumberSelected: {
    color: COLORS.white,
  },
  dayTabMonth: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayTabMonthSelected: {
    color: COLORS.white,
  },
  dayContent: {
    gap: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  activitiesCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activitiesList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

