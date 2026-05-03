import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import PaymentSuccessMobile from './payment-success.mobile';
import PaymentSuccessWeb from './payment-success.web';

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{ 
    bookingId?: string; 
    paymentId?: string;
    status?: string;
  }>();
  
  const bookingId = params.bookingId || '';
  const paymentId = params.paymentId || '';
  const status = params.status || 'success';

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <PaymentSuccessWeb bookingId={bookingId} paymentId={paymentId} status={status} />;
  }

  return <PaymentSuccessMobile bookingId={bookingId} paymentId={paymentId} status={status} />;
}

