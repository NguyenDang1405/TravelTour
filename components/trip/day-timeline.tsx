import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActivityCard from './activity-card';

export interface Activity {
  id: string;
  name: string;
  type: string;
  location: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  time: string;
  duration: number;
  cost?: number;
  description?: string;
  image?: string;
  bookingId?: string;
}

export interface Day {
  day: number;
  date: string;
  activities: Activity[];
}

interface DayTimelineProps {
  days: Day[];
  onActivityPress?: (activity: Activity) => void;
  onActivityEdit?: (activity: Activity) => void;
  onActivityDelete?: (activityId: string) => void;
}

export default function DayTimeline({
  days,
  onActivityPress,
  onActivityEdit,
  onActivityDelete,
}: DayTimelineProps) {
  const [selectedDay, setSelectedDay] = useState(0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      dayName: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
      day: date.getDate(),
      month: date.toLocaleDateString('vi-VN', { month: 'short' }),
    };
  };

  const currentDay = days[selectedDay];
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
        {days.map((day, index) => {
          const formatted = formatDate(day.date);
          const isSelected = index === selectedDay;
          return (
            <TouchableOpacity
              key={day.day}
              style={[styles.dayTab, isSelected && styles.dayTabSelected]}
              onPress={() => setSelectedDay(index)}
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
              <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
              <Text style={styles.emptySubtext}>
                Thêm hoạt động để lên kế hoạch cho ngày này
              </Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {currentDay.activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isFirst={index === 0}
                  isLast={index === currentDay.activities.length - 1}
                  onPress={() => onActivityPress?.(activity)}
                  onEdit={() => onActivityEdit?.(activity)}
                  onDelete={() => onActivityDelete?.(activity.id)}
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  dayTabs: {
    marginBottom: 20,
  },
  dayTabsContent: {
    gap: 12,
    paddingRight: 20,
  },
  dayTab: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    minWidth: 70,
  },
  dayTabSelected: {
    backgroundColor: COLORS.primary,
  },
  dayTabNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayTabNumberSelected: {
    color: COLORS.white,
  },
  dayTabMonth: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayTabMonthSelected: {
    color: COLORS.white,
  },
  dayContent: {
    marginTop: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activitiesCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activitiesList: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});



