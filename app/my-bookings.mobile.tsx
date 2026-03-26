import BookingModal from '@/components/booking/booking-modal';
import BookingCard from '@/components/bookings/booking-card';
import BookingDetailsModal from '@/components/bookings/booking-details-modal';
import FilterBar from '@/components/bookings/filter-bar';
import EmptyState from '@/components/trip/empty-state';
import { COLORS, SHADOWS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Booking {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  paymentMethod?: string;
  paymentId?: string;
  bookingDate?: string;
  tripId?: string;
  image?: string;
  description?: string;
}

interface MyBookingsMobileProps {
  bookings?: any[];
}

export default function MyBookingsMobile({ bookings: convexBookings = [] }: MyBookingsMobileProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Booking['status'] | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<Booking['type'] | undefined>(undefined);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const deleteBooking = useMutation(api.bookings.deleteBooking);

  // Transform Convex bookings to UI format
  const bookings: Booking[] = useMemo(() => {
    return convexBookings.map((b: any) => ({
      id: b._id,
      name: b.name,
      type: b.type,
      location: b.location?.name || b.location?.address || 'N/A',
      price: b.price || 0,
      status: b.status,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests,
      paymentMethod: b.paymentMethod,
      paymentId: b.paymentId,
      bookingDate: new Date(b.createdAt).toISOString(),
      tripId: b.tripId,
      image: b.image,
      description: b.description,
    }));
  }, [convexBookings]);

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    
    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter((b) => b.type === typeFilter);
    }
    
    // Search by name or location
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.location.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [bookings, statusFilter, typeFilter, searchQuery]);

  // Sort bookings by date (newest first)
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const dateA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
      const dateB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredBookings]);

  // Filter bookings
  const handleFilterChange = (filters: {
    status?: Booking['status'];
    type?: Booking['type'];
  }) => {
    setStatusFilter(filters.status);
    setTypeFilter(filters.type);
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCancel = async (booking: Booking) => {
    Alert.alert(
      'Hủy đặt chỗ',
      `Bạn có chắc chắn muốn hủy đặt chỗ "${booking.name}"?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đặt chỗ',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking({ bookingId: booking.id as Id<'bookings'> });
              Alert.alert('Thành công', 'Đã hủy đặt chỗ thành công');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hủy đặt chỗ. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (booking: Booking) => {
    const bookingPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.price);
    Alert.alert(
      'Xóa đặt chỗ',
      `Bạn có chắc chắn muốn xóa đặt chỗ "${booking.name}"? Hành động này không thể hoàn tác.\n\nNếu đặt chỗ này thuộc một chuyến đi, số tiền ${bookingPrice} sẽ được cộng lại vào ngân sách của chuyến đi đó.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBooking({ bookingId: booking.id as Id<'bookings'> });
              // Danh sách bookings sẽ tự động cập nhật nhờ Convex real-time subscription
              Alert.alert('Thành công', 'Đã xóa đặt chỗ thành công');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa đặt chỗ. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt chỗ của tôi</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm đặt chỗ..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filters */}
          <FilterBar onFilterChange={handleFilterChange} />

          {/* Bookings List */}
          {sortedBookings.length === 0 ? (
            <EmptyState
              title="Chưa có đặt chỗ nào"
              message="Các đặt chỗ của bạn sẽ hiển thị ở đây"
              actionLabel="Khám phá ngay"
              onAction={() => router.push('/(tabs)/explore')}
            />
          ) : (
            <View style={styles.bookingsList}>
              {sortedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={handleViewDetails}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        visible={showDetailsModal}
        booking={selectedBooking}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />

      {/* Add Booking Button - Floating */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowBookingModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={() => {
          setShowBookingModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  backButton: {
    width: 40,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 12,
  },
  bookingsList: {
    gap: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 1000,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
});

