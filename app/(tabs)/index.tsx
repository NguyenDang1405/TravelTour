import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useTripStore } from '@/store/useTripStore';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import HomeMobile from './index.mobile';
import HomeWeb from './index.web';

export default function HomeScreen() {
  const { user } = useUser();
  const { setUser } = useAuthStore();
  const { trips, setTrips } = useTripStore();

  // Lấy user data từ Convex
  const convexUser = useQuery(api.users.getUser, 
    user ? { clerkId: user.id } : "skip"
  );

  // Lấy trips của user
  const userTrips = useQuery(api.trips.getUserTrips, 
    convexUser ? { userId: convexUser._id } : "skip"
  );

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  useEffect(() => {
    if (userTrips) {
      setTrips(userTrips);
    }
  }, [userTrips, setTrips]);

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <HomeWeb user={user} convexUser={convexUser} trips={trips || []} />;
}

  return <HomeMobile user={user} convexUser={convexUser} trips={trips || []} />;
}
