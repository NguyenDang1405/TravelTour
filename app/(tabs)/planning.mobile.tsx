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
import type { UserResource as User } from '@clerk/types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface PlanningMobileProps {
  user: User | null | undefined;
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

export default function PlanningMobile({ user, convexUser }: PlanningMobileProps) {
  const { currentTrip, setTrips, setCurrentTrip, updateTrip } = useTripStore();
  
  // Convex mutations
  const createTripMutation = useMutation(api.trips.createTrip);
  const updateTripMutation = useMutation(api.trips.updateTrip);
  const deleteTripMutation = useMutation(api.trips.deleteTrip);
  const updateItineraryMutation = useMutation(api.trips.updateItinerary);
  const shareTripMutation = useMutation(api.trips.shareTrip);
  const deleteBookingMutation = useMutation(api.bookings.deleteBooking);
  
  // Query lại convexUser nếu chưa có (fallback)
  const { user: clerkUser } = useUser();
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    (clerkUser?.id && !convexUser) ? { clerkId: clerkUser.id } : "skip"
  );
  
  // Ưu tiên dùng convexUser từ props, nếu không có thì dùng từ query
  const finalConvexUser = convexUser || convexUserFromQuery;
  const finalUser = user || clerkUser;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 PlanningMobile - User state:', {
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

  // Transform bookings for display
  const transformedBookings = React.useMemo(() => {
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

  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  
  // Date/Time picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editTrip, setEditTrip] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'attraction' as Activity['type'],
    location: '',
    time: '',
    duration: '',
    cost: '',
    description: '',
  });

  // Tính toán itinerary từ currentTrip
  const getItinerary = (): DayPlan[] => {
    if (!currentTrip || !currentTrip.itinerary || currentTrip.itinerary.length === 0) {
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
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    if (!newTrip.budget || parseFloat(newTrip.budget) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngân sách hợp lệ');
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
      Alert.alert(
        'Lỗi', 
        'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại hoặc đợi vài giây để hệ thống đồng bộ.'
      );
      return;
    }

    try {
      setIsCreatingTrip(true);
      
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
      
      setShowCreateTrip(false);
      setNewTrip({ title: '', destination: '', startDate: '', endDate: '', budget: '' });
      
      // Real-time subscription will update trips list, and useEffect will set the new trip as currentTrip
      Alert.alert('Thành công', 'Chuyến đi đã được tạo');
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
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleAddActivity = async () => {
    if (!currentTrip) {
      Alert.alert('Lỗi', 'Vui lòng chọn chuyến đi trước');
      return;
    }

    // Validation
    if (!selectedDay) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày');
      return;
    }
    if (!newActivity.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hoạt động');
      return;
    }
    if (!newActivity.location.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa điểm');
      return;
    }
    if (!newActivity.time.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời gian');
      return;
    }
    if (!newActivity.duration || parseInt(newActivity.duration) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời lượng hợp lệ');
      return;
    }

    try {
      setIsAddingActivity(true);

      // Lấy itinerary hiện tại
      const currentItinerary = getItinerary();
      
      // Tìm day được chọn
      const selectedDayData = currentItinerary.find(d => d.day === selectedDay);
      if (!selectedDayData) {
        Alert.alert('Lỗi', 'Không tìm thấy ngày được chọn');
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

      // Update itinerary trong Convex
      await updateItineraryMutation({
        tripId: currentTrip._id as Id<'trips'>,
        itinerary: updatedItinerary,
      });

      // Reset form
      setShowAddActivity(false);
      setNewActivity({ name: '', type: 'attraction', location: '', time: '', duration: '', cost: '', description: '' });
      // Keep selectedDay so user can add more activities to the same day
      
      Alert.alert('Thành công', 'Hoạt động đã được thêm vào lịch trình');
      // Itinerary sẽ được update tự động qua real-time subscription
    } catch (error) {
      console.error('Error adding activity:', error);
      Alert.alert('Lỗi', 'Không thể thêm hoạt động. Vui lòng thử lại.');
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

  const handleEditTrip = async () => {
    if (!currentTrip) {
      Alert.alert('Lỗi', 'Không tìm thấy chuyến đi');
      return;
    }

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
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    if (!editTrip.budget || parseFloat(editTrip.budget) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngân sách hợp lệ');
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
      Alert.alert('Thành công', 'Chuyến đi đã được cập nhật');
    } catch (error: any) {
      console.error('❌ Error updating trip:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật chuyến đi. Vui lòng thử lại.');
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
      
      Alert.alert('Thành công', 'Chuyến đi và tất cả bookings liên quan đã được xóa');
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
      Alert.alert('Lỗi', error?.message || 'Không thể xóa chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTrip = async (tripToDelete?: any, skipConfirmation = false) => {
    console.log('🔍 handleDeleteTrip called with:', tripToDelete, 'skipConfirmation:', skipConfirmation);
    const trip = tripToDelete || currentTrip;
    
    if (!trip) {
      console.error('❌ No trip found to delete');
      Alert.alert('Lỗi', 'Không tìm thấy chuyến đi');
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

    // Trên web, sử dụng window.confirm để đảm bảo hoạt động đúng
    if ((Platform as any).OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn xóa "${trip.title}"? Hành động này không thể hoàn tác.`
      );
      if (confirmed) {
        console.log('✅ User confirmed deletion');
        await performDelete(trip);
      } else {
        console.log('❌ Delete cancelled by user');
      }
    } else {
      // Trên mobile, sử dụng window.alert
      Alert.alert(
        'Xóa chuyến đi',
        `Bạn có chắc chắn muốn xóa "${trip.title}"? Hành động này không thể hoàn tác.`,
        [
          { 
            text: 'Hủy', 
            style: 'cancel',
            onPress: () => console.log('❌ Delete cancelled by user')
          },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => performDelete(trip),
          },
        ]
      );
    }
  };

  const handleDeleteBooking = async (booking: any) => {
    Alert.alert(
      'Xóa đặt chỗ',
      `Bạn có chắc chắn muốn xóa đặt chỗ "${booking.name}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBookingMutation({ bookingId: booking.id as Id<'bookings'> });
              // Danh sách bookings và budget sẽ tự động cập nhật nhờ Convex real-time subscription
              Alert.alert('Thành công', 'Đã xóa đặt chỗ thành công. Ngân sách đã được cập nhật.');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa đặt chỗ. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleShareTrip = async () => {
    if (!currentTrip) {
      Alert.alert('Lỗi', 'Không tìm thấy chuyến đi');
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
          Alert.alert('Thành công', 'Đã sao chép link chia sẻ vào clipboard!');
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
          Alert.alert('Thành công', `Link chia sẻ: ${shareLink}\n\n(Vui lòng sao chép link này)`);
        }
      } else {
        Alert.alert('Thành công', `Link chia sẻ: ${shareLink}`);
      }
    } catch (error: any) {
      console.error('❌ Error sharing trip:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể chia sẻ chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="calendar" size={28} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.title}>Lập kế hoạch</Text>
            <Text style={styles.subtitle}>
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
        // Trip list - show when no trip is selected
        <View style={styles.tripsListContainer}>
          <View style={styles.tripsListHeader}>
            <View>
              <Text style={styles.tripsListTitle}>Chuyến đi của bạn</Text>
              <Text style={styles.tripsListSubtitle}>Chọn một chuyến đi để xem và chỉnh sửa chi tiết</Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {trips.map((trip) => (
              <TouchableOpacity
                key={trip._id}
                style={styles.tripCard}
                onPress={(e) => {
                  // Prevent selection if delete button was clicked
                  if ((e.target as any)?.closest?.('[data-delete-button]')) {
                    return;
                  }
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
          </ScrollView>
        </View>
      ) : (
        // Trip details view
        <View style={styles.tripDetailsContainer}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Back to list button */}
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
                    
                    // Trên web, sử dụng window.confirm để đảm bảo hoạt động đúng
                    if ((Platform as any).OS === 'web' && typeof window !== 'undefined') {
                      const confirmed = window.confirm(
                        `Bạn có chắc chắn muốn xóa "${activityName}"?`
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
                        Alert.alert('Thành công! Hoạt động đã được xóa khỏi lịch trình.');
                        // Itinerary sẽ được update tự động qua real-time subscription
                      } catch (error: any) {
                        console.error('❌ Error deleting activity:', error);
                        console.error('❌ Error details:', {
                          message: error?.message,
                          stack: error?.stack,
                          activityId,
                          tripId: currentTrip._id,
                        });
                        Alert.alert('Lỗi: ' + (error?.message || 'Không thể xóa hoạt động. Vui lòng thử lại.'));
                      }
                    } else {
                      // Trên mobile, sử dụng window.alert
                      Alert.alert(
                        'Xóa hoạt động',
                        `Bạn có chắc chắn muốn xóa "${activityName}"?`,
                        [
                          { 
                            text: 'Hủy', 
                            style: 'cancel',
                            onPress: () => console.log('❌ Activity delete cancelled')
                          },
                          {
                            text: 'Xóa',
                            style: 'destructive',
                            onPress: async () => {
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
                                Alert.alert('Thành công', 'Hoạt động đã được xóa khỏi lịch trình');
                                // Itinerary sẽ được update tự động qua real-time subscription
                              } catch (error: any) {
                                console.error('❌ Error deleting activity:', error);
                                console.error('❌ Error details:', {
                                  message: error?.message,
                                  stack: error?.stack,
                                  activityId,
                                  tripId: currentTrip._id,
                                });
                                Alert.alert('Lỗi', error?.message || 'Không thể xóa hoạt động. Vui lòng thử lại.');
                              }
                            },
                          },
                        ]
                      );
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
          </ScrollView>

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

      {/* Create Trip Modal */}
      <Modal visible={showCreateTrip} animationType="slide" transparent={(Platform as any).OS === 'web'} presentationStyle={(Platform as any).OS === 'web' ? undefined : "pageSheet"}>
        {(Platform as any).OS === 'web' ? (
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
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={newTrip.startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewTrip(prev => ({ ...prev, startDate: value }));
                      if (value && newTrip.endDate && value > newTrip.endDate) {
                        setNewTrip(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={newTrip.endDate}
                    min={newTrip.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewTrip(prev => ({ ...prev, endDate: e.target.value }))}
                  />
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
        ) : (
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
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, !newTrip.startDate && { color: COLORS.textSecondary }]}>
                    {newTrip.startDate 
                      ? new Date(newTrip.startDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={newTrip.startDate ? new Date(newTrip.startDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display={(Platform as any).OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker((Platform as any).OS === 'ios');
                      if (selectedDate) {
                        const dateStr = selectedDate.toISOString().split('T')[0];
                        setNewTrip(prev => ({ ...prev, startDate: dateStr }));
                        if (newTrip.endDate && dateStr > newTrip.endDate) {
                          setNewTrip(prev => ({ ...prev, endDate: '' }));
                        }
                      }
                    }}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, !newTrip.endDate && { color: COLORS.textSecondary }]}>
                    {newTrip.endDate 
                      ? new Date(newTrip.endDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={newTrip.endDate ? new Date(newTrip.endDate + 'T00:00:00') : (newTrip.startDate ? new Date(newTrip.startDate + 'T00:00:00') : new Date())}
                    mode="date"
                    display={(Platform as any).OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={newTrip.startDate ? new Date(newTrip.startDate + 'T00:00:00') : new Date()}
                    onChange={(event, selectedDate) => {
                      setShowEndDatePicker((Platform as any).OS === 'ios');
                      if (selectedDate) {
                        setNewTrip(prev => ({ ...prev, endDate: selectedDate.toISOString().split('T')[0] }));
                      }
                    }}
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
        )}
      </Modal>

      {/* Add Activity Modal */}
      <Modal visible={showAddActivity} animationType="slide" transparent={(Platform as any).OS === 'web'} presentationStyle={(Platform as any).OS === 'web' ? undefined : "pageSheet"}>
        {(Platform as any).OS === 'web' ? (
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
                  {(Platform as any).OS === 'web' ? (
                    <input
                      type="time"
                      style={styles.timeInput as any}
                      value={newActivity.time}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={[styles.datePickerText, !newActivity.time && { color: COLORS.textSecondary }]}>
                          {newActivity.time || 'HH:MM'}
                        </Text>
                        <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      {showTimePicker && (
                        <DateTimePicker
                          value={newActivity.time 
                            ? (() => {
                                const [hours, minutes] = newActivity.time.split(':');
                                const date = new Date();
                                date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
                                return date;
                              })()
                            : new Date()}
                          mode="time"
                          display={(Platform as any).OS === 'ios' ? 'spinner' : 'default'}
                          is24Hour={true}
                          onChange={(event, selectedTime) => {
                            setShowTimePicker((Platform as any).OS === 'ios');
                            if (selectedTime) {
                              const hours = selectedTime.getHours().toString().padStart(2, '0');
                              const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                              setNewActivity(prev => ({ ...prev, time: `${hours}:${minutes}` }));
                            }
                          }}
                        />
                      )}
                    </>
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
        ) : (
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
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 14:00"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newActivity.time}
                  onChangeText={(text) => setNewActivity(prev => ({ ...prev, time: text }))}
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
        )}
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

      {/* Edit Trip Modal */}
      <Modal visible={showEditTrip} animationType="slide" transparent={(Platform as any).OS === 'web'} presentationStyle={(Platform as any).OS === 'web' ? undefined : "pageSheet"}>
        {(Platform as any).OS === 'web' ? (
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
            </View>
          </View>
        ) : (
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
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowEditStartDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, !editTrip.startDate && { color: COLORS.textSecondary }]}>
                    {editTrip.startDate 
                      ? new Date(editTrip.startDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showEditStartDatePicker && (
                  <DateTimePicker
                    value={editTrip.startDate ? new Date(editTrip.startDate + 'T00:00:00') : new Date()}
                    mode="date"
                    display={(Platform as any).OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowEditStartDatePicker((Platform as any).OS === 'ios');
                      if (selectedDate) {
                        const dateStr = selectedDate.toISOString().split('T')[0];
                        setEditTrip(prev => ({ ...prev, startDate: dateStr }));
                        if (editTrip.endDate && dateStr > editTrip.endDate) {
                          setEditTrip(prev => ({ ...prev, endDate: '' }));
                        }
                      }
                    }}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowEditEndDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, !editTrip.endDate && { color: COLORS.textSecondary }]}>
                    {editTrip.endDate 
                      ? new Date(editTrip.endDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showEditEndDatePicker && (
                  <DateTimePicker
                    value={editTrip.endDate ? new Date(editTrip.endDate + 'T00:00:00') : (editTrip.startDate ? new Date(editTrip.startDate + 'T00:00:00') : new Date())}
                    mode="date"
                    display={(Platform as any).OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={editTrip.startDate ? new Date(editTrip.startDate + 'T00:00:00') : new Date()}
                    onChange={(event, selectedDate) => {
                      setShowEditEndDatePicker((Platform as any).OS === 'ios');
                      if (selectedDate) {
                        setEditTrip(prev => ({ ...prev, endDate: selectedDate.toISOString().split('T')[0] }));
                      }
                    }}
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
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: (Platform as any).OS === 'web' ? 40 : 20,
    paddingTop: (Platform as any).OS === 'web' ? 40 : 60,
    paddingBottom: (Platform as any).OS === 'web' ? 32 : 20,
    marginBottom: (Platform as any).OS === 'web' ? 32 : 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: (Platform as any).OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: (Platform as any).OS === 'web' ? 15 : 14,
    color: COLORS.textSecondary,
    marginTop: (Platform as any).OS === 'web' ? 0 : 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: (Platform as any).OS === 'web' ? SPACING.lg : 12,
    paddingVertical: (Platform as any).OS === 'web' ? SPACING.md : 8,
    borderRadius: (Platform as any).OS === 'web' ? RADIUS.md : 8,
    gap: (Platform as any).OS === 'web' ? SPACING.sm : 6,
    ...(Platform as any).OS === 'web' ? SHADOWS.sm : {},
    ...Platform.select({
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
    }),
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: (Platform as any).OS === 'web' ? 15 : 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: (Platform as any).OS === 'web' ? 0 : SPACING.md,
    paddingBottom: SPACING.xl,
  },
  tripInfoContainer: {
    marginBottom: SPACING.lg,
  },
  tripInfo: {
    backgroundColor: COLORS.surface,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripInfoContent: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tripBudget: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayTabs: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  dayTab: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: COLORS.primary,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayTabTextActive: {
    color: COLORS.white,
  },
  dayTabDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayTabDateActive: {
    color: COLORS.white,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addActivityText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  activityLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  activityDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: (Platform as any).OS === 'web' ? 16 : 0,
    width: (Platform as any).OS === 'web' ? '90%' : '100%',
    maxWidth: (Platform as any).OS === 'web' ? 600 : undefined,
    maxHeight: (Platform as any).OS === 'web' ? '90%' : '100%',
    flex: (Platform as any).OS === 'web' ? 0 : 1,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  dateInput: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    
    
    
    
    minHeight: 48,
    lineHeight: 20,
  },
  timeInput: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    
    
    
    
    minHeight: 48,
    lineHeight: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: (Platform as any).OS === 'web' ? 24 : 20,
    paddingTop: (Platform as any).OS === 'web' ? 24 : 60,
    paddingBottom: (Platform as any).OS === 'web' ? 20 : 20,
    borderBottomWidth: 1,
    borderBottomColor: (Platform as any).OS === 'web' ? COLORS.surfaceLight : COLORS.surface,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalTitle: {
    fontSize: (Platform as any).OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: (Platform as any).OS === 'web' ? 24 : 20,
    paddingTop: (Platform as any).OS === 'web' ? 24 : 20,
    paddingBottom: (Platform as any).OS === 'web' ? 32 : 20,
  },
  inputGroup: {
    marginBottom: (Platform as any).OS === 'web' ? 24 : 20,
  },
  inputLabel: {
    fontSize: (Platform as any).OS === 'web' ? 15 : 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: (Platform as any).OS === 'web' ? 10 : 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        
        
        
        
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput2: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    
    
    
    
    minHeight: 48,
    lineHeight: 20,
  },
  timeInput2: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'solid',
    width: '100%',
    
    
    
    
    minHeight: 48,
    lineHeight: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  typeTextActive: {
    color: COLORS.white,
  },
  tripActionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  deleteTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteTripButtonText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 14,
  },
  tripDetailsContainer: {
    flex: 1,
    position: 'relative',
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
    paddingHorizontal: (Platform as any).OS === 'web' ? 0 : SPACING.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: (Platform as any).OS === 'web' ? 0 : SPACING.md,
  },
  timelineTitle: {
    fontSize: (Platform as any).OS === 'web' ? 22 : 20,
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
    minHeight: 40,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.primary + '25',
        },
      },
    }),
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
  datePickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  tripsListContainer: {
    flex: 1,
    paddingHorizontal: (Platform as any).OS === 'web' ? 0 : 20,
    paddingTop: (Platform as any).OS === 'web' ? 0 : 20,
    marginTop: (Platform as any).OS === 'web' ? SPACING.lg : 0,
  },
  tripsListHeader: {
    marginBottom: (Platform as any).OS === 'web' ? SPACING.xl : SPACING.lg,
  },
  tripsListTitle: {
    fontSize: (Platform as any).OS === 'web' ? 28 : 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: (Platform as any).OS === 'web' ? -0.5 : 0,
  },
  tripsListSubtitle: {
    fontSize: (Platform as any).OS === 'web' ? 15 : 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: (Platform as any).OS === 'web' ? SPACING.xl : SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
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
    }),
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
  tripCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  deleteButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  backToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: (Platform as any).OS === 'web' ? SPACING.sm : 8,
    marginBottom: (Platform as any).OS === 'web' ? SPACING.xl : 20,
    paddingVertical: (Platform as any).OS === 'web' ? SPACING.md : 8,
    paddingHorizontal: (Platform as any).OS === 'web' ? SPACING.lg : 12,
    alignSelf: 'flex-start',
    backgroundColor: (Platform as any).OS === 'web' ? COLORS.surface : 'transparent',
    borderRadius: (Platform as any).OS === 'web' ? RADIUS.lg : 0,
    borderWidth: (Platform as any).OS === 'web' ? 1 : 0,
    borderColor: (Platform as any).OS === 'web' ? COLORS.border : 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '05',
          transform: 'translateX(-4px)',
        },
      },
    }),
  },
  backToListText: {
    fontSize: (Platform as any).OS === 'web' ? 15 : 16,
    fontWeight: '600',
    color: COLORS.primary,
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

