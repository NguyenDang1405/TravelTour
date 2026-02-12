import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import LocationPicker from './location-picker';

interface BookingModalProps {
  visible: boolean;
  tripId?: Id<'trips'>; // Optional - có thể không chọn trip
  onClose: () => void;
  onSuccess?: () => void;
}

interface Location {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function BookingModal({ visible, tripId: initialTripId, onClose, onSuccess }: BookingModalProps) {
  const { user: clerkUser } = useUser();
  const [bookingType, setBookingType] = useState<'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'>('hotel');
  const [location, setLocation] = useState<Location>({ name: '', address: '', coordinates: { lat: 0, lng: 0 } });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<Id<'trips'> | null>(initialTripId || null);
  const [showTripSelector, setShowTripSelector] = useState(false);
  
  // Date picker states
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [showGuestsPicker, setShowGuestsPicker] = useState(false);
  
  // Date objects for pickers
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);

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

  // Get selected trip data to pre-fill location
  const selectedTrip = useQuery(
    api.trips.getTrip,
    selectedTripId ? { tripId: selectedTripId } : 'skip'
  );

  // Mutations
  const createBooking = useMutation(api.bookings.createBooking);

  // Initialize selectedTripId from props
  useEffect(() => {
    if (initialTripId) {
      setSelectedTripId(initialTripId);
    }
  }, [initialTripId]);

  // Pre-fill location from selected trip destination
  useEffect(() => {
    if (selectedTrip && selectedTrip.destination && !location.name) {
      setLocation({
        name: selectedTrip.destination,
        address: `${selectedTrip.destination}, Việt Nam`,
        coordinates: { lat: 0, lng: 0 }
      });
    }
  }, [selectedTrip]);

  // Helper function to format date for display
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper function to format date for storage (YYYY-MM-DD)
  const formatDateForStorage = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Handle check-in date change
  const handleCheckInDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCheckInPicker(false);
      if (event.type === 'dismissed') {
        return;
      }
    } else {
      // iOS: keep picker open until user confirms
      if (event.type === 'dismissed') {
        setShowCheckInPicker(false);
        return;
      }
    }
    if (selectedDate) {
      const dateStr = formatDateForStorage(selectedDate);
      setCheckIn(dateStr);
      setCheckInDate(selectedDate);
      // If check-out is before check-in, clear it
      if (checkOutDate && selectedDate > checkOutDate) {
        setCheckOut('');
        setCheckOutDate(null);
      }
      if (Platform.OS === 'ios') {
        setShowCheckInPicker(false);
      }
    }
  };

  // Handle check-out date change
  const handleCheckOutDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCheckOutPicker(false);
      if (event.type === 'dismissed') {
        return;
      }
    } else {
      // iOS: keep picker open until user confirms
      if (event.type === 'dismissed') {
        setShowCheckOutPicker(false);
        return;
      }
    }
    if (selectedDate) {
      const dateStr = formatDateForStorage(selectedDate);
      setCheckOut(dateStr);
      setCheckOutDate(selectedDate);
      if (Platform.OS === 'ios') {
        setShowCheckOutPicker(false);
      }
    }
  };

  const bookingTypes = [
    { id: 'hotel', name: 'Khách sạn', icon: '🏨' },
    { id: 'flight', name: 'Chuyến bay', icon: '✈️' },
    { id: 'attraction', name: 'Điểm tham quan', icon: '🏛️' },
    { id: 'restaurant', name: 'Nhà hàng', icon: '🍽️' },
    { id: 'transport', name: 'Vận chuyển', icon: '🚗' },
  ];

  const handleSubmit = async () => {
    // Validation
    if (!location.name || !location.address) {
      Alert.alert('Lỗi', 'Vui lòng chọn địa điểm');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên dịch vụ');
      return;
    }

    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ');
      return;
    }

    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tiếp tục');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData: any = {
        userId: convexUser._id,
        type: bookingType,
        provider: 'manual',
        externalId: `manual_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        location: {
          name: location.name,
          address: location.address,
          coordinates: location.coordinates,
        },
        checkIn: checkIn.trim() || undefined,
        checkOut: checkOut.trim() || undefined,
        guests: guests.trim() ? parseInt(guests) : undefined,
        price: parseFloat(price),
        currency: 'VND',
      };

      // Only add tripId if a trip is selected
      if (selectedTripId) {
        bookingData.tripId = selectedTripId;
      }

      await createBooking(bookingData);
      
      Alert.alert('Thành công', 'Đặt chỗ đã được tạo thành công!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setName('');
            setDescription('');
            setPrice('');
            setCheckIn('');
            setCheckOut('');
            setGuests('');
            setLocation({ name: '', address: '', coordinates: { lat: 0, lng: 0 } });
            // Keep selectedTripId if it was set from props, otherwise reset
            if (!initialTripId) {
              setSelectedTripId(null);
            }
            onClose();
            if (onSuccess) {
              onSuccess();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo đặt chỗ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      transparent={Platform.OS === 'web'}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <Text style={styles.cancelButton}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Đặt chỗ mới</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Trip Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn chuyến đi (tùy chọn)</Text>
            <TouchableOpacity
              style={styles.tripSelector}
              onPress={() => setShowTripSelector(!showTripSelector)}
            >
              <View style={styles.tripSelectorContent}>
                <Ionicons name="airplane" size={20} color={COLORS.primary} />
                <Text style={styles.tripSelectorText}>
                  {selectedTripId && selectedTrip
                    ? selectedTrip.title
                    : 'Không chọn chuyến đi'}
                </Text>
              </View>
              <Ionicons
                name={showTripSelector ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {/* Trip List Dropdown */}
            {showTripSelector && trips && trips.length > 0 && (
              <View style={styles.tripListContainer}>
                <TouchableOpacity
                  style={[
                    styles.tripOption,
                    !selectedTripId && styles.tripOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTripId(null);
                    setShowTripSelector(false);
                    setLocation({ name: '', address: '', coordinates: { lat: 0, lng: 0 } });
                  }}
                >
                  <Text style={[
                    styles.tripOptionText,
                    !selectedTripId && styles.tripOptionTextSelected
                  ]}>
                    Không chọn chuyến đi
                  </Text>
                </TouchableOpacity>
                {trips.map((trip) => (
                  <TouchableOpacity
                    key={trip._id}
                    style={[
                      styles.tripOption,
                      selectedTripId === trip._id && styles.tripOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedTripId(trip._id);
                      setShowTripSelector(false);
                      // Pre-fill location from trip destination
                      if (trip.destination) {
                        setLocation({
                          name: trip.destination,
                          address: `${trip.destination}, Việt Nam`,
                          coordinates: { lat: 0, lng: 0 }
                        });
                      }
                    }}
                  >
                    <View style={styles.tripOptionContent}>
                      <Ionicons name="airplane" size={18} color={selectedTripId === trip._id ? COLORS.primary : COLORS.textSecondary} />
                      <View style={styles.tripOptionTextContainer}>
                        <Text style={[
                          styles.tripOptionText,
                          selectedTripId === trip._id && styles.tripOptionTextSelected
                        ]}>
                          {trip.title}
                        </Text>
                        <Text style={styles.tripOptionSubtext}>
                          {trip.destination} • {new Date(trip.startDate).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>
                    {selectedTripId === trip._id && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showTripSelector && (!trips || trips.length === 0) && (
              <View style={styles.tripListContainer}>
                <Text style={styles.noTripsText}>
                  Bạn chưa có chuyến đi nào. Tạo chuyến đi mới trong tab Planning.
                </Text>
              </View>
            )}
          </View>

          {/* Booking Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loại dịch vụ</Text>
            <View style={styles.typeGrid}>
              {bookingTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    bookingType === type.id && styles.typeButtonSelected,
                  ]}
                  onPress={() => setBookingType(type.id as any)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text
                    style={[
                      styles.typeName,
                      bookingType === type.id && styles.typeNameSelected,
                    ]}
                  >
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Picker */}
          <View style={styles.section}>
            <LocationPicker
              value={location}
              onChange={setLocation}
              label="Địa điểm"
              placeholder="Chọn địa điểm"
            />
          </View>

          {/* Service Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tên dịch vụ *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Khách sạn InterContinental Đà Nẵng"
              value={name}
              onChangeText={setName}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả thêm về dịch vụ (tùy chọn)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giá (VND) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập giá"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Check-in/Check-out (for hotels) */}
          {bookingType === 'hotel' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ngày nhận phòng</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (e.target.value) {
                        setCheckInDate(new Date(e.target.value + 'T00:00:00'));
                      }
                      if (checkOut && e.target.value > checkOut) {
                        setCheckOut('');
                        setCheckOutDate(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowCheckInPicker(true)}
                    >
                      <Text style={[styles.datePickerText, !checkIn && { color: COLORS.textTertiary }]}>
                        {checkIn ? formatDateForDisplay(checkIn) : 'DD/MM/YYYY'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showCheckInPicker && (
                      <DateTimePicker
                        value={checkInDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={handleCheckInDateChange}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ngày trả phòng</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={checkOut}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setCheckOut(e.target.value);
                      if (e.target.value) {
                        setCheckOutDate(new Date(e.target.value + 'T00:00:00'));
                      }
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowCheckOutPicker(true)}
                    >
                      <Text style={[styles.datePickerText, !checkOut && { color: COLORS.textTertiary }]}>
                        {checkOut ? formatDateForDisplay(checkOut) : 'DD/MM/YYYY'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showCheckOutPicker && (
                      <DateTimePicker
                        value={checkOutDate || (checkInDate || new Date())}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={checkInDate || new Date()}
                        onChange={handleCheckOutDateChange}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Số khách</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="number"
                    min="1"
                    max="20"
                    style={styles.numberInput as any}
                    value={guests}
                    placeholder="Số lượng khách"
                    onChange={(e) => setGuests(e.target.value)}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowGuestsPicker(true)}
                    >
                      <Text style={[styles.datePickerText, !guests && { color: COLORS.textTertiary }]}>
                        {guests ? `${guests} khách` : 'Chọn số khách'}
                      </Text>
                      <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showGuestsPicker && (
                      <Modal
                        visible={showGuestsPicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowGuestsPicker(false)}
                      >
                        <View style={styles.pickerModalOverlay}>
                          <View style={styles.pickerModalContent}>
                            <View style={styles.pickerModalHeader}>
                              <Text style={styles.pickerModalTitle}>Chọn số khách</Text>
                              <TouchableOpacity onPress={() => setShowGuestsPicker(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                              </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerModalList}>
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                                <TouchableOpacity
                                  key={num}
                                  style={[
                                    styles.pickerModalItem,
                                    guests === String(num) && styles.pickerModalItemSelected
                                  ]}
                                  onPress={() => {
                                    setGuests(String(num));
                                    setShowGuestsPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerModalItemText,
                                    guests === String(num) && styles.pickerModalItemTextSelected
                                  ]}>
                                    {num} {num === 1 ? 'khách' : 'khách'}
                                  </Text>
                                  {guests === String(num) && (
                                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        </View>
                      </Modal>
                    )}
                  </>
                )}
              </View>
            </>
          )}

          {/* Flight specific fields */}
          {bookingType === 'flight' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ngày khởi hành</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    style={styles.dateInput as any}
                    value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (e.target.value) {
                        setCheckInDate(new Date(e.target.value + 'T00:00:00'));
                      }
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowCheckInPicker(true)}
                    >
                      <Text style={[styles.datePickerText, !checkIn && { color: COLORS.textTertiary }]}>
                        {checkIn ? formatDateForDisplay(checkIn) : 'DD/MM/YYYY'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showCheckInPicker && (
                      <DateTimePicker
                        value={checkInDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={handleCheckInDateChange}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Số hành khách</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="number"
                    min="1"
                    max="20"
                    style={styles.numberInput as any}
                    value={guests}
                    placeholder="Số lượng hành khách"
                    onChange={(e) => setGuests(e.target.value)}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowGuestsPicker(true)}
                    >
                      <Text style={[styles.datePickerText, !guests && { color: COLORS.textTertiary }]}>
                        {guests ? `${guests} hành khách` : 'Chọn số hành khách'}
                      </Text>
                      <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showGuestsPicker && (
                      <Modal
                        visible={showGuestsPicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowGuestsPicker(false)}
                      >
                        <View style={styles.pickerModalOverlay}>
                          <View style={styles.pickerModalContent}>
                            <View style={styles.pickerModalHeader}>
                              <Text style={styles.pickerModalTitle}>Chọn số hành khách</Text>
                              <TouchableOpacity onPress={() => setShowGuestsPicker(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                              </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerModalList}>
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                                <TouchableOpacity
                                  key={num}
                                  style={[
                                    styles.pickerModalItem,
                                    guests === String(num) && styles.pickerModalItemSelected
                                  ]}
                                  onPress={() => {
                                    setGuests(String(num));
                                    setShowGuestsPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerModalItemText,
                                    guests === String(num) && styles.pickerModalItemTextSelected
                                  ]}>
                                    {num} {num === 1 ? 'hành khách' : 'hành khách'}
                                  </Text>
                                  {guests === String(num) && (
                                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        </View>
                      </Modal>
                    )}
                  </>
                )}
              </View>
            </>
          )}

          {/* Date for attractions/restaurants */}
          {(bookingType === 'attraction' || bookingType === 'restaurant') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ngày</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={styles.dateInput as any}
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    if (e.target.value) {
                      setCheckInDate(new Date(e.target.value + 'T00:00:00'));
                    }
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowCheckInPicker(true)}
                  >
                    <Text style={[styles.datePickerText, !checkIn && { color: COLORS.textTertiary }]}>
                      {checkIn ? formatDateForDisplay(checkIn) : 'DD/MM/YYYY'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {showCheckInPicker && (
                    <DateTimePicker
                      value={checkInDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={handleCheckInDateChange}
                    />
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Tạo đặt chỗ</Text>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...(Platform.select({
      web: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        flex: 1,
      }
    }) as any),
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...(Platform.select({
      web: {
        flex: 'none',
        height: '90%',
        width: '33.33%',
        minWidth: 500,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      },
    }) as any),
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
  },
  section: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.sm,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
        },
      },
    }) as any),
  },
  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeNameSelected: {
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        outline: 'none',
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }) as any),
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  tripSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
        },
      },
    }) as any),
  },
  tripSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  tripSelectorText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  tripListContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    ...SHADOWS.md,
  },
  tripOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }) as any),
  },
  tripOptionSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  tripOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  tripOptionTextContainer: {
    flex: 1,
  },
  tripOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  tripOptionTextSelected: {
    color: COLORS.primary,
  },
  tripOptionSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  noTripsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    textAlign: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...(Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
        },
      },
    }) as any),
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  dateInput: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'inherit',
    ...(Platform.select({
      web: {
        outline: 'none',
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }) as any),
  },
  numberInput: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'inherit',
    ...(Platform.select({
      web: {
        outline: 'none',
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }) as any),
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
    ...SHADOWS.lg,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  pickerModalList: {
    maxHeight: 400,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerModalItemSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  pickerModalItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  pickerModalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
