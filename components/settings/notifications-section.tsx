import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

interface NotificationsSectionProps {
  onSettingsChange?: (settings: NotificationSettings) => void;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  bookingConfirmations: boolean;
  tripReminders: boolean;
  dealsAndOffers: boolean;
  newsletter: boolean;
}

export default function NotificationsSection({
  onSettingsChange,
}: NotificationsSectionProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    bookingConfirmations: true,
    tripReminders: true,
    dealsAndOffers: false,
    newsletter: false,
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const notificationItems = [
    {
      key: 'emailNotifications' as keyof NotificationSettings,
      label: 'Thông báo qua email',
      description: 'Nhận thông báo quan trọng qua email',
      icon: 'mail-outline' as const,
    },
    {
      key: 'pushNotifications' as keyof NotificationSettings,
      label: 'Thông báo đẩy',
      description: 'Nhận thông báo trên thiết bị',
      icon: 'notifications-outline' as const,
    },
    {
      key: 'bookingConfirmations' as keyof NotificationSettings,
      label: 'Xác nhận đặt chỗ',
      description: 'Thông báo khi đặt chỗ thành công',
      icon: 'checkmark-circle-outline' as const,
    },
    {
      key: 'tripReminders' as keyof NotificationSettings,
      label: 'Nhắc nhở chuyến đi',
      description: 'Nhắc nhở trước khi chuyến đi bắt đầu',
      icon: 'calendar-outline' as const,
    },
    {
      key: 'dealsAndOffers' as keyof NotificationSettings,
      label: 'Ưu đãi & Khuyến mãi',
      description: 'Nhận thông tin về ưu đãi đặc biệt',
      icon: 'pricetag-outline' as const,
    },
    {
      key: 'newsletter' as keyof NotificationSettings,
      label: 'Bản tin',
      description: 'Nhận bản tin du lịch hàng tuần',
      icon: 'newspaper-outline' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Thông báo</Text>
      </View>

      <View style={styles.content}>
        {notificationItems.map((item) => (
          <View key={item.key} style={styles.notificationItem}>
            <View style={styles.notificationLeft}>
              <Ionicons
                name={item.icon}
                size={20}
                color={COLORS.primary}
                style={styles.icon}
              />
              <View style={styles.notificationText}>
                <Text style={styles.notificationLabel}>{item.label}</Text>
                <Text style={styles.notificationDescription}>
                  {item.description}
                </Text>
              </View>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => handleToggle(item.key)}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '80' }}
              thumbColor={settings[item.key] ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
        ))}
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
    gap: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  icon: {
    marginRight: 4,
  },
  notificationText: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

