import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function PaymentCallbackMobile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý thanh toán...');
  const verifyCallback = useAction(api.paymentsActions.verifyVNPayCallback);

  useEffect(() => {
    const processPayment = async () => {
      // VNPay sẽ redirect về với các query params
      const responseCode = params.vnp_ResponseCode as string;
      const transactionStatus = params.vnp_TransactionStatus as string;
      const txnRef = params.vnp_TxnRef as string;
      const amount = params.vnp_Amount as string;
      const secureHash = params.vnp_SecureHash as string;
      const orderInfo = params.vnp_OrderInfo as string;

      if (!responseCode || !transactionStatus || !txnRef) {
        setStatus('error');
        setMessage('Thiếu thông tin thanh toán. Vui lòng thử lại.');
        setTimeout(() => {
          router.replace('/booking');
        }, 3000);
        return;
      }

      try {
        // Verify payment with Convex
        const result = await verifyCallback({
          vnp_ResponseCode: responseCode,
          vnp_TransactionStatus: transactionStatus,
          vnp_TxnRef: txnRef,
          vnp_Amount: amount || '0',
          vnp_SecureHash: secureHash || '',
          vnp_OrderInfo: orderInfo || '',
        });

        if (result.success && result.status === 'completed') {
          setStatus('success');
          setMessage('Thanh toán thành công!');
          
          setTimeout(() => {
            router.replace({
              pathname: '/payment-success',
              params: {
                bookingId: txnRef,
                paymentId: txnRef,
                status: 'success',
                amount: amount ? (parseInt(amount) / 100).toString() : '0',
              },
            });
          }, 1500);
        } else {
          setStatus('error');
          setMessage(getErrorMessage(responseCode || '99'));
          
          setTimeout(() => {
            router.replace({
              pathname: '/booking',
              params: {
                error: 'payment_failed',
                message: getErrorMessage(responseCode || '99'),
              },
            });
          }, 3000);
        }
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setMessage(error.message || 'Lỗi xử lý thanh toán. Vui lòng thử lại.');
        
        setTimeout(() => {
          router.replace({
            pathname: '/booking',
            params: {
              error: 'payment_failed',
              message: error.message || 'Lỗi xử lý thanh toán',
            },
          });
        }, 3000);
      }
    };

    processPayment();
  }, [params, router, verifyCallback]);

  const getErrorMessage = (code: string): string => {
    const errorMessages: Record<string, string> = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ.',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
      '12': 'Thẻ/Tài khoản bị khóa.',
      '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
      '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Lỗi không xác định.',
    };
    return errorMessages[code] || 'Thanh toán thất bại. Vui lòng thử lại.';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.title}>Thanh toán thành công!</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>Đang chuyển hướng...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <Text style={styles.title}>Thanh toán thất bại</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>Đang chuyển hướng...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});

