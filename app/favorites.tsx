import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import FavoritesMobile from './favorites.mobile';
import FavoritesWeb from './favorites.web';

export default function FavoritesScreen() {
  const { user } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );

  // Determine if we should query favorites
  const shouldQueryFavorites = convexUser && convexUser._id;
  const favoritesQueryArgs = useMemo(() => {
    return shouldQueryFavorites ? { userId: convexUser._id } : 'skip';
  }, [shouldQueryFavorites, convexUser?._id]);

  // Get user favorites - query từ Convex
  const favorites = useQuery(
    api.favorites.getUserFavorites,
    favoritesQueryArgs
  );
  
  // Debug: Log query args và result
  useEffect(() => {
    console.log('🔍 FavoritesScreen - Query Details:', {
      favoritesQueryArgs,
      favoritesQueryArgsIsSkip: favoritesQueryArgs === 'skip',
      favorites,
      favoritesUndefined: favorites === undefined,
      favoritesIsArray: Array.isArray(favorites),
      favoritesCount: favorites?.length || 0,
    });
  }, [favoritesQueryArgs, favorites]);

  // Determine the favorites array to pass
  // - Nếu query đang loading → pass undefined (component sẽ xử lý)
  // - Nếu query completed → pass result (có thể là empty array nếu không có favorites)
  // - Nếu không có user hoặc convexUser → pass empty array
  const favoritesToPass = useMemo(() => {
    console.log('📦 FavoritesScreen - Computing favoritesToPass:', {
      hasUser: !!user,
      convexUserUndefined: convexUser === undefined,
      convexUserNull: convexUser === null,
      hasConvexUserId: !!convexUser?._id,
      favoritesUndefined: favorites === undefined,
      favoritesIsArray: Array.isArray(favorites),
      favoritesCount: favorites?.length || 0,
    });
    
    // Nếu chưa có user, không query
    if (!user) {
      console.log('📦 → No user, returning []');
      return [];
    }
    
    // Nếu convexUser đang loading, chưa thể query favorites → return undefined để component xử lý
    if (convexUser === undefined) {
      console.log('📦 → ConvexUser loading, returning undefined');
      return undefined;
    }
    
    // Nếu không có convexUser (null), không query
    if (!convexUser || !convexUser._id) {
      console.log('📦 → No convexUser, returning []');
      return [];
    }
    
    // Nếu query đang loading → return undefined
    if (favorites === undefined) {
      console.log('📦 → Favorites query loading, returning undefined');
      return undefined;
    }
    
    // Query completed, trả về kết quả (có thể là empty array nếu không có favorites)
    // Đảm bảo luôn trả về array, không phải undefined
    const result = Array.isArray(favorites) ? favorites : [];
    console.log('📦 → Query completed, returning array with', result.length, 'items');
    return result;
  }, [user, convexUser, favorites]);

  // Debug logs để kiểm tra
  useEffect(() => {
    console.log('🔍 FavoritesScreen - Query State:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.emailAddresses?.[0]?.emailAddress,
      hasConvexUser: !!convexUser,
      convexUserUndefined: convexUser === undefined,
      convexUserNull: convexUser === null,
      convexUserId: convexUser?._id,
      shouldQueryFavorites,
      favoritesQueryArgs,
      favoritesQueryArgsType: typeof favoritesQueryArgs,
      favoritesIsUndefined: favorites === undefined,
      favoritesIsNull: favorites === null,
      favoritesIsArray: Array.isArray(favorites),
      favoritesCount: favorites?.length || 0,
      favoritesToPass,
      favoritesToPassType: typeof favoritesToPass,
      favoritesToPassIsUndefined: favoritesToPass === undefined,
      favoritesToPassIsArray: Array.isArray(favoritesToPass),
      favoritesToPassCount: favoritesToPass?.length || 0,
    });
  }, [user, convexUser, shouldQueryFavorites, favoritesQueryArgs, favorites, favoritesToPass]);

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <FavoritesWeb favorites={favoritesToPass} />;
  }

  return <FavoritesMobile favorites={favoritesToPass} />;
}

