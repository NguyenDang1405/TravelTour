import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NavigationActionsProps {
  onViewTrip?: () => void;
  onGoHome?: () => void;
  onBookMore?: () => void;
  tripId?: string;
}

export default function NavigationActions({
  onViewTrip,
  onGoHome,
  onBookMore,
  tripId,
}: NavigationActionsProps) {
  const router = useRouter();

  const handleViewTrip = () => {
    if (onViewTrip) {
      onViewTrip();
    } else if (tripId) {
      router.push(`/trip/${tripId}`);
    } else {
      router.push('/(tabs)/planning');
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleBookMore = () => {
    if (onBookMore) {
      onBookMore();
    } else {
      router.push('/(tabs)/explore');
    }
  };

  return (
    <View style={styles.container}>
      {tripId && (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleViewTrip}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>Xem chuyến đi</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleGoHome}
        activeOpacity={0.7}
      >
        <Ionicons name="home-outline" size={20} color={COLORS.primary} />
        <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleBookMore}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
        <Text style={styles.secondaryButtonText}>Đặt thêm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

