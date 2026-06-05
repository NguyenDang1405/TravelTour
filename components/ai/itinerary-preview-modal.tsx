import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ItineraryDayTab, { ItineraryDay } from './itinerary-day-tab';
import { ItineraryActivity } from './itinerary-activity-item';
import ItinerarySummary from './itinerary-summary';

interface ItineraryPreviewModalProps {
  visible: boolean;
  itinerary: ItineraryDay[];
  onClose: () => void;
  onSave?: (itinerary: ItineraryDay[]) => void;
  onEditActivity?: (activity: ItineraryActivity) => void;
  onRemoveActivity?: (activityId: string) => void;
}

export default function ItineraryPreviewModal({
  visible,
  itinerary,
  onClose,
  onSave,
  onEditActivity,
  onRemoveActivity,
}: ItineraryPreviewModalProps) {
  const [selectedDay, setSelectedDay] = useState(itinerary[0]?.day || 1);
  const [localItinerary, setLocalItinerary] = useState<ItineraryDay[]>(itinerary);

  const handleSave = () => {
    if (onSave) {
      onSave(localItinerary);
      Alert.alert('Thành công', 'Đã lưu lịch trình vào chuyến đi');
      onClose();
    } else {
      Alert.alert('Lưu lịch trình', 'Tính năng đang được phát triển');
    }
  };

  const handleEditActivity = (activity: ItineraryActivity) => {
    if (onEditActivity) {
      onEditActivity(activity);
    } else {
      Alert.alert('Chỉnh sửa', 'Tính năng đang được phát triển');
    }
  };

  const handleRemoveActivity = (activityId: string) => {
    Alert.alert(
      'Xóa hoạt động',
      'Bạn có chắc chắn muốn xóa hoạt động này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const updatedItinerary = localItinerary.map((day) => ({
              ...day,
              activities: day.activities.filter((a) => a.id !== activityId),
            }));
            setLocalItinerary(updatedItinerary);
            onRemoveActivity?.(activityId);
          },
        },
      ]
    );
  };

  if (itinerary.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
              <View>
                <Text style={styles.headerTitle}>Xem trước lịch trình</Text>
                <Text style={styles.headerSubtitle}>
                  {itinerary.length} ngày • {itinerary.reduce((sum, d) => sum + d.activities.length, 0)} hoạt động
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Day Tabs & Activities */}
            <ItineraryDayTab
              days={localItinerary}
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
              onActivityEdit={handleEditActivity}
              onActivityRemove={handleRemoveActivity}
            />

            {/* Summary */}
            <ItinerarySummary days={localItinerary} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Lưu vào chuyến đi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

