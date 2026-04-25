import { COLORS } from '@/constants/theme';
import { showToast, showConfirm } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import TripCard from '@/components/trip/trip-card';
import FilterBar from '@/components/trip/filter-bar';
import SortOptions from '@/components/trip/sort-options';
import EmptyState from '@/components/trip/empty-state';
import { Trip } from '@/store/useTripStore';

type SortOption = 'date-desc' | 'date-asc' | 'budget-desc' | 'budget-asc' | 'title-asc';

interface MyTripsWebProps {
  trips?: Trip[] | undefined;
}

export default function MyTripsWeb({ trips: tripsFromProps }: MyTripsWebProps) {
  const router = useRouter();
  const { user } = useUser();
  
  // Fallback: Query trực tiếp từ Convex nếu props là undefined
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );
  
  const tripsFromQuery = useQuery(
    api.trips.getUserTrips,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );
  
  // Ưu tiên dùng trips từ props, nếu không có thì dùng từ query
  const trips = tripsFromProps !== undefined ? (tripsFromProps || []) : (tripsFromQuery || []);
  
  // Xác định loading state: undefined = đang loading từ Convex
  const isLoading = tripsFromProps === undefined && tripsFromQuery === undefined;
  
  // Debug logs
  useEffect(() => {
    console.log('🔍 MyTripsWeb - Data State:', {
      tripsFromProps,
      tripsFromPropsIsUndefined: tripsFromProps === undefined,
      tripsFromQuery,
      tripsFromQueryIsUndefined: tripsFromQuery === undefined,
      convexUser,
      convexUserId: convexUser?._id,
      trips,
      tripsCount: trips?.length || 0,
      isLoading,
    });
  }, [tripsFromProps, tripsFromQuery, convexUser, trips, isLoading]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Trip['status'] | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editTrip, setEditTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  
  const deleteTrip = useMutation(api.trips.deleteTrip);
  const updateTripMutation = useMutation(api.trips.updateTrip);

  // Remove input focus outline on web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.primary} !important;
          box-shadow: 0 0 0 2px ${COLORS.primary}20 !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Filter and search trips
  const filteredTrips = useMemo(() => {
    let filtered = [...trips];
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((trip) => trip.status === statusFilter);
    }
    
    // Search by title or destination
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.title.toLowerCase().includes(query) ||
          trip.destination.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [trips, statusFilter, searchQuery]);

  // Sort trips
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips];
    switch (sortOption) {
      case 'date-desc':
        return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      case 'date-asc':
        return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      case 'budget-desc':
        return sorted.sort((a, b) => (b.budget || 0) - (a.budget || 0));
      case 'budget-asc':
        return sorted.sort((a, b) => (a.budget || 0) - (b.budget || 0));
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }, [filteredTrips, sortOption]);

  // Filter trips
  const handleFilterChange = (filters: { status?: Trip['status'] }) => {
    setStatusFilter(filters.status);
  };

  // Sort trips
  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setEditTrip({
      title: trip.title || '',
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      budget: trip.budget?.toString() || '0',
    });
    setShowEditTrip(true);
  };

  const handleEditTrip = async () => {
    if (!editingTrip) {
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    // Validation
    if (!editTrip.title.trim()) {
      showToast.warning('Vui lòng nhập tên chuyến đi');
      return;
    }
    if (!editTrip.destination.trim()) {
      showToast.warning('Vui lòng nhập điểm đến');
      return;
    }
    if (!editTrip.startDate) {
      showToast.warning('Vui lòng chọn ngày bắt đầu');
      return;
    }
    if (!editTrip.endDate) {
      showToast.warning('Vui lòng chọn ngày kết thúc');
      return;
    }
    if (new Date(editTrip.startDate) > new Date(editTrip.endDate)) {
      showToast.warning('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    if (!editTrip.budget || parseFloat(editTrip.budget) <= 0) {
      showToast.warning('Vui lòng nhập ngân sách hợp lệ');
      return;
    }

    try {
      setIsEditingTrip(true);

      await updateTripMutation({
        tripId: editingTrip._id as Id<'trips'>,
        title: editTrip.title.trim(),
        destination: editTrip.destination.trim(),
        startDate: editTrip.startDate,
        endDate: editTrip.endDate,
        budget: parseFloat(editTrip.budget),
      });

      console.log('✅ Trip updated successfully!');
      setShowEditTrip(false);
      setEditingTrip(null);
      showToast.success('Chuyến đi đã được cập nhật');
      // Trip data will automatically update via Convex real-time subscription
    } catch (error: any) {
      console.error('❌ Error updating trip:', error);
      showToast.error(error?.message || 'Không thể cập nhật chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsEditingTrip(false);
    }
  };

  const handleDelete = async (trip: Trip) => {
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa chuyến đi "${trip.title}"?\n\nHành động này không thể hoàn tác và sẽ xóa tất cả bookings liên quan.`,
      'Xóa chuyến đi',
      'danger'
    );
    
    if (!confirmed) return;
    
    await performDelete(trip);
  };

  const performDelete = async (trip: Trip) => {
    try {
      setIsDeleting(true);
      
      console.log('🗑️ Starting deletion process...');
      console.log('🗑️ Trip ID:', trip._id);
      console.log('🗑️ Trip title:', trip.title);
      
      await deleteTrip({ tripId: trip._id as Id<'trips'> });
      
      console.log('✅ Trip deleted successfully!');
      
      // Đợi một chút để đảm bảo Convex mutation hoàn tất và real-time sync bắt đầu
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Show success message
      showToast.success('Chuyến đi và tất cả bookings liên quan đã được xóa');
      
      // Trip will automatically disappear from list via Convex real-time subscription
    } catch (error: any) {
      console.error('❌ Error deleting trip:', error);
      showToast.error(error?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topNavTitle}>
            <Text style={styles.topNavTitleText}>Chuyến đi của tôi</Text>
          </View>
          <View style={styles.topNavActions} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chuyến đi của tôi</Text>
              <Text style={styles.subtitle}>
                {sortedTrips.length} chuyến đi {filteredTrips.length !== trips.length && `(${trips.length} tổng cộng)`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(tabs)/planning')}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Tạo chuyến đi</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm chuyến đi..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filters and Sort */}
          <View style={styles.filtersRow}>
            <FilterBar onFilterChange={handleFilterChange} />
            <SortOptions onSortChange={handleSortChange} />
          </View>

          {/* Trips List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải chuyến đi...</Text>
            </View>
          ) : sortedTrips.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.tripsList}>
              {sortedTrips.map((trip) => (
                <TripCard
                  key={trip._id}
                  trip={trip}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Trip Modal */}
      <Modal
        visible={showEditTrip}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditTrip(false);
          setEditingTrip(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa chuyến đi</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditTrip(false);
                  setEditingTrip(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên chuyến đi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Du lịch Đà Nẵng"
                  placeholderTextColor={COLORS.textSecondary}
                  value={editTrip.title}
                  onChangeText={(text) => setEditTrip(prev => ({ ...prev, title: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Điểm đến</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Đà Nẵng"
                  placeholderTextColor={COLORS.textSecondary}
                  value={editTrip.destination}
                  onChangeText={(text) => setEditTrip(prev => ({ ...prev, destination: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
                <input
                  type="date"
                  style={styles.dateInput as any}
                  value={editTrip.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditTrip(prev => ({ ...prev, startDate: value }));
                    if (value && editTrip.endDate && value > editTrip.endDate) {
                      setEditTrip(prev => ({ ...prev, endDate: '' }));
                    }
                  }}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                <input
                  type="date"
                  style={styles.dateInput as any}
                  value={editTrip.endDate}
                  min={editTrip.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditTrip(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngân sách (VND)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 5000000"
                  placeholderTextColor={COLORS.textSecondary}
                  value={editTrip.budget}
                  onChangeText={(text) => setEditTrip(prev => ({ ...prev, budget: text }))}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditTrip(false);
                  setEditingTrip(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, isEditingTrip && styles.modalButtonDisabled]}
                onPress={handleEditTrip}
                disabled={isEditingTrip}
              >
                {isEditingTrip ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  topNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
  },
  topNavTitle: {
    flex: 1,
    alignItems: 'center',
  },
  topNavTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  topNavActions: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    maxWidth: 500,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 12,
  },
  tripsList: {
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 500,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    width: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.surfaceLight,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

