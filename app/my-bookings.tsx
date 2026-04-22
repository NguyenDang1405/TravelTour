import React from 'react';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import MyBookingsMobile from './my-bookings.mobile';
import MyBookingsWeb from './my-bookings.web';

export default function MyBookingsScreen() {
  const { user } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );

  // Get user bookings
  const bookings = useQuery(
    api.bookings.getUserBookings,
    convexUser ? { userId: convexUser._id } : 'skip'
  );

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <MyBookingsWeb bookings={bookings || []} />;
  }

  return <MyBookingsMobile bookings={bookings || []} />;
}

