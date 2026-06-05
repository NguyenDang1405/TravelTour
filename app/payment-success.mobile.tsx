import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import SuccessIcon from '@/components/payment/success-icon';
import BookingSummary from '@/components/payment/booking-summary';
import NavigationActions from '@/components/payment/navigation-actions';

interface PaymentSuccessMobileProps {
  bookingId: string;
  paymentId: string;
  status: string;
}

// Mock booking data
const getMockBookingData = (bookingId: string) => {
  return {
    bookingId: bookingId || 'BK' + Date.now().toString().slice(-8),
    items: [
      {
        id: '1',
        name: 'InterContinental Đà Nẵng',
        type: 'hotel' as const,
        location: 'Đà Nẵng, Việt Nam',
        price: 2500000,
        quantity: 2,
        checkIn: '15/01/2024',
        checkOut: '17/01/2024',
        guests: 2,
      },
    ],
    subtotal: 5000000,
    taxes: 500000,
    fees: 200000,
    discount: 0,
    total: 5700000,
    paymentMethod: 'VNPay',
    paymentId: 'VN' + Date.now().toString().slice(-10),
    bookingDate: new Date().toISOString(),
  };
};

export default function PaymentSuccessMobile({
  bookingId,
  paymentId,
  status,
}: PaymentSuccessMobileProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Load real booking and payment data from Convex
  const booking = useQuery(
    api.bookings.getBooking,
    bookingId ? { bookingId: bookingId as Id<'bookings'> } : 'skip'
  );

  const payment = useQuery(
    api.payments.getPayment,
    paymentId ? { paymentId: paymentId as Id<'payments'> } : 'skip'
  );

  useEffect(() => {
    if (booking !== undefined && payment !== undefined) {
      setIsLoading(false);
    }
  }, [booking, payment]);

  // Transform booking data for BookingSummary component
  const bookingData = booking ? {
    bookingId: booking._id,
    items: [{
      id: booking._id,
      name: booking.name,
      type: booking.type,
      location: booking.location.name,
      price: booking.price,
      quantity: booking.guests || 1,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
    }],
    subtotal: booking.price,
    taxes: 0,
    fees: 0,
    discount: 0,
    total: booking.price,
    paymentMethod: payment?.paymentMethod || 'VNPay',
    paymentId: payment?._id || paymentId,
    bookingDate: new Date(booking.createdAt).toISOString(),
  } : getMockBookingData(bookingId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status !== 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán thất bại</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={80} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Thanh toán không thành công</Text>
          <Text style={styles.errorMessage}>
            Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
          </Text>
          <NavigationActions />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>Thanh toán thành công</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.successSection}>
            <SuccessIcon size={100} animated={true} />
            <Text style={styles.successTitle}>Đặt chỗ thành công!</Text>
            <Text style={styles.successMessage}>
              Chúng tôi đã gửi email xác nhận đến bạn. Vui lòng kiểm tra email.
            </Text>
          </View>

          {/* Booking Summary */}
          <BookingSummary
            bookingId={bookingData.bookingId}
            items={bookingData.items}
            subtotal={bookingData.subtotal}
            taxes={bookingData.taxes}
            fees={bookingData.fees}
            discount={bookingData.discount}
            total={bookingData.total}
            paymentMethod={bookingData.paymentMethod}
            paymentId={paymentId || bookingData.paymentId}
            bookingDate={bookingData.bookingDate}
          />

          {/* Navigation Actions */}
          <NavigationActions tripId={booking?.tripId || undefined} />
        </View>
      </ScrollView>
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
  successSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

