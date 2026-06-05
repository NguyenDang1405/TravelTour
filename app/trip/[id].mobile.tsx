import BookingModal from '@/components/booking/booking-modal';
import BookingsList from '@/components/trip/bookings-list';
import BudgetBreakdown from '@/components/trip/budget-breakdown';
import DayTimeline, { Day } from '@/components/trip/day-timeline';
import TripHeader from '@/components/trip/trip-header';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { showToast, showConfirm } from '@/utils/toast';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TripDetailsMobileProps {
  tripId: string;
}

// Helper function to calculate budget breakdown from trip data
const calculateBudgetBreakdown = (trip: any, bookings: any[]) => {
  const categories: { [key: string]: { planned: number; actual: number; icon: string } } = {
    hotel: { planned: 0, actual: 0, icon: '🏨' },
    restaurant: { planned: 0, actual: 0, icon: '🍽️' },
    attraction: { planned: 0, actual: 0, icon: '🏛️' },
    transport: { planned: 0, actual: 0, icon: '🚗' },
    flight: { planned: 0, actual: 0, icon: '✈️' },
    other: { planned: 0, actual: 0, icon: '🎯' },
  };

  // Calculate from activities in itinerary
  if (trip?.itinerary) {
    trip.itinerary.forEach((day: any) => {
      if (day.activities) {
        day.activities.forEach((activity: any) => {
          const cost = activity.cost || 0;
          const type = activity.type || 'other';
          const categoryKey = categories[type] ? type : 'other';
          
          categories[categoryKey].actual += cost;
        });
      }
    });
  }

  // Calculate from bookings
  bookings.forEach((booking) => {
    const cost = booking.price || 0;
    const type = booking.type || 'other';
    const categoryKey = categories[type] ? type : 'other';
    
    categories[categoryKey].actual += cost;
  });

  // For planned budget, we'll use a simple distribution based on actual spending
  // In a real app, this would come from user's planned budget per category
  const totalActual = Object.values(categories).reduce((sum, cat) => sum + cat.actual, 0);
  const totalBudget = trip?.budget || 0;
  
  // Distribute planned budget proportionally (or use actual as planned if no budget set)
  Object.keys(categories).forEach((key) => {
    if (totalActual > 0) {
      categories[key].planned = Math.round((categories[key].actual / totalActual) * totalBudget);
    } else {
      categories[key].planned = Math.round(totalBudget / Object.keys(categories).length);
    }
  });

  return Object.entries(categories)
    .filter(([_, cat]) => cat.actual > 0 || cat.planned > 0)
    .map(([key, cat]) => ({
      category: key === 'hotel' ? 'Khách sạn' :
                key === 'restaurant' ? 'Ăn uống' :
                key === 'attraction' ? 'Tham quan' :
                key === 'transport' ? 'Di chuyển' :
                key === 'flight' ? 'Chuyến bay' : 'Khác',
      planned: cat.planned,
      actual: cat.actual,
      icon: cat.icon,
    }));
};

export default function TripDetailsMobile({ tripId }: TripDetailsMobileProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Validate tripId - Convex IDs are typically 32 characters
  const isValidTripId = tripId && tripId.length >= 10;
  
  console.log('🔍 Trip Details Mobile - tripId:', tripId, 'isValid:', isValidTripId);
  
  // Query trip data from Convex
  const trip = useQuery(
    api.trips.getTrip,
    isValidTripId ? { tripId: tripId as Id<'trips'> } : 'skip'
  );

  // Query bookings for this trip
  const bookings = useQuery(
    api.bookings.getTripBookings,
    isValidTripId ? { tripId: tripId as Id<'trips'> } : 'skip'
  );

  // Debug logging
  useEffect(() => {
    console.log('📊 Trip Details Mobile - Query State:', {
      tripId,
      isValidTripId,
      trip: trip ? { 
        _id: trip._id, 
        title: trip.title, 
        destination: trip.destination,
        itineraryLength: trip.itinerary?.length || 0,
        hasItinerary: !!trip.itinerary,
        itinerary: trip.itinerary
      } : trip,
      bookings: bookings !== undefined ? (Array.isArray(bookings) ? bookings.length : 'not array') : 'undefined',
    });
  }, [trip, bookings, tripId, isValidTripId]);

  // Mutations
  const deleteTrip = useMutation(api.trips.deleteTrip);
  const shareTrip = useMutation(api.trips.shareTrip);
  const deleteBooking = useMutation(api.bookings.deleteBooking);

  // Calculate budget breakdown
  const budgetCategories = useMemo(() => {
    if (!trip) return [];
    return calculateBudgetBreakdown(trip, bookings || []);
  }, [trip, bookings]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return budgetCategories.reduce((sum, cat) => sum + cat.actual, 0);
  }, [budgetCategories]);

  // Transform bookings for BookingsList component
  const transformedBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.map((booking) => ({
      id: booking._id,
      name: booking.name,
      type: booking.type,
      location: booking.location.name || booking.location.address,
      price: booking.price,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      paymentMethod: booking.paymentMethod,
    }));
  }, [bookings]);

  // Transform itinerary for DayTimeline component
  const itinerary = useMemo(() => {
    if (!trip?.itinerary) {
      console.log('⚠️ No itinerary found in trip:', trip ? { _id: trip._id, title: trip.title, hasItinerary: !!trip.itinerary } : trip);
      return [];
    }
    console.log('✅ Itinerary found:', trip.itinerary.length, 'days', trip.itinerary);
    return trip.itinerary as Day[];
  }, [trip]);

  // Invalid tripId state
  if (!isValidTripId) {
    console.log('❌ Invalid tripId:', { tripId, length: tripId?.length, type: typeof tripId });
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>ID chuyến đi không hợp lệ</Text>
        <Text style={styles.errorSubtext}>ID chuyến đi: {tripId || '(empty)'}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/planning')} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Quay lại danh sách</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Loading state
  if (trip === undefined || bookings === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin chuyến đi...</Text>
      </SafeAreaView>
    );
  }

  // Error state - trip not found
  if (trip === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>Không tìm thấy chuyến đi</Text>
        <Text style={styles.errorSubtext}>
          Chuyến đi này có thể đã bị xóa hoặc bạn không có quyền truy cập.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    // Navigate back to planning screen with edit mode
    router.push('/(tabs)/planning');
    // Note: Edit functionality is available in planning screen
    // User can click edit button there to modify trip details
  };

  const handleDelete = async () => {
    console.log('🗑️ handleDelete called - tripId:', tripId);
    
    try {
      const confirmed = await showConfirm(
        'Bạn có chắc chắn muốn xóa chuyến đi này?\n\nHành động này không thể hoàn tác.',
        'Xóa chuyến đi',
        'danger'
      );
      
      console.log('🔍 Confirmation result:', confirmed);
      
      if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
      }
      
      console.log('✅ User confirmed, proceeding with delete');
      setIsDeleting(true);
      await deleteTrip({ tripId: tripId as Id<'trips'> });
      showToast.success('Chuyến đi đã được xóa thành công');
      // Navigate back after successful deletion
      router.back();
    } catch (error: any) {
      console.error('❌ Error deleting trip:', error);
      showToast.error(error?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBooking = async (booking: any) => {
    const bookingPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.price);
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa đặt chỗ "${booking.name}"?\n\nSố tiền ${bookingPrice} sẽ được cộng lại vào ngân sách.\n\nHành động này không thể hoàn tác.`,
      'Xóa đặt chỗ',
      'danger'
    );
    
    if (!confirmed) return;
    
    try {
      await deleteBooking({ bookingId: booking.id as Id<'bookings'> });
      showToast.success('Đã xóa đặt chỗ thành công. Ngân sách đã được cập nhật.');
    } catch (error: any) {
      showToast.error(error.message || 'Không thể xóa đặt chỗ. Vui lòng thử lại.');
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      // Generate share link
      const shareLink = `https://your-app.com/trip/${tripId}`;
      await shareTrip({ 
        tripId: tripId as Id<'trips'>,
        shareLink: shareLink
      });
      
      // Use native Share API
      try {
        const tripTitle = trip?.title || 'Chuyến đi';
        await Share.share({
          message: `Chia sẻ chuyến đi: ${tripTitle}\n${shareLink}`,
          url: shareLink,
        });
      } catch (shareError) {
        // Fallback: show alert with link
        showToast.info(`Link: ${shareLink}`, 'Chia sẻ');
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      showToast.error('Không thể chia sẻ chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Chi tiết chuyến đi Header */}
          <TripHeader
            title={trip.title}
            destination={trip.destination}
            startDate={trip.startDate}
            endDate={trip.endDate}
            budget={trip.budget}
            status={trip.status}
            onEdit={handleEdit}
            onDelete={isDeleting ? undefined : handleDelete}
          />
          
          {/* Loading overlay for delete */}
          {isDeleting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang xóa...</Text>
            </View>
          )}

          {/* Day Timeline */}
          <DayTimeline days={itinerary} />

          {/* Bookings List */}
          <BookingsList 
            bookings={transformedBookings} 
            onDelete={handleDeleteBooking}
          />

          {/* Add Booking Button */}
          <View style={styles.addBookingContainer}>
            <TouchableOpacity
              style={styles.addBookingButton}
              onPress={() => setShowBookingModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.white} />
              <Text style={styles.addBookingText}>Đặt chỗ mới</Text>
            </TouchableOpacity>
          </View>

          {/* Budget Breakdown */}
          <BudgetBreakdown
            totalBudget={trip.budget}
            totalSpent={totalSpent}
            categories={budgetCategories}
          />
        </View>
      </ScrollView>

      {/* Booking Modal */}
      {isValidTripId && (
        <BookingModal
          visible={showBookingModal}
          tripId={tripId as Id<'trips'>}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            // Refresh bookings list will happen automatically via Convex subscription
            setShowBookingModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 16,
  },
  addBookingContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  addBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  addBookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});

