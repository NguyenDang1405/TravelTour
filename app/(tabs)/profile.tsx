import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import React from 'react';
import { Platform } from 'react-native';
import { api } from '@/convex/_generated/api';
import ProfileMobile from './profile.mobile';
import ProfileWeb from './profile.web';

export default function ProfileScreen() {
  const { user } = useUser();

  // Lấy user data từ Convex
  const convexUser = useQuery(api.users.getUser, 
    user ? { clerkId: user.id } : "skip"
  );

  // Lấy trips của user
  const userTrips = useQuery(api.trips.getUserTrips, 
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <ProfileWeb user={user} convexUser={convexUser} trips={userTrips || []} />;
  }

  return <ProfileMobile user={user} convexUser={convexUser} trips={userTrips || []} />;
}
