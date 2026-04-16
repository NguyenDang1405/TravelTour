import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import MyTripsMobile from './my-trips.mobile';
import MyTripsWeb from './my-trips.web';

export default function MyTripsScreen() {
  const { user } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );

  // Determine if we should query trips
  const shouldQueryTrips = convexUser && convexUser._id;
  const tripsQueryArgs = useMemo(() => {
    return shouldQueryTrips ? { userId: convexUser._id } : 'skip';
  }, [shouldQueryTrips, convexUser?._id]);

  // Get user trips - query từ Convex (cùng nguồn với planning page)
  const trips = useQuery(
    api.trips.getUserTrips,
    tripsQueryArgs
  );

  // Determine trips array to pass
  // - Nếu query đang loading → pass undefined (component sẽ xử lý)
  // - Nếu query completed → pass result (có thể là empty array nếu không có trips)
  // - Nếu không có user hoặc convexUser → pass empty array
  const tripsToPass = useMemo(() => {
    // Nếu chưa có user, không query
    if (!user) {
      return [];
    }
    
    // Nếu convexUser đang loading, chưa thể query trips
    if (convexUser === undefined) {
      return undefined; // Loading state
    }
    
    // Nếu không có convexUser (null), không query
    if (!convexUser || !convexUser._id) {
      return [];
    }
    
    // Nếu query đang loading → return undefined
    if (trips === undefined) {
      return undefined;
    }
    
    // Query completed, trả về kết quả (có thể là empty array nếu không có trips)
    return Array.isArray(trips) ? trips : [];
  }, [user, convexUser, trips]);

  // Debug logs để kiểm tra
  React.useEffect(() => {
    console.log('🔍 MyTripsScreen - Query State:', {
      hasUser: !!user,
      userId: user?.id,
      hasConvexUser: !!convexUser,
      convexUserId: convexUser?._id,
      shouldQueryTrips,
      tripsQueryArgs,
      tripsQueryArgsIsSkip: tripsQueryArgs === 'skip',
      tripsIsUndefined: trips === undefined,
      tripsIsArray: Array.isArray(trips),
      tripsCount: trips?.length || 0,
      tripsToPass,
      tripsToPassIsUndefined: tripsToPass === undefined,
      tripsToPassIsArray: Array.isArray(tripsToPass),
      tripsToPassCount: tripsToPass?.length || 0,
    });
  }, [user, convexUser, shouldQueryTrips, tripsQueryArgs, trips, tripsToPass]);

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <MyTripsWeb trips={tripsToPass} />;
  }

  return <MyTripsMobile trips={tripsToPass} />;
}

