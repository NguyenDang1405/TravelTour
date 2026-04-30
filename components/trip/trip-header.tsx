import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TripHeaderProps {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  onEdit?: () => void;
  onDelete?: () => void;
}

const getStatusColor = (status: TripHeaderProps['status']) => {
  switch (status) {
    case 'planning':
      return COLORS.warning;
    case 'confirmed':
      return COLORS.primary;
    case 'ongoing':
      return COLORS.success;
    case 'completed':
      return COLORS.textSecondary;
    case 'cancelled':
      return '#FF6B6B';
    default:
      return COLORS.textSecondary;
  }
};

const getStatusText = (status: TripHeaderProps['status']) => {
  switch (status) {
    case 'planning':
      return 'Đang lên kế hoạch';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'ongoing':
      return 'Đang diễn ra';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

export default function TripHeader({
  title,
  destination,
  startDate,
  endDate,
  budget,
  status,
  onEdit,
  onDelete,
}: TripHeaderProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(status) },
              ]}
            />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{destination}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{formatPrice(budget)}</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text,
  },
});



