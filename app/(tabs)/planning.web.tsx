import BookingModal from '@/components/booking/booking-modal';
import BookingsList from '@/components/trip/bookings-list';
import BudgetBreakdown from '@/components/trip/budget-breakdown';
import DayTimeline, { Day } from '@/components/trip/day-timeline';
import TripHeader from '@/components/trip/trip-header';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { showToast, showConfirm } from '@/utils/toast';
import { Id } from '@/convex/_generated/dataModel';
import { useTripStore } from '@/store/useTripStore';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface PlanningWebProps {
  user: any;
  convexUser: any;
}

interface Activity {
  id: string;
  name: string;
  type: 'attraction' | 'restaurant' | 'hotel' | 'transport';
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  time: string;
  duration: number;
  cost?: number;
  description?: string;
}

interface DayPlan {
  day: number;
  date: string;
  activities: Activity[];
}

export default function PlanningWeb({ user, convexUser }: PlanningWebProps) {
  const router = useRouter();
  const segments = useSegments();
  const { currentTrip, setTrips, setCurrentTrip, addTrip, updateTrip } = useTripStore();
  
  // Convex mutations
  const createTripMutation = useMutation(api.trips.createTrip);
  const updateTripMutation = useMutation(api.trips.updateTrip);
  const deleteTripMutation = useMutation(api.trips.deleteTrip);
  const updateItineraryMutation = useMutation(api.trips.updateItinerary);
  const shareTripMutation = useMutation(api.trips.shareTrip);
  const deleteBookingMutation = useMutation(api.bookings.deleteBooking);
  
  // ALWAYS query convexUser from Convex to ensure we get the latest data (including avatar)
  const { user: clerkUser } = useUser();
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );
  
  // Always prioritize query result over props to ensure real-time updates
  const finalConvexUser = convexUserFromQuery || convexUser;
  const finalUser = user || clerkUser;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 PlanningWeb - User state:', {
      userFromProps: user,
      clerkUser,
      finalUser,
      convexUserFromProps: convexUser,
      convexUserFromQuery,
      finalConvexUser,
      hasFinalConvexUser: !!finalConvexUser,
      finalConvexUserId: finalConvexUser?._id,
    });
  }, [user, clerkUser, finalUser, convexUser, convexUserFromQuery, finalConvexUser]);
  
  // Load trips từ Convex
  const trips = useQuery(
    api.trips.getUserTrips,
    finalConvexUser?._id ? { userId: finalConvexUser._id } : "skip"
  );

  // Load bookings cho current trip
  const tripBookings = useQuery(
    api.bookings.getTripBookings,
    currentTrip?._id ? { tripId: currentTrip._id as Id<'trips'> } : "skip"
  );

  // Transform bookings for BookingsList component
  const transformedBookings = useMemo(() => {
    if (!tripBookings) return [];
    return tripBookings.map((booking) => ({
      id: booking._id,
      name: booking.name,
      type: booking.type as 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport',
      location: booking.location.name || booking.location.address,
      price: booking.price,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      paymentMethod: booking.paymentMethod,
      externalId: booking.externalId,
      description: booking.description,
      provider: booking.provider,
      image: booking.image,
    }));
  }, [tripBookings]);

  // Track the last created trip ID to auto-select it
  const [lastCreatedTripId, setLastCreatedTripId] = useState<Id<"trips"> | null>(null);

  // Update trips trong store khi có data mới
  useEffect(() => {
    if (trips) {
      console.log('📋 Trips updated from Convex:', trips.length, 'trips');
      setTrips(trips);
      
      // Only clear if currentTrip was deleted
      if (currentTrip && !trips.find(t => t._id === currentTrip._id)) {
        console.log('🔄 Current trip not found, clearing selection');
        setCurrentTrip(null);
      }
      
      // Reset lastCreatedTripId after trips are loaded
      if (lastCreatedTripId) {
        setLastCreatedTripId(null);
      }
    } else {
      console.log('⏳ Trips query is loading...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, lastCreatedTripId]);

  // Subscribe to currentTrip changes (real-time)
  const currentTripData = useQuery(
    api.trips.getTrip,
    currentTrip?._id ? { tripId: currentTrip._id as Id<'trips'> } : "skip"
  );

  // Update currentTrip trong store khi có update real-time
  useEffect(() => {
    if (currentTripData && currentTrip && currentTripData._id === currentTrip._id) {
      updateTrip(currentTrip._id, currentTripData);
      setCurrentTrip(currentTripData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTripData]);
  
  const currentRoute = segments[segments.length - 1] || 'planning';
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [editTrip, setEditTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'attraction' as Activity['type'],
    location: '',
    time: '',
    duration: '',
    cost: '',
    description: '',
  });

  // Bỏ border khi focus cho tất cả input trên web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.surfaceLight} !important;
          box-shadow: none !important;
        }
        input[type="text"]:focus,
        input[type="date"]:focus,
        input[type="time"]:focus,
        input[type="number"]:focus {
          outline: none !important;
          border-color: ${COLORS.surfaceLight} !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Tính toán itinerary từ currentTrip
  const getItinerary = (): DayPlan[] => {
    if (!currentTrip || !currentTrip.itinerary || currentTrip.itinerary.length === 0) {
      // Nếu chưa có itinerary, tạo từ startDate và endDate
      if (!currentTrip?.startDate || !currentTrip?.endDate) {
        return [];
      }
      
      const start = new Date(currentTrip.startDate);
      const end = new Date(currentTrip.endDate);
      const days: DayPlan[] = [];
      
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
    
    // Return itinerary từ currentTrip
    return currentTrip.itinerary as DayPlan[];
  };

  const itinerary = getItinerary();

  // Helper function to calculate budget breakdown
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

    const totalActual = Object.values(categories).reduce((sum, cat) => sum + cat.actual, 0);
    const totalBudget = trip?.budget || 0;
    
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

  // Calculate budget breakdown for current trip
  const budgetCategories = useMemo(() => {
    if (!currentTrip) return [];
    return calculateBudgetBreakdown(currentTrip, tripBookings || []);
  }, [currentTrip, tripBookings]);

  const totalSpent = useMemo(() => {
    return budgetCategories.reduce((sum, cat) => sum + cat.actual, 0);
  }, [budgetCategories]);

  // Transform itinerary for DayTimeline component
  const timelineDays = useMemo(() => {
    if (!currentTrip?.itinerary) return [];
    return currentTrip.itinerary as Day[];
  }, [currentTrip]);

  const activityTypes = [
    { id: 'attraction', name: 'Điểm tham quan', icon: '🏛️' },
    { id: 'restaurant', name: 'Nhà hàng', icon: '🍽️' },
    { id: 'hotel', name: 'Khách sạn', icon: '🏨' },
    { id: 'transport', name: 'Di chuyển', icon: '🚗' },
  ];

  const handleCreateTrip = async () => {
    // Debug logging
    console.log('🔍 Creating trip - Debug info:', {
      finalConvexUser,
      hasConvexUser: !!finalConvexUser,
      convexUserId: finalConvexUser?._id,
      finalUser,
      hasUser: !!finalUser,
      clerkId: finalUser?.id,
    });

    // Validation
    if (!newTrip.title.trim()) {
      showToast.warning('Vui lòng nhập tên chuyến đi');
      return;
    }
    if (!newTrip.destination.trim()) {
      showToast.warning('Vui lòng nhập điểm đến');
      return;
    }
    if (!newTrip.startDate) {
      showToast.warning('Vui lòng chọn ngày bắt đầu');
      return;
    }
    if (!newTrip.endDate) {
      showToast.warning('Vui lòng chọn ngày kết thúc');
      return;
    }
    if (new Date(newTrip.startDate) > new Date(newTrip.endDate)) {
      showToast.warning('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    if (!newTrip.budget || parseFloat(newTrip.budget) <= 0) {
      showToast.warning('Vui lòng nhập ngân sách hợp lệ');
      return;
    }
    if (!finalConvexUser?._id) {
      console.error('❌ ConvexUser is missing:', {
        finalConvexUser,
        finalUser,
        hasUser: !!finalUser,
        clerkId: finalUser?.id,
        convexUserFromProps: convexUser,
        convexUserFromQuery,
      });
      showToast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại hoặc đợi vài giây để hệ thống đồng bộ.');
      return;
    }

    try {
      setIsCreatingTrip(true);
      
      // Tạo itinerary rỗng cho các ngày
      const start = new Date(newTrip.startDate);
      const end = new Date(newTrip.endDate);
      const days: DayPlan[] = [];
      
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

      // Gọi mutation
      const tripId = await createTripMutation({
        userId: finalConvexUser._id,
        title: newTrip.title.trim(),
        destination: newTrip.destination.trim(),
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        budget: parseFloat(newTrip.budget),
      });

      console.log('✅ Trip created successfully!');
      console.log('📝 Trip ID:', tripId);
      console.log('👤 User ID:', finalConvexUser._id);
      console.log('📋 Trip data:', {
        title: newTrip.title.trim(),
        destination: newTrip.destination.trim(),
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        budget: parseFloat(newTrip.budget),
      });
      console.log('💡 Data được lưu vào Convex Database. Xem trong Convex Dashboard: https://dashboard.convex.dev/d/coordinated-bandicoot-468');

      // Set the tripId so useEffect can find and set it as currentTrip when trips updates
      setLastCreatedTripId(tripId);

      // Reset form
      setShowCreateTrip(false);
      setNewTrip({ title: '', destination: '', startDate: '', endDate: '', budget: '' });
      
      // Real-time subscription will update trips list, and useEffect will set the new trip as currentTrip
      showToast.success('Chuyến đi đã được tạo');
    } catch (error: any) {
      console.error('❌ Error creating trip:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        finalConvexUser: finalConvexUser,
        userId: finalConvexUser?._id,
      });
      
      // Hiển thị error message chi tiết hơn
      const errorMessage = error?.message || 'Không thể tạo chuyến đi. Vui lòng thử lại.';
      showToast.error(errorMessage);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleEditTrip = async () => {
    if (!currentTrip) {
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
        tripId: currentTrip._id as Id<'trips'>,
        title: editTrip.title.trim(),
        destination: editTrip.destination.trim(),
        startDate: editTrip.startDate,
        endDate: editTrip.endDate,
        budget: parseFloat(editTrip.budget),
      });

      console.log('✅ Trip updated successfully!');
      setShowEditTrip(false);
      window.alert('Thành công');
    } catch (error: any) {
      console.error('❌ Error updating trip:', error);
      window.alert('Lỗi');
    } finally {
      setIsEditingTrip(false);
    }
  };

  const performDelete = async (trip: any) => {
    try {
      setIsDeleting(true);
      
      // Log trip ID để debug
      console.log('🗑️ Starting deletion process...');
      console.log('🗑️ Trip ID:', trip._id);
      console.log('🗑️ Trip ID type:', typeof trip._id);
      console.log('🗑️ Trip ID length:', trip._id?.length);
      console.log('🗑️ Trip title:', trip.title);
      
      // Xóa trip từ database bằng ID
      console.log('🔄 Calling deleteTripMutation...');
      console.log('🔄 Mutation params:', { tripId: trip._id, tripIdType: typeof trip._id });
      
      if (!trip._id) {
        throw new Error('Trip ID is missing');
      }
      
      const result = await deleteTripMutation({ tripId: trip._id as Id<'trips'> });
      console.log('✅ Trip deleted successfully!', result);
      
      if (!result) {
        throw new Error('Delete mutation returned no result');
      }
      
      // Clear current trip if it was the deleted one
      if (currentTrip && currentTrip._id === trip._id) {
        console.log('🔄 Clearing current trip selection');
        setCurrentTrip(null);
      }
      
      // Đợi một chút để đảm bảo mutation hoàn tất
      await new Promise(resolve => setTimeout(resolve, 100));
      
      showToast.success('Chuyến đi và tất cả bookings liên quan đã được xóa');
      // Danh sách sẽ tự động reload nhờ real-time subscription của Convex
      console.log('✅ Delete completed, waiting for list to update...');
    } catch (error: any) {
      console.error('❌ Error deleting trip:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        tripId: trip._id,
        tripIdType: typeof trip._id,
        errorName: error?.name,
      });
      showToast.error(error?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTrip = async (tripToDelete?: any, skipConfirmation = false) => {
    console.log('🔍 handleDeleteTrip called with:', tripToDelete, 'skipConfirmation:', skipConfirmation);
    const trip = tripToDelete || currentTrip;
    
    if (!trip) {
      console.error('❌ No trip found to delete');
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    if (isDeleting) {
      console.log('⏳ Already deleting, skipping...');
      return; // Prevent multiple clicks
    }

    // Nếu skip confirmation, xóa trực tiếp
    if (skipConfirmation) {
      await performDelete(trip);
      return;
    }

    console.log('📋 Showing delete confirmation for trip:', trip.title, trip._id);

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa "${trip.title}"?\n\nHành động này không thể hoàn tác.`,
      'Xóa chuyến đi',
      'danger'
    );
    
    if (confirmed) {
      console.log('✅ User confirmed deletion');
      await performDelete(trip);
    } else {
      console.log('❌ Delete cancelled by user');
    }
  };

  const handleDeleteBooking = async (booking: any) => {
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa đặt chỗ "${booking.name}"?\n\nSố tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.price)} sẽ được cộng lại vào ngân sách.\n\nHành động này không thể hoàn tác.`,
      'Xóa đặt chỗ',
      'danger'
    );
    
    if (!confirmed) return;

    try {
      await deleteBookingMutation({ bookingId: booking.id as Id<'bookings'> });
      showToast.success('Đã xóa đặt chỗ thành công. Ngân sách đã được cập nhật.');
    } catch (error: any) {
      showToast.error(error.message || 'Không thể xóa đặt chỗ. Vui lòng thử lại.');
    }
  };

  const handleShareTrip = async () => {
    if (!currentTrip) {
      showToast.error('Không tìm thấy chuyến đi');
      return;
    }

    if (isSharing) {
      return; // Prevent multiple clicks
    }

    try {
      setIsSharing(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com';
      const shareLink = `${origin}/trip/${currentTrip._id}`;
      
      await shareTripMutation({ 
        tripId: currentTrip._id as Id<'trips'>,
        shareLink: shareLink
      });
      
      // Copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareLink);
          showToast.success('Đã sao chép link chia sẻ vào clipboard!');
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
          showToast.info(`Link chia sẻ: ${shareLink}\n\n(Vui lòng sao chép link này)`, 'Link chia sẻ');
        }
      } else {
        showToast.info(`Link chia sẻ: ${shareLink}`, 'Link chia sẻ');
      }
    } catch (error: any) {
      console.error('❌ Error sharing trip:', error);
      showToast.error(error?.message || 'Không thể chia sẻ chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleAddActivity = async () => {
    if (!currentTrip) {
      showToast.warning('Vui lòng chọn chuyến đi trước');
      return;
    }

    // Validation
    if (!selectedDay) {
      showToast.warning('Vui lòng chọn ngày');
      return;
    }
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

      // Tạo activity mới
        const newActivityData = {
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: newActivity.name.trim(),
          type: newActivity.type,
          location: {
            name: newActivity.location.trim(),
            address: newActivity.location.trim(),
            coordinates: { lat: 0, lng: 0 },
          },
          time: newActivity.time.trim(),
          duration: parseInt(newActivity.duration),
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          description: newActivity.description.trim() || undefined,
        };

      // Thêm activity vào day
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
        tripId: currentTrip._id as Id<'trips'>,
        itinerary: updatedItinerary as any,
      });

      // Reset form
      setShowAddActivity(false);
      setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
      // Keep selectedDay so user can add more activities to the same day
      
      showToast.success('Hoạt động đã được thêm vào lịch trình');
      // Itinerary sẽ được update tự động qua real-time subscription
    } catch (error) {
      console.error('Error adding activity:', error);
      showToast.error('Không thể thêm hoạt động. Vui lòng thử lại.');
    } finally {
      setIsAddingActivity(false);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    const activityType = activityTypes.find(t => t.id === type);
    return activityType?.icon || '📍';
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'attraction': return '#4ADE80';
      case 'restaurant': return '#FF6B6B';
      case 'hotel': return '#4ECDC4';
      case 'transport': return '#45B7D1';
      default: return COLORS.primary;
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity 
            style={styles.logo}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="airplane" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>TravelTour</Text>
          </TouchableOpacity>
          <View style={styles.navLinks}>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[
                styles.navLinkText,
                (currentRoute as any) === 'index' && styles.navLinkTextActive
              ]}>Trang chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'explore' && styles.navLinkTextActive
              ]}>Khám phá</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/planning')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'planning' && styles.navLinkTextActive
              ]}>Lịch trình</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/ai-chat')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'ai-chat' && styles.navLinkTextActive
              ]}>Travel Assistant</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/blog')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'blog' && styles.navLinkTextActive
              ]}>Blog</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity 
            style={styles.profileIconButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {(() => {
              const avatarUrl = finalConvexUser?.avatar || user?.imageUrl;
              return avatarUrl ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={styles.profileAvatar}
                    onError={(e) => {
                      console.error('❌ Error loading nav avatar:', e.nativeEvent.error);
                    }}
                  />
                  {currentRoute === 'profile' && <View style={styles.avatarActiveIndicator} />}
                </View>
              ) : (
                <View style={[
                  styles.profileAvatarPlaceholder,
                  currentRoute === 'profile' && styles.profileAvatarActive
                ]}>
                  <Ionicons 
                    name="person" 
                    size={22} 
                    color={currentRoute === 'profile' ? COLORS.white : COLORS.text} 
                  />
                </View>
              );
            })()}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 } as any}>
              <View style={{ backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 12 }}>
                <Ionicons name="calendar" size={28} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Lập kế hoạch</Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  {trips && trips.length > 0 ? `${trips.length} chuyến đi` : 'Quản lý lịch trình của bạn'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowCreateTrip(true)}
            >
              <Ionicons name="add-circle" size={22} color={COLORS.white} />
              <Text style={styles.createButtonText}>Tạo chuyến đi</Text>
            </TouchableOpacity>
          </View>

          {!trips || trips.length === 0 ? (
            // Empty state
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Chưa có chuyến đi nào</Text>
              <Text style={styles.emptySubtitle}>
                Tạo chuyến đi mới để bắt đầu lập kế hoạch hành trình của bạn
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => setShowCreateTrip(true)}
              >
                <Text style={styles.emptyButtonText}>Tạo chuyến đi đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : !currentTrip ? (
            // Trip list - always show list first
            <View style={styles.tripsListContainer}>
              <View style={styles.tripsListHeader}>
                <View>
                  <Text style={styles.tripsListTitle}>Chuyến đi của bạn</Text>
                  <Text style={styles.tripsListSubtitle}>Chọn một chuyến đi để xem và chỉnh sửa chi tiết</Text>
                </View>
              </View>
              <View style={styles.tripsGrid}>
                {trips.map((trip) => (
                  <TouchableOpacity
                    key={trip._id}
                    style={styles.tripCard}
                    onPress={(e) => {
                      // Prevent selection if delete button was clicked
                      if (e.target === e.currentTarget || (e.target as any)?.closest?.('[data-delete-button]')) {
                        return;
                      }
                      console.log('🔗 Selecting trip:', trip._id);
                      setCurrentTrip(trip);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tripCardHeader}>
                      <View style={styles.tripCardIconContainer}>
                        <Ionicons name="airplane" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.tripCardHeaderRight}>
                        <View style={[styles.tripCardStatus, { backgroundColor: trip.status === 'planning' ? COLORS.warning + '15' : trip.status === 'confirmed' ? COLORS.primary + '15' : COLORS.textSecondary + '15' }]}>
                          <View style={[styles.tripCardStatusDot, { backgroundColor: trip.status === 'planning' ? COLORS.warning : trip.status === 'confirmed' ? COLORS.primary : COLORS.textSecondary }]} />
                          <Text style={[styles.tripCardStatusText, { color: trip.status === 'planning' ? COLORS.warning : trip.status === 'confirmed' ? COLORS.primary : COLORS.textSecondary }]}>
                            {trip.status === 'planning' ? 'Đang lên kế hoạch' : trip.status === 'confirmed' ? 'Đã xác nhận' : trip.status}
                          </Text>
                        </View>
                        <TouchableOpacity
                          data-delete-button="true"
                          onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🗑️ Delete button clicked for trip:', trip._id, trip.title);
                            if (!isDeleting) {
                              handleDeleteTrip(trip);
                            }
                          }}
                          onPressIn={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onPressOut={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          style={styles.deleteButton}
                          disabled={isDeleting}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={isDeleting ? COLORS.textSecondary : "#FF6B6B"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.tripCardContent}>
                      <Text style={styles.tripCardTitle}>{trip.title}</Text>
                      <View style={styles.tripCardDestinationRow}>
                        <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.tripCardDestination}>{trip.destination}</Text>
                      </View>
                      <View style={styles.tripCardDateRow}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.tripCardDate}>
                          {new Date(trip.startDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} - {new Date(trip.endDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={styles.tripCardFooter}>
                        <View>
                          <Text style={styles.tripCardBudgetLabel}>Ngân sách</Text>
                          <Text style={styles.tripCardBudget}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.budget)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            // Trip details view
            <View style={styles.tripDetailsContainer}>
              {/* Back button */}
              <TouchableOpacity 
                style={styles.backToListButton}
                onPress={() => setCurrentTrip(null)}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backToListText}>Quay lại danh sách</Text>
              </TouchableOpacity>

              {/* Trip Header */}
              {currentTrip && (
                <>
                  <TripHeader {...({} as any)} 
                    title={currentTrip.title}
                    destination={currentTrip.destination}
                    startDate={currentTrip.startDate}
                    endDate={currentTrip.endDate}
                    budget={currentTrip.budget}
                    status={currentTrip.status}
                    onEdit={() => {
                      setEditTrip({
                        title: currentTrip.title,
                        destination: currentTrip.destination,
                        startDate: currentTrip.startDate,
                        endDate: currentTrip.endDate,
                        budget: currentTrip.budget.toString(),
                      });
                      setShowEditTrip(true);
                    }}
                    onDelete={isDeleting ? undefined : () => handleDeleteTrip(currentTrip)}
                    onShare={isSharing ? undefined : handleShareTrip}
                  />

                  {/* Day Timeline */}
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineTitle}>Lịch trình</Text>
                      <TouchableOpacity 
                        style={styles.addActivityHeaderButton}
                        onPress={() => {
                          // Set selected day to first day if not set
                          if (!selectedDay && timelineDays.length > 0) {
                            setSelectedDay(1);
                          }
                          setShowAddActivity(true);
                        }}
                      >
                        <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.addActivityHeaderText}>Thêm hoạt động</Text>
                      </TouchableOpacity>
                    </View>
                    <DayTimeline 
                      days={timelineDays}
                      onActivityDelete={async (activityId: string) => {
                        if (!currentTrip) {
                          console.warn('⚠️ Cannot delete activity: no current trip');
                          return;
                        }
                        
                        console.log('🗑️ Delete activity requested:', activityId);
                        
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
                        
                        if (!confirmed) {
                          console.log('❌ Activity delete cancelled');
                          return;
                        }

                        try {
                          console.log('🔄 Starting activity deletion...');
                          console.log('🔄 Activity ID:', activityId);
                          console.log('🔄 Trip ID:', currentTrip._id);
                          
                          const updatedItinerary = currentItinerary.map(day => ({
                            ...day,
                            activities: day.activities.filter(a => a.id !== activityId),
                          }));

                          console.log('🔄 Calling updateItineraryMutation...');
                          await updateItineraryMutation({
                            tripId: currentTrip._id as Id<'trips'>,
                            itinerary: updatedItinerary as any,
                          });
                          
                          console.log('✅ Activity deleted successfully!');
                          showToast.success('Hoạt động đã được xóa khỏi lịch trình');
                          // Itinerary sẽ được update tự động qua real-time subscription
                        } catch (error: any) {
                          console.error('❌ Error deleting activity:', error);
                          console.error('❌ Error details:', {
                            message: error?.message,
                            stack: error?.stack,
                            activityId,
                            tripId: currentTrip._id,
                          });
                          showToast.error(error?.message || 'Không thể xóa hoạt động. Vui lòng thử lại.');
                        }
                      }}
                      onActivityEdit={(activity) => {
                        // Set form data for editing
                        const dayIndex = timelineDays.findIndex(day => 
                          day.activities.some(a => a.id === activity.id)
                        );
                        if (dayIndex >= 0) {
                          setSelectedDay(timelineDays[dayIndex].day);
                        }
                        setNewActivity({
                          name: activity.name,
                          type: activity.type as Activity['type'],
                          location: typeof activity.location === 'string' ? activity.location : activity.location?.name || '',
                          time: activity.time,
                          duration: activity.duration.toString(),
                          cost: activity.cost?.toString() || '',
                          description: activity.description || '',
                        });
                        setShowAddActivity(true);
                        // TODO: Add edit mode state to track which activity is being edited
                      }}
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
                    totalBudget={currentTrip.budget}
                    totalSpent={totalSpent}
                    categories={budgetCategories}
                  />
                </>
              )}

              {/* Loading overlay for delete/share */}
              {(isDeleting || isSharing) && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>
                    {isDeleting ? 'Đang xóa...' : 'Đang chia sẻ...'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Trip Modal */}
      <Modal visible={showCreateTrip} animationType="slide" transparent={Platform.OS === 'web'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateTrip(false)}>
                <Text style={styles.modalCancel}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tạo chuyến đi mới</Text>
              <TouchableOpacity onPress={handleCreateTrip} disabled={isCreatingTrip}>
                <Text style={[styles.modalSave, isCreatingTrip && { opacity: 0.5 }]}>
                  {isCreatingTrip ? 'Đang tạo...' : 'Tạo'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên chuyến đi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Du lịch Đà Nẵng"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newTrip.title}
                  onChangeText={(text) => setNewTrip(prev => ({ ...prev, title: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Điểm đến</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Đà Nẵng"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newTrip.destination}
                  onChangeText={(text) => setNewTrip(prev => ({ ...prev, destination: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={newTrip.startDate}
                    min={today}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewTrip(prev => ({ ...prev, startDate: value }));
                      if (value && newTrip.endDate && value > newTrip.endDate) {
                        setNewTrip(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newTrip.startDate}
                    onChangeText={(text) => setNewTrip(prev => ({ ...prev, startDate: text }))}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={newTrip.endDate}
                    min={newTrip.startDate || today}
                    onChange={(e) => setNewTrip(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newTrip.endDate}
                    onChangeText={(text) => setNewTrip(prev => ({ ...prev, endDate: text }))}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngân sách (VND)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 5000000"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newTrip.budget}
                  onChangeText={(text) => setNewTrip(prev => ({ ...prev, budget: text }))}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal visible={showEditTrip} animationType="slide" transparent={Platform.OS === 'web'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditTrip(false)}>
                <Text style={styles.modalCancel}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chỉnh sửa chuyến đi</Text>
              <TouchableOpacity onPress={handleEditTrip} disabled={isEditingTrip}>
                <Text style={[styles.modalSave, isEditingTrip && { opacity: 0.5 }]}>
                  {isEditingTrip ? 'Đang lưu...' : 'Lưu'}
                </Text>
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
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={editTrip.startDate}
                    min={today}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditTrip(prev => ({ ...prev, startDate: value }));
                      if (value && editTrip.endDate && value > editTrip.endDate) {
                        setEditTrip(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textSecondary}
                    value={editTrip.startDate}
                    onChangeText={(text) => setEditTrip(prev => ({ ...prev, startDate: text }))}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={editTrip.endDate}
                    min={editTrip.startDate || today}
                    onChange={(e) => setEditTrip(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textSecondary}
                    value={editTrip.endDate}
                    onChangeText={(text) => setEditTrip(prev => ({ ...prev, endDate: text }))}
                  />
                )}
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
          </View>
        </View>
      </Modal>

      {/* Add Activity Modal */}
      <Modal visible={showAddActivity} animationType="slide" transparent={Platform.OS === 'web'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddActivity(false)}>
                <Text style={styles.modalCancel}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Thêm hoạt động</Text>
              <TouchableOpacity onPress={handleAddActivity} disabled={isAddingActivity}>
                <Text style={[styles.modalSave, isAddingActivity && { opacity: 0.5 }]}>
                  {isAddingActivity ? 'Đang thêm...' : 'Thêm'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chọn ngày</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                  {itinerary.map((day) => (
                    <TouchableOpacity
                      key={day.day}
                      style={[
                        styles.daySelectorOption,
                        selectedDay === day.day && styles.daySelectorOptionActive
                      ]}
                      onPress={() => setSelectedDay(day.day)}
                    >
                      <Text style={[
                        styles.daySelectorText,
                        selectedDay === day.day && styles.daySelectorTextActive
                      ]}>
                        Ngày {day.day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                        styles.typeOption,
                        newActivity.type === type.id && styles.typeOptionActive
                      ]}
                      onPress={() => setNewActivity(prev => ({ ...prev, type: type.id as Activity['type'] }))}
                    >
                      <Text style={styles.typeEmoji}>{type.icon}</Text>
                      <Text style={[
                        styles.typeText,
                        newActivity.type === type.id && styles.typeTextActive
                      ]}>
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
                  placeholder="Ví dụ: Bà Nà Hills"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.location}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, location: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thời gian</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="time"
                    style={styles.timeInput as any}
                    value={newActivity.time}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 14:00"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newActivity.time}
                    onChangeText={(text) => setNewActivity(prev => ({ ...prev, time: text }))}
                  />
                )}
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
                <Text style={styles.inputLabel}>Chi phí (VND)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 800000"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.cost}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, cost: text }))}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả chi tiết về hoạt động..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.description}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Booking Modal */}
      {currentTrip?._id && (
        <BookingModal
          visible={showBookingModal}
          tripId={currentTrip._id as Id<'trips'>}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            // Refresh bookings list will happen automatically via Convex subscription
            setShowBookingModal(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    ...SHADOWS.sm,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
      },
    }) as any),
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }) as any),
  },
  navLinkText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    ...(Platform.select({
      web: {
        transition: 'color 0.2s',
      },
    }) as any),
  },
  navLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileIconButton: {
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }) as any),
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
    ...(Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }) as any),
  },
  avatarActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileAvatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    width: 42,
    height: 42,
    borderRadius: 21,
    ...(Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }) as any),
  },
  profileAvatarActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          transform: 'translateY(-1px)',
          ...SHADOWS.md,
        },
        ':active': {
          transform: 'translateY(0)',
        },
      },
    }) as any),
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 400,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: '#0C94C7',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
        },
      },
    }) as any),
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  tripInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.lg,
          transform: 'translateY(-2px)',
        },
      },
    }) as any),
  },
  tripInfoContent: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  tripDate: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tripBudget: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayTabs: {
    marginBottom: 24,
  },
  dayTab: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
          borderColor: COLORS.primaryLight,
        },
      },
    }) as any),
  },
  dayTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  dayTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayTabTextActive: {
    color: COLORS.white,
  },
  dayTabDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dayTabDateActive: {
    color: COLORS.white,
  },
  activitiesContainer: {
    marginBottom: 40,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activitiesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
      },
    }) as any),
  },
  addActivityText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    ...(Platform.select({
      web: {
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.md,
          transform: 'translateY(-2px)',
        },
      },
    }) as any),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  activityLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  activityCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  activityDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
      },
    }) as any),
  },
  actionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }) as any),
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    ...(Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
    }) as any),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
      },
    }) as any),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    ...(Platform.select({
      web: {
        cursor: 'pointer',
      },
    }) as any),
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        outline: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }) as any),
  },
  dateInput: {
    backgroundColor: COLORS.surface,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    height: 52,
    lineHeight: 20,
  },
  timeInput: {
    backgroundColor: COLORS.surface,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    height: 52,
    lineHeight: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
        },
      },
    }) as any),
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeEmoji: {
    fontSize: 18,
  },
  typeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  typeTextActive: {
    color: COLORS.white,
  },
  tripInfoContainer: {
    marginBottom: SPACING.lg,
  },
  editTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }) as any),
  },
  editTripButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  bookingsSection: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  tripDetailsContainer: {
    width: '100%',
    position: 'relative',
  },
  backToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '05',
          transform: 'translateX(-4px)',
        },
      },
    }) as any),
  },
  backToListText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tripsListContainer: {
    marginTop: SPACING.lg,
  },
  tripsListHeader: {
    marginBottom: SPACING.xl,
  },
  tripsListTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  tripsListSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tripsGrid: {
    display: "flex",
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: SPACING.xl,
    ...(Platform.select({
      web: {},
      default: {
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
    }) as any),
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          borderColor: COLORS.primary,
          transform: 'translateY(-6px) scale(1.01)',
          ...SHADOWS.lg,
          boxShadow: `0 16px 32px ${COLORS.primary}20`,
        },
      },
    }) as any),
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  tripCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: '#FF6B6B' + '15',
        },
      },
    }) as any),
  },
  tripCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '25',
  },
  tripCardContent: {
    gap: SPACING.md,
  },
  tripCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  tripCardDestinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tripCardDestination: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tripCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  tripCardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  tripCardBudgetLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  tripCardBudget: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  tripCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  tripCardStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tripCardStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    borderRadius: RADIUS.xl,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  timelineContainer: {
    marginBottom: SPACING.xl,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  timelineTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addActivityHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.primary + '25',
        },
      },
    }) as any),
  },
  addActivityHeaderText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  daySelector: {
    marginTop: SPACING.xs,
  },
  daySelectorOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
        },
      },
    }) as any),
  },
  daySelectorOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  daySelectorText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  daySelectorTextActive: {
    color: COLORS.white,
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
    ...(Platform.select({
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
    }) as any),
  },
  addBookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});

