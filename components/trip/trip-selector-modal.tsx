import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface TripSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTrip: (tripId: Id<'trips'>) => void;
  title?: string;
}

export default function TripSelectorModal({
  visible,
  onClose,
  onSelectTrip,
  title = 'Chọn chuyến đi',
}: TripSelectorModalProps) {
  const { user: clerkUser } = useUser();
  const [selectedTripId, setSelectedTripId] = useState<Id<'trips'> | null>(null);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  // Get user trips
  const trips = useQuery(
    api.trips.getUserTrips,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const handleSelectTrip = (tripId: Id<'trips'>) => {
    setSelectedTripId(tripId);
    onSelectTrip(tripId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {trips === undefined ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
            </View>
          ) : !trips || trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="airplane-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
              <Text style={styles.emptySubtext}>
                Tạo chuyến đi mới trong tab Planning để thêm item vào
              </Text>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {trips.map((trip) => (
                <TouchableOpacity
                  key={trip._id}
                  style={[
                    styles.tripCard,
                    selectedTripId === trip._id && styles.tripCardSelected
                  ]}
                  onPress={() => handleSelectTrip(trip._id)}
                >
                  <View style={styles.tripCardContent}>
                    <View style={styles.tripCardLeft}>
                      <View style={styles.tripIconContainer}>
                        <Ionicons name="airplane" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.tripInfo}>
                        <Text style={styles.tripTitle}>{trip.title}</Text>
                        <View style={styles.tripDetails}>
                          <View style={styles.tripDetailRow}>
                            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.tripDetailText}>{trip.destination}</Text>
                          </View>
                          <View style={styles.tripDetailRow}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.tripDetailText}>
                              {new Date(trip.startDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} - {new Date(trip.endDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                          {trip.budget > 0 && (
                            <View style={styles.tripDetailRow}>
                              <Ionicons name="wallet-outline" size={14} color={COLORS.textSecondary} />
                              <Text style={styles.tripDetailText}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.budget)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    {selectedTripId === trip._id && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'web' ? SPACING.lg : 60,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cancelButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  tripsList: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.md,
        },
      },
    }),
  },
  tripCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
    ...SHADOWS.md,
  },
  tripCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripCardLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: SPACING.md,
  },
  tripIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tripDetails: {
    gap: SPACING.xs,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tripDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
