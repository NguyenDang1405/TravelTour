import BookingModal from '@/components/booking/booking-modal';
import BookingsList from '@/components/trip/bookings-list';
import BudgetBreakdown from '@/components/trip/budget-breakdown';
import DayTimeline, { Day, Activity } from '@/components/trip/day-timeline';
import TripHeader from '@/components/trip/trip-header';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { showToast, showConfirm } from '@/utils/toast';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TripDetailsWebProps {
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

export default function TripDetailsWeb({ tripId }: TripDetailsWebProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTrip, setEditTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'attraction' as Activity['type'],
    location: '',
    time: '',
    duration: '',
    cost: '',
    description: '',
  });
  
  // Normalize tripId - handle edge cases where it might be an object or other type
  const normalizedTripId = useMemo(() => {
    // Handle undefined/null
    if (!tripId) {
      console.log('⚠️ TripDetailsWeb - tripId is empty:', tripId);
      return '';
    }
    
    // If it's already a string, return it
    if (typeof tripId === 'string') {
      return tripId.trim();
    }
    
    // If it's an object, try to extract a string value
    if (typeof tripId === 'object' && tripId !== null) {
      const stringValue = String(tripId);
      return stringValue.trim();
    }
    
    // Convert to string
    return String(tripId).trim();
  }, [tripId]);
  
  // Validate tripId - Convex IDs are typically 32 characters
  const isValidTripId = normalizedTripId && normalizedTripId.length >= 10;
  
  console.log('🔍 Trip Details - tripId:', tripId, 'normalizedTripId:', normalizedTripId, 'isValid:', isValidTripId);
  
  // Query trip data from Convex
  const trip = useQuery(
    api.trips.getTrip,
    isValidTripId ? { tripId: normalizedTripId as Id<'trips'> } : 'skip'
  );

  // Query bookings for this trip
  const bookings = useQuery(
    api.bookings.getTripBookings,
    isValidTripId ? { tripId: normalizedTripId as Id<'trips'> } : 'skip'
  );

  // Debug logging
  useEffect(() => {
    console.log('📊 Trip Details - Query State:', {
      tripId,
      normalizedTripId,
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
  }, [trip, bookings, tripId, normalizedTripId, isValidTripId]);

  // Mutations
  const deleteTrip = useMutation(api.trips.deleteTrip);
  const deleteBooking = useMutation(api.bookings.deleteBooking);
  const updateTripMutation = useMutation(api.trips.updateTrip);
  const updateItineraryMutation = useMutation(api.trips.updateItinerary);
  
  // Initialize edit form when trip data is loaded
  useEffect(() => {
    if (trip && !showEditTrip) {
      setEditTrip({
        title: trip.title || '',
        destination: trip.destination || '',
        startDate: trip.startDate || '',
        endDate: trip.endDate || '',
        budget: trip.budget?.toString() || '0',
      });
    }
  }, [trip, showEditTrip]);

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

  // Activity types
  const activityTypes = [
    { id: 'attraction' as const, name: 'Tham quan', icon: '🏛️' },
    { id: 'restaurant' as const, name: 'Ăn uống', icon: '🍽️' },
    { id: 'hotel' as const, name: 'Khách sạn', icon: '🏨' },
    { id: 'transport' as const, name: 'Di chuyển', icon: '🚗' },
    { id: 'flight' as const, name: 'Chuyến bay', icon: '✈️' },
    { id: 'other' as const, name: 'Khác', icon: '🎯' },
  ];

  // Helper function to get itinerary
  const getItinerary = React.useCallback((): Day[] => {
    if (!trip?.itinerary || trip.itinerary.length === 0) {
      // Nếu chưa có itinerary, tạo từ startDate và endDate
      if (!trip?.startDate || !trip?.endDate) {
        return [];
      }
      
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const days: Day[] = [];
      
      let currentDate = new Date(start);
      let dayNumber = 1;
      
      while (currentDate <= end) {
        days.push({
          day: dayNumber,
          date: currentDate.toISOString().split('T')[0],
          activities: [],
        });
        currentDate.setDate(currentDate.getDate() + 1);
        dayNumber++;
      }
      
      return days;
    }
    
    return trip.itinerary as Day[];
  }, [trip]);

  // Transform itinerary for DayTimeline component
  const itinerary = useMemo(() => {
    return getItinerary();
  }, [getItinerary]);

  // Invalid tripId state
  if (!isValidTripId) {
    console.log('❌ Invalid tripId:', { 
      tripId, 
      normalizedTripId,
      tripIdType: typeof tripId,
      tripIdLength: tripId?.length,
      normalizedLength: normalizedTripId?.length 
    });
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>ID chuyến đi không hợp lệ</Text>
        <Text style={styles.errorSubtext}>ID chuyến đi: {normalizedTripId || tripId || '(empty)'}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/planning')} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (trip === undefined || bookings === undefined) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin chuyến đi...</Text>
      </View>
    );
  }

  // Error state - trip not found
  if (trip === null) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>Không tìm thấy chuyến đi</Text>
        <Text style={styles.errorSubtext}>
          Chuyến đi này có thể đã bị xóa hoặc bạn không có quyền truy cập.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  const handleEdit = () => {
    if (!trip) return;
    // Initialize edit form with current trip data
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
    if (!trip) {
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
        tripId: trip._id as Id<'trips'>,
        title: editTrip.title.trim(),
        destination: editTrip.destination.trim(),
        startDate: editTrip.startDate,
        endDate: editTrip.endDate,
        budget: parseFloat(editTrip.budget),
      });

      console.log('✅ Trip updated successfully!');
      setShowEditTrip(false);
      showToast.success('Chuyến đi đã được cập nhật');
      // Trip data will automatically update via Convex real-time subscription
    } catch (error: any) {
      console.error('❌ Error updating trip:', error);
      showToast.error(error?.message || 'Không thể cập nhật chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsEditingTrip(false);
    }
  };

  const handleDelete = async () => {
    console.log('🗑️ handleDelete called - trip:', trip?._id);
    
    if (!trip) {
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    try {
      const confirmed = await showConfirm(
        `Bạn có chắc chắn muốn xóa chuyến đi "${trip.title}"?\n\nHành động này không thể hoàn tác và sẽ xóa tất cả bookings liên quan.`,
        'Xóa chuyến đi',
        'danger'
      );
      
      console.log('🔍 Confirmation result:', confirmed);
      
      if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
      }
      
      console.log('✅ User confirmed, proceeding with delete');
      await performDelete();
    } catch (error: any) {
      console.error('❌ Error in handleDelete:', error);
      showToast.error('Có lỗi xảy ra khi xác nhận xóa. Vui lòng thử lại.');
    }
  };

  const performDelete = async () => {
    if (!trip) return;

    try {
      setIsDeleting(true);
      
      console.log('🗑️ Starting deletion process...');
      console.log('🗑️ Trip ID:', normalizedTripId);
      console.log('🗑️ Trip title:', trip.title);
      
      // Xóa trip từ Convex
      const result = await deleteTrip({ tripId: normalizedTripId as Id<'trips'> });
      
      console.log('✅ Trip deleted successfully!', result);
      
      // Đợi một chút để đảm bảo Convex mutation hoàn tất và real-time sync bắt đầu
      // Real-time subscription sẽ tự động cập nhật planning page
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Navigate to planning page after successful deletion
      // Planning page sẽ tự động cập nhật nhờ real-time subscription
      router.push('/(tabs)/planning');
      
      // Show success message after navigation
      setTimeout(() => {
        showToast.success('Chuyến đi và tất cả bookings liên quan đã được xóa');
      }, 300);
      
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
      // Danh sách bookings và budget sẽ tự động cập nhật nhờ Convex real-time subscription
      // Budget breakdown sẽ tự động tính lại và hiển thị số tiền còn lại đã tăng lên
    } catch (error: any) {
      showToast.error(error.message || 'Không thể xóa đặt chỗ. Vui lòng thử lại.');
    }
  };

  const handleAddActivity = async () => {
    if (!trip) {
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    // Validation
    if (!newActivity.name.trim()) {
      showToast.warning('Vui lòng nhập tên hoạt động');
      return;
    }
    if (!newActivity.location.trim()) {
      showToast.warning('Vui lòng nhập địa điểm');
      return;
    }
    if (!newActivity.time.trim()) {
      showToast.warning('Vui lòng nhập thời gian');
      return;
    }
    if (!newActivity.duration || parseInt(newActivity.duration) <= 0) {
      showToast.warning('Vui lòng nhập thời lượng hợp lệ');
      return;
    }

    try {
      setIsAddingActivity(true);

      // Lấy itinerary hiện tại
      const currentItinerary = getItinerary();
      
      // Tìm day được chọn
      const selectedDayData = currentItinerary.find(d => d.day === selectedDay);
      if (!selectedDayData) {
        showToast.error('Không tìm thấy ngày được chọn');
        return;
      }

      if (editingActivityId) {
        // Edit existing activity
        const updatedItinerary = currentItinerary.map(day => ({
          ...day,
          activities: day.activities.map(activity => 
            activity.id === editingActivityId
              ? {
                  ...activity,
                  name: newActivity.name.trim(),
                  type: newActivity.type,
                  location: {
                    name: newActivity.location.trim(),
                    address: newActivity.location.trim(),
                    coordinates: activity.location.coordinates,
                  },
                  time: newActivity.time.trim(),
                  duration: parseInt(newActivity.duration),
                  cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
                  description: newActivity.description.trim() || undefined,
                }
              : activity
          ),
        }));

        await updateItineraryMutation({
          tripId: trip._id as Id<'trips'>,
          itinerary: updatedItinerary,
        });

        showToast.success('Hoạt động đã được cập nhật');
      } else {
        // Add new activity
        const newActivityData = {
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: newActivity.name.trim(),
          type: newActivity.type,
          location: {
            name: newActivity.location.trim(),
            address: newActivity.location.trim(),
            coordinates: {
              lat: 0,
              lng: 0,
            },
          },
          time: newActivity.time.trim(),
          duration: parseInt(newActivity.duration),
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          description: newActivity.description.trim() || undefined,
        };

        const updatedItinerary = currentItinerary.map(day => {
          if (day.day === selectedDay) {
            return {
              ...day,
              activities: [...day.activities, newActivityData],
            };
          }
          return day;
        });

        await updateItineraryMutation({
          tripId: trip._id as Id<'trips'>,
          itinerary: updatedItinerary,
        });

        showToast.success('Hoạt động đã được thêm vào lịch trình');
      }

      // Reset form
      setShowAddActivity(false);
      setEditingActivityId(null);
      setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
    } catch (error: any) {
      console.error('Error adding/editing activity:', error);
      showToast.error(error?.message || 'Không thể thêm/cập nhật hoạt động. Vui lòng thử lại.');
    } finally {
      setIsAddingActivity(false);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    // Find which day this activity belongs to
    const currentItinerary = getItinerary();
    const dayIndex = currentItinerary.findIndex(day => 
      day.activities.some(a => a.id === activity.id)
    );
    if (dayIndex >= 0) {
      setSelectedDay(currentItinerary[dayIndex].day);
    }
    
    setEditingActivityId(activity.id);
    setNewActivity({
      name: activity.name,
      type: activity.type,
      location: typeof activity.location === 'string' ? activity.location : activity.location?.name || '',
      time: activity.time,
      duration: activity.duration.toString(),
      cost: activity.cost?.toString() || '',
      description: activity.description || '',
    });
    setShowAddActivity(true);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!trip) {
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    // Tìm activity để hiển thị tên trong confirmation
    const currentItinerary = getItinerary();
    let activityName = 'hoạt động này';
    for (const day of currentItinerary) {
      const activity = day.activities.find(a => a.id === activityId);
      if (activity) {
        activityName = activity.name;
        break;
      }
    }

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa "${activityName}"?`,
      'Xóa hoạt động',
      'danger'
    );
    
    if (!confirmed) return;
    
    await performDeleteActivity(activityId);
  };

  const performDeleteActivity = async (activityId: string) => {
    if (!trip) return;

    try {
      const currentItinerary = getItinerary();
      const updatedItinerary = currentItinerary.map(day => ({
        ...day,
        activities: day.activities.filter(a => a.id !== activityId),
      }));

      await updateItineraryMutation({
        tripId: trip._id as Id<'trips'>,
        itinerary: updatedItinerary,
      });

      showToast.success('Hoạt động đã được xóa khỏi lịch trình');
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      showToast.error(error?.message || 'Không thể xóa hoạt động. Vui lòng thử lại.');
    }
  };


  return (
    <View style={styles.container}>
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
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeader}>
              <Text style={styles.sectionTitle}>Lịch trình</Text>
              <TouchableOpacity
                style={styles.addActivityButton}
                onPress={() => {
                  setEditingActivityId(null);
                  setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
                  setSelectedDay(itinerary.length > 0 ? itinerary[0].day : 1);
                  setShowAddActivity(true);
                }}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addActivityButtonText}>Thêm hoạt động</Text>
              </TouchableOpacity>
            </View>
            <DayTimeline 
              days={itinerary}
              onActivityEdit={handleEditActivity}
              onActivityDelete={handleDeleteActivity}
            />
          </View>

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
          tripId={normalizedTripId as Id<'trips'>}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            // Refresh bookings list will happen automatically via Convex subscription
            setShowBookingModal(false);
          }}
        />
      )}

      {/* Modal chỉnh sửa chuyến đi */}
      <Modal
        visible={showEditTrip}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditTrip(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa chuyến đi</Text>
              <TouchableOpacity
                onPress={() => setShowEditTrip(false)}
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
                onPress={() => setShowEditTrip(false)}
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

      {/* Add/Edit Activity Modal */}
      <Modal
        visible={showAddActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddActivity(false);
          setEditingActivityId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingActivityId ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddActivity(false);
                  setEditingActivityId(null);
                  setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chọn ngày</Text>
                <View style={styles.daySelector}>
                  {itinerary.map((day) => (
                    <TouchableOpacity
                      key={day.day}
                      style={[
                        styles.daySelectorButton,
                        selectedDay === day.day && styles.daySelectorButtonActive,
                      ]}
                      onPress={() => setSelectedDay(day.day)}
                    >
                      <Text
                        style={[
                          styles.daySelectorText,
                          selectedDay === day.day && styles.daySelectorTextActive,
                        ]}
                      >
                        Ngày {day.day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên hoạt động</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Tham quan Bà Nà Hills"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.name}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Loại hoạt động</Text>
                <View style={styles.typeSelector}>
                  {activityTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        newActivity.type === type.id && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewActivity(prev => ({ ...prev, type: type.id }))}
                    >
                      <Text style={styles.typeButtonIcon}>{type.icon}</Text>
                      <Text
                        style={[
                          styles.typeButtonText,
                          newActivity.type === type.id && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa điểm</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Bà Nà Hills, Đà Nẵng"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.location}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, location: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thời gian</Text>
                <input
                  type="time"
                  style={styles.timeInput as any}
                  value={newActivity.time}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thời lượng (phút)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 120"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.duration}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, duration: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chi phí (VND) - Tùy chọn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 500000"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.cost}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, cost: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mô tả - Tùy chọn</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Thêm mô tả về hoạt động..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.description}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddActivity(false);
                  setEditingActivityId(null);
                  setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
                }}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, isAddingActivity && styles.modalButtonDisabled]}
                onPress={handleAddActivity}
                disabled={isAddingActivity}
              >
                {isAddingActivity ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {editingActivityId ? 'Cập nhật' : 'Thêm'}
                  </Text>
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
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          transform: 'translateY(-1px)',
          ...SHADOWS.lg,
        },
        ':active': {
          transform: 'translateY(0)',
        },
      },
    }),
  },
  addBookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
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
    ...SHADOWS.lg,
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
  timelineContainer: {
    marginBottom: 32,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addActivityButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  daySelectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  daySelectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  daySelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  daySelectorTextActive: {
    color: COLORS.white,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  typeButtonIcon: {
    fontSize: 20,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  timeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

