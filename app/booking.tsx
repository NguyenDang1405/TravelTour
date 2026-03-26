import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking, Platform, ActivityIndicator } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTripStore } from '@/store/useTripStore';

interface BookingItem {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant';
  location: string;
  price: number;
  image: string;
  description: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  // Additional fields from API
  coordinates?: { lat: number; lng: number };
  address?: string;
  rating?: number;
  provider?: string;
  externalId?: string;
  images?: string[];
  amenities?: string[];
  [key: string]: any; // Allow additional fields from API
}

function firstParam(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    itemId?: string;
    itemType?: string;
    location?: string;
    name?: string;
    price?: string;
    image?: string;
    description?: string;
    rating?: string;
  }>();
  const { user: clerkUser } = useUser();
  const { currentTrip } = useTripStore();
  const [selectedItems, setSelectedItems] = useState<BookingItem[]>([]);
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'bank'>('vnpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Get params from URL
  const itemId = firstParam(params.itemId);
  const itemType = (firstParam(params.itemType) || 'hotel') as 'hotel' | 'flight' | 'attraction' | 'restaurant';
  const locationParam = firstParam(params.location);
  const nameParam = firstParam(params.name);
  const priceParam = firstParam(params.price);
  const imageParam = firstParam(params.image);
  const descParam = firstParam(params.description);
  const ratingParam = firstParam(params.rating);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  // Mutations and actions
  const createBooking = useMutation(api.bookings.createBooking);
  const createPayment = useMutation(api.payments.createPayment);
  const generateVNPayUrl = useAction(api.paymentsActions.generateVNPayUrl);
  const getItemDetails = useAction(api.items.getItemDetails);

  // Helper function to get type icon
  const getTypeIcon = (type: BookingItem['type']) => {
    switch (type) {
      case 'hotel': return '🏨';
      case 'flight': return '✈️';
      case 'attraction': return '🏛️';
      case 'restaurant': return '🍽️';
      default: return '📍';
    }
  };

  // Mock booking items
  const mockBookingItems: BookingItem[] = [
    {
      id: '1',
      name: 'Khách sạn InterContinental Đà Nẵng',
      type: 'hotel',
      location: 'Đà Nẵng',
      price: 2500000,
      image: '🏨',
      description: 'Khách sạn 5 sao với view biển tuyệt đẹp',
      checkIn: '15/01/2024',
      checkOut: '17/01/2024',
      guests: 2,
    },
    {
      id: '2',
      name: 'Vé máy bay VietJet',
      type: 'flight',
      location: 'Hà Nội - Đà Nẵng',
      price: 1200000,
      image: '✈️',
      description: 'Chuyến bay khứ hồi Hà Nội - Đà Nẵng',
    },
    {
      id: '3',
      name: 'Bà Nà Hills',
      type: 'attraction',
      location: 'Đà Nẵng',
      price: 800000,
      image: '🏰',
      description: 'Khu du lịch trên núi với cầu Vàng nổi tiếng',
    },
    {
      id: '4',
      name: 'Nhà hàng Hải Sản Mỹ Khê',
      type: 'restaurant',
      location: 'Đà Nẵng',
      price: 500000,
      image: '🦐',
      description: 'Hải sản tươi ngon với view biển',
    },
  ];

  // Pre-fill customer info from user
  useEffect(() => {
    if (convexUser && clerkUser) {
      setCustomerInfo(prev => ({
        ...prev,
        name: prev.name || convexUser.name || clerkUser.fullName || '',
        email: prev.email || convexUser.email || clerkUser.primaryEmailAddress?.emailAddress || '',
      }));
    }
  }, [convexUser, clerkUser]);

  // Fetch item details from API if itemId is provided
  useEffect(() => {
    const fetchItemFromAPI = async () => {
      if (!itemId || !itemType) {
        // No itemId provided, use mock items
        setBookingItems(mockBookingItems);
        return;
      }

      setIsLoadingItem(true);
      try {
        console.log(`[Booking] 🔍 Fetching item details:`, {
          itemId,
          itemType,
          location: locationParam || 'Đà Nẵng',
        });
        
        const itemData = await getItemDetails({
          itemId,
          itemType,
          location: locationParam || 'Đà Nẵng',
        });

        // Log raw itemData from API to verify name and price
        console.log(`[Booking] 📦 Raw itemData from API:`, {
          id: itemData.id,
          name: itemData.name,
          price: itemData.price,
          priceType: typeof itemData.price,
          location: itemData.location,
          provider: itemData.provider,
          externalId: itemData.externalId,
        });

        // Extract coordinates from various API formats
        let coordinates: { lat: number; lng: number } | undefined = undefined;
        if (itemData.coordinates) {
          // Direct coordinates object
          coordinates = itemData.coordinates;
        } else if (itemData.lat && itemData.lng) {
          // Separate lat/lng fields
          coordinates = { lat: itemData.lat, lng: itemData.lng };
        } else if (itemData.geoCode) {
          // Amadeus format: geoCode.latitude/longitude
          coordinates = {
            lat: itemData.geoCode.latitude || 0,
            lng: itemData.geoCode.longitude || 0,
          };
        } else if (itemData.geometry?.coordinates) {
          // GeoJSON format: geometry.coordinates[0] = lng, [1] = lat
          const [lng, lat] = itemData.geometry.coordinates;
          if (lat && lng) {
            coordinates = { lat, lng };
          }
        } else if (itemData.gps_coordinates) {
          // Some APIs use gps_coordinates
          coordinates = itemData.gps_coordinates;
        }

        // Transform API data to BookingItem format - preserve ALL data from API
        // Use unique ID to avoid conflicts with mock items
        
        // Ensure image is always a valid URL string
        let itemImage = itemData.image;
        if (!itemImage || typeof itemImage !== 'string') {
          // Try to get from images array
          if (Array.isArray(itemData.images) && itemData.images.length > 0) {
            itemImage = itemData.images[0];
          }
        }
        
        // If still no valid image, use fallback
        if (!itemImage || typeof itemImage !== 'string' || !itemImage.startsWith('http')) {
          itemImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=95&auto=format&fit=crop";
          console.log(`[Booking] ⚠️ No valid image found, using fallback for ${itemData.name}`);
        }
        
        // Ensure images array exists
        const itemImages = Array.isArray(itemData.images) && itemData.images.length > 0 
          ? itemData.images 
          : (itemImage ? [itemImage] : []);
        
        // CRITICAL: Preserve name and price EXACTLY from API - DO NOT transform or estimate
        // Name: Use exactly as from API
        const apiName = nameParam || itemData.name || 'Dịch vụ';
        console.log(`[Booking] 📝 Name:`, {
          fromAPI: itemData.name,
          fromParam: nameParam,
          preserved: apiName,
        });
        
        // Price: Convert to number but preserve the exact value from API
        const rawPrice = itemData.price;
        let apiPrice = (rawPrice !== null && rawPrice !== undefined && rawPrice !== '') 
          ? Number(rawPrice) 
          : 0;
          
        if (priceParam) {
          apiPrice = Number(priceParam);
        }
        
        console.log(`[Booking] 💰 Price:`, {
          fromAPI: rawPrice,
          fromParam: priceParam,
          parsed: apiPrice,
        });
        
        // Verify we're not changing the data
        if (apiName !== itemData.name) {
          console.error(`[Booking] ❌ ERROR: Name changed from "${itemData.name}" to "${apiName}"`);
        }
        if (rawPrice !== null && rawPrice !== undefined && apiPrice !== Number(rawPrice)) {
          console.error(`[Booking] ❌ ERROR: Price changed from ${rawPrice} to ${apiPrice}`);
        }
        
        const apiItem: BookingItem = {
          id: `api_${itemId}_${itemData.id || Date.now()}`, // Unique ID for API items
          name: apiName, // EXACT name from API or override
          type: itemType,
          location: itemData.location || itemData.address || locationParam || 'N/A',
          price: apiPrice, // EXACT price from API or override
          image: imageParam || itemImage, // Use param image if available
          description: descParam || itemData.description || 'Không có mô tả',
          checkIn: itemData.checkIn,
          checkOut: itemData.checkOut,
          guests: itemData.guests,
          // Preserve all additional data from API
          coordinates: coordinates,
          address: itemData.address || itemData.location,
          rating: ratingParam ? Number(ratingParam) : itemData.rating,
          provider: itemData.provider || 'api',
          externalId: itemData.externalId || itemData.id || itemId,
          images: itemImages, // Use validated images array
          amenities: itemData.amenities,
          // Store all other fields from API (preserve everything)
          ...Object.keys(itemData).reduce((acc, key) => {
            // Don't duplicate fields we've already extracted
            const excludedKeys = ['id', 'name', 'type', 'location', 'price', 'image', 'description', 'checkIn', 'checkOut', 'guests', 'coordinates', 'address', 'rating', 'provider', 'externalId', 'images', 'amenities', 'lat', 'lng', 'geoCode', 'geometry', 'gps_coordinates'];
            if (!excludedKeys.includes(key)) {
              acc[key] = itemData[key];
            }
            return acc;
          }, {} as any),
        };
        
        console.log(`[Booking] ✅ Transformed item with image: ${apiItem.image?.substring(0, 50)}...`);

        // Log to verify all data is captured - especially name and price
        console.log('[Booking] ✅ Fetched item from API:', {
          id: apiItem.id,
          name: apiItem.name,
          nameMatches: apiItem.name === itemData.name,
          price: apiItem.price,
          priceMatches: apiItem.price === apiPrice,
          priceFormatted: apiItem.price.toLocaleString('vi-VN') + ' VND',
          location: apiItem.location,
          coordinates: apiItem.coordinates,
          rating: apiItem.rating,
          provider: apiItem.provider,
        });
        
        // Verify name and price are preserved correctly
        if (apiItem.name !== itemData.name) {
          console.warn(`[Booking] ⚠️ WARNING: Name changed from "${itemData.name}" to "${apiItem.name}"`);
        }
        if (apiItem.price !== apiPrice) {
          console.warn(`[Booking] ⚠️ WARNING: Price changed from ${apiPrice} to ${apiItem.price}`);
        }

        // When booking from item-details, only show the selected service (no mock items)
        setBookingItems([apiItem]);
        setSelectedItems([apiItem]);
        
        // Log after setting state to verify price is preserved
        console.log('[Booking] ✅ Set booking items with price:', {
          bookingItemsCount: 1,
          selectedItemsCount: 1,
          price: apiItem.price,
        });
      } catch (error: any) {
        console.error('Error fetching item details:', error);
        const errorMessage = error?.message || 'Không thể tải thông tin dịch vụ';
        Alert.alert(
          'Lỗi', 
          `${errorMessage}. Vui lòng quay lại trang trước và thử lại.`,
          [
            {
              text: 'Quay lại',
              onPress: () => router.back(),
            },
            {
              text: 'OK',
            },
          ]
        );
        // Don't show mock items when there's an error - user should go back
        setBookingItems([]);
      } finally {
        setIsLoadingItem(false);
      }
    };

    fetchItemFromAPI();
  }, [itemId, itemType, locationParam, getItemDetails]);

  const paymentMethods = [
    { id: 'vnpay', name: 'VNPAY', icon: '💳', description: 'Thanh toán qua VNPAY' },
    { id: 'momo', name: 'MoMo', icon: '📱', description: 'Ví điện tử MoMo' },
    { id: 'bank', name: 'Chuyển khoản', icon: '🏦', description: 'Chuyển khoản ngân hàng' },
  ];

  const toggleItem = (item: BookingItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const getTotalPrice = () => {
    const total = selectedItems.reduce((total, item) => {
      console.log(`[Booking] 💰 Adding to total: ${item.name} = ${item.price} VND`);
      return total + item.price;
    }, 0);
    console.log(`[Booking] 💰 Total price calculated: ${total} VND`);
    return total;
  };

  const handlePayment = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một dịch vụ để đặt chỗ');
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin khách hàng');
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tiếp tục');
      return;
    }

    setIsProcessing(true);
    try {
      const totalPrice = getTotalPrice();
      
      // Log price information for debugging
      console.log('[Booking] 💰 Payment Processing:', {
        selectedItems: selectedItems.map(item => ({
          name: item.name,
          price: item.price,
          type: item.type,
        })),
        totalPrice,
        paymentMethod,
      });

      // Create bookings for each selected item
      const bookingIds: Id<'bookings'>[] = [];
      for (const item of selectedItems) {
        // Use actual data from API item if available
        const locationName = item.address || item.location.split(',')[0]?.trim() || item.location;
        const address = item.address || item.location;
        const coordinates = item.coordinates || { lat: 0, lng: 0 };

        // Build booking data using ALL information from API
        // Extract original ID from unique ID if needed (api_itemId_originalId -> originalId)
        const originalExternalId = item.externalId || (item.id.startsWith('api_') ? item.id.split('_').slice(2).join('_') : item.id);
        
        const bookingData: any = {
          userId: convexUser._id,
          type: item.type,
          provider: item.provider || 'api', // Use provider from API (not 'mock')
          externalId: originalExternalId, // Use original externalId from API
          name: item.name, // Actual name from API
          description: item.description, // Actual description from API
          location: {
            name: locationName, // Actual location name
            address: address, // Actual address from API
            coordinates: coordinates, // Use actual coordinates from API (not 0,0)
          },
          checkIn: item.checkIn, // Actual check-in time if available
          checkOut: item.checkOut, // Actual check-out time if available
          guests: item.guests, // Actual guests if available
          price: item.price, // Use actual price from API (not mock price)
          currency: 'VND',
        };

        // Log booking data to verify all information is correct
        console.log('[Booking] 📝 Creating booking with data:', {
          name: bookingData.name,
          price: bookingData.price,
          provider: bookingData.provider,
          externalId: bookingData.externalId,
          coordinates: bookingData.location.coordinates,
          location: bookingData.location,
        });

        // Only add tripId if currentTrip exists
        if (currentTrip?._id) {
          bookingData.tripId = currentTrip._id;
        }

        const bookingId = await createBooking(bookingData);
        bookingIds.push(bookingId);
      }

      // Create payment for the first booking (or combine all bookings)
      const mainBookingId = bookingIds[0];
      const orderId = `ORDER_${Date.now()}_${mainBookingId}`;
      
      console.log('[Booking] 💳 Creating payment:', {
        bookingId: mainBookingId,
        amount: totalPrice,
        currency: 'VND',
        paymentMethod,
        orderId,
      });
      
      const paymentId = await createPayment({
        bookingId: mainBookingId,
        userId: convexUser._id,
        amount: totalPrice,
        currency: 'VND',
        paymentMethod: paymentMethod,
        status: 'pending',
        externalTransactionId: orderId,
      });

      console.log('[Booking] ✅ Payment created:', { paymentId, amount: totalPrice });

      setShowPaymentModal(false);

      // Process payment based on method
      if (paymentMethod === 'vnpay') {
        // Generate VNPay URL and redirect
        const returnUrl = process.env.EXPO_PUBLIC_VNPAY_RETURN_URL || 
          (Platform.OS === 'web' 
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/payment-callback`
            : 'http://localhost:8081/payment-callback');
        
        console.log('[Booking] 🔗 Generating VNPay URL:', {
          paymentId,
          returnUrl,
          amount: totalPrice,
        });
        
        const result = await generateVNPayUrl({
          paymentId,
          returnUrl,
        });

        console.log('[Booking] ✅ VNPay URL generated:', {
          paymentUrl: result.paymentUrl?.substring(0, 100) + '...',
          transactionId: result.transactionId,
        });

        // Open VNPay payment page
        if (result.paymentUrl) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            console.log('[Booking] 🌐 Redirecting to VNPay...');
            window.location.href = result.paymentUrl;
          } else {
            console.log('[Booking] 📱 Opening VNPay URL...');
            await Linking.openURL(result.paymentUrl);
          }
        } else {
          throw new Error('Không thể tạo URL thanh toán VNPay');
        }
      } else if (paymentMethod === 'momo' || paymentMethod === 'bank') {
        // For MoMo and Bank Transfer, simulate success (mock)
        // For MoMo and Bank Transfer, update payment status to completed
        // Note: We need to use updatePaymentStatus mutation instead of createPayment
        // For now, we'll redirect to success page and the payment will be marked as completed
        // In production, you would call updatePaymentStatus mutation here
        
        router.push(`/payment-success?bookingId=${mainBookingId}&paymentId=${paymentId}&status=success`);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xử lý thanh toán. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };


  // TODO: Use this for booking type color coding
  // const getTypeColor = (type: BookingItem['type']) => {
  //   switch (type) {
  //     case 'hotel': return '#4ECDC4';
  //     case 'flight': return '#45B7D1';
  //     case 'attraction': return '#4ADE80';
  //     case 'restaurant': return '#FF6B6B';
  //     default: return COLORS.grey;
  //   }
  // };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Đặt chỗ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập họ và tên"
              value={customerInfo.name}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, name: text }))}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập email"
              value={customerInfo.email}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              value={customerInfo.phone}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ghi chú thêm (tùy chọn)"
              value={customerInfo.notes}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Booking Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {itemId ? 'Dịch vụ đặt chỗ' : 'Chọn dịch vụ đặt chỗ'}
          </Text>
          {isLoadingItem ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải thông tin dịch vụ...</Text>
            </View>
          ) : itemId ? (
            // When booking from item-details, only show the selected service
            bookingItems.length > 0 ? bookingItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}_${index}_${item.provider || 'default'}`}
                style={[
                  styles.bookingItem,
                  selectedItems.some(selected => selected.id === item.id) && styles.bookingItemSelected
                ]}
                onPress={() => toggleItem(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemIcon}>
                    <Text style={styles.itemEmoji}>{getTypeIcon(item.type)}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemLocation}>{item.location}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    {item.checkIn && (
                      <Text style={styles.itemDate}>
                        {item.checkIn} - {item.checkOut} • {item.guests} người
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemPrice}>
                      {item.price.toLocaleString('vi-VN')} VND
                    </Text>
                    <View style={[
                      styles.checkbox,
                      selectedItems.some(selected => selected.id === item.id) && styles.checkboxSelected
                    ]}>
                      {selectedItems.some(selected => selected.id === item.id) && (
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )) : null
          ) : (
            // When no itemId, show mock items for selection
            mockBookingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.bookingItem,
                  selectedItems.some(selected => selected.id === item.id) && styles.bookingItemSelected
                ]}
                onPress={() => toggleItem(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemIcon}>
                    <Text style={styles.itemEmoji}>{getTypeIcon(item.type)}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemLocation}>{item.location}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    {item.checkIn && (
                      <Text style={styles.itemDate}>
                        {item.checkIn} - {item.checkOut} • {item.guests} người
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemPrice}>
                      {item.price.toLocaleString('vi-VN')} VND
                    </Text>
                    <View style={[
                      styles.checkbox,
                      selectedItems.some(selected => selected.id === item.id) && styles.checkboxSelected
                    ]}>
                      {selectedItems.some(selected => selected.id === item.id) && (
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Summary */}
        {selectedItems.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Tổng cộng</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Số dịch vụ:</Text>
              <Text style={styles.summaryValue}>{selectedItems.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng tiền:</Text>
              <Text style={styles.summaryPrice}>
                {getTotalPrice().toLocaleString('vi-VN')} VND
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.paymentButton,
            selectedItems.length === 0 && styles.paymentButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={selectedItems.length === 0}
        >
          <Text style={styles.paymentButtonText}>
            Thanh toán {getTotalPrice().toLocaleString('vi-VN')} VND
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.paymentMethods}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method.id && styles.paymentMethodSelected
                  ]}
                  onPress={() => setPaymentMethod(method.id as any)}
                >
                  <View style={styles.paymentMethodLeft}>
                    <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                    <View>
                      <Text style={styles.paymentMethodName}>{method.name}</Text>
                      <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === method.id && styles.radioButtonSelected
                  ]}>
                    {paymentMethod === method.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryTitle}>Tóm tắt thanh toán</Text>
              {selectedItems.map((item) => (
                <View key={item.id} style={styles.paymentItem}>
                  <Text style={styles.paymentItemName}>{item.name}</Text>
                  <Text style={styles.paymentItemPrice}>
                    {item.price.toLocaleString('vi-VN')} VND
                  </Text>
                </View>
              ))}
              <View style={styles.paymentTotal}>
                <Text style={styles.paymentTotalLabel}>Tổng cộng:</Text>
                <Text style={styles.paymentTotalPrice}>
                  {getTotalPrice().toLocaleString('vi-VN')} VND
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalBottom}>
            <TouchableOpacity style={styles.confirmButton} onPress={processPayment}>
              <Text style={styles.confirmButtonText}>Xác nhận thanh toán</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'web' ? SPACING.lg : 60,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  backButton: {
    padding: SPACING.xs,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          opacity: 0.7,
        },
      },
    }),
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
    ...Platform.select({
      web: {
        outline: 'none',
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
  bookingItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.md,
        },
      },
    }),
  },
  bookingItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
    ...SHADOWS.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  itemEmoji: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  itemLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  itemDescription: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.primary,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  summary: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  bottomContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
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
  paymentButtonDisabled: {
    backgroundColor: COLORS.greyLight,
    opacity: 0.6,
    ...SHADOWS.sm,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
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
  modalCancel: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  paymentMethods: {
    marginBottom: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
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
  paymentMethodSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
    ...SHADOWS.md,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.grey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  paymentSummary: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },
  paymentSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentItemName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  paymentItemPrice: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  paymentTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  paymentTotalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  modalBottom: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
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
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
