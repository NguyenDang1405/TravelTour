import CategoryTabs from '@/components/favorites/category-tabs';
import FavoriteItemCard from '@/components/favorites/favorite-item-card';
import EmptyState from '@/components/trip/empty-state';
import TripSelectorModal from '@/components/trip/trip-selector-modal';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FavoriteItem {
  id: string;
  name: string;
  type: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
  savedAt: string;
}

type Category = 'all' | 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';

interface FavoritesWebProps {
  favorites?: any[] | undefined;
}

export default function FavoritesWeb({ favorites: convexFavoritesFromProps }: FavoritesWebProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedFavoriteItem, setSelectedFavoriteItem] = useState<FavoriteItem | null>(null);
  const removeFromFavorites = useMutation(api.favorites.removeFromFavorites);
  const removeFavoriteByItemId = useMutation(api.favorites.removeFavoriteByItemId);
  const createBooking = useMutation(api.bookings.createBooking);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );
  
  // Query favorites trực tiếp từ Convex (fallback nếu props không có)
  const favoritesFromQuery = useQuery(
    api.favorites.getUserFavorites,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );
  
  // Ưu tiên dùng props, nếu không có thì dùng query trực tiếp
  const convexFavorites = convexFavoritesFromProps !== undefined 
    ? convexFavoritesFromProps 
    : favoritesFromQuery;

  // Transform Convex favorites to UI format - đơn giản map từ Convex ra UI (giống mobile)
  const favorites: FavoriteItem[] = useMemo(() => {
    console.log('🔄 FavoritesWeb - Received props:', {
      convexFavorites,
      isUndefined: convexFavorites === undefined,
      isNull: convexFavorites === null,
      isArray: Array.isArray(convexFavorites),
      length: convexFavorites?.length || 0,
      type: typeof convexFavorites,
    });
    
    if (!convexFavorites || !Array.isArray(convexFavorites) || convexFavorites.length === 0) {
      console.log('⚠️ FavoritesWeb - No favorites to transform');
      return [];
    }
    
    console.log(`✅ FavoritesWeb - Transforming ${convexFavorites.length} items`);
    return convexFavorites.map((f: any) => {
      const createdAt = f.createdAt 
        ? (typeof f.createdAt === 'number' ? new Date(f.createdAt) : new Date(f.createdAt))
        : new Date();
      
      return {
        id: f._id,
        name: f.name || 'Unnamed',
        type: (f.itemType || 'attraction') as FavoriteItem['type'],
        location: f.location || 'N/A',
        price: f.price,
        rating: f.rating,
        image: f.image,
        description: f.description,
        savedAt: createdAt.toISOString(),
      };
    });
  }, [convexFavorites]);

  // Remove input focus outline on web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.primary} !important;
          box-shadow: 0 0 0 2px ${COLORS.primary}20 !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Filter by category
  const filteredFavorites = useMemo(() => {
    if (selectedCategory === 'all') {
      return favorites;
    }
    return favorites.filter((item) => item.type === selectedCategory);
  }, [favorites, selectedCategory]);

  // Sort by saved date (newest first)
  const sortedFavorites = useMemo(() => {
    return [...filteredFavorites].sort((a, b) => {
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });
  }, [filteredFavorites]);
  

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleRemove = async (item: FavoriteItem) => {
    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để xóa khỏi yêu thích');
      return;
    }

    try {
      // item.id là favoriteId từ Convex (_id)
      await removeFromFavorites({ favoriteId: item.id as any });
      // Real-time update sẽ tự động cập nhật UI
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể xóa khỏi yêu thích. Vui lòng thử lại.');
    }
  };

  const handleBookNow = (item: FavoriteItem) => {
    router.push(`/booking?itemId=${item.id}&itemType=${item.type}`);
  };

  const handleAddToTrip = (item: FavoriteItem) => {
    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào chuyến đi');
      return;
    }
    setSelectedFavoriteItem(item);
    setShowTripSelector(true);
  };

  const handleSelectTrip = async (tripId: Id<'trips'>) => {
    if (!selectedFavoriteItem || !convexUser) {
      return;
    }

    try {
      // Parse location
      const locationParts = selectedFavoriteItem.location.split(',');
      const locationName = locationParts[0]?.trim() || selectedFavoriteItem.location;
      const address = selectedFavoriteItem.location;

      // Create booking from favorite item
      const bookingData: any = {
        tripId,
        userId: convexUser._id,
        type: selectedFavoriteItem.type,
        provider: 'favorite',
        externalId: selectedFavoriteItem.id,
        name: selectedFavoriteItem.name,
        description: selectedFavoriteItem.description,
        location: {
          name: locationName,
          address: address,
          coordinates: {
            lat: 0, // Would need geocoding to get real coordinates
            lng: 0,
          },
        },
        price: selectedFavoriteItem.price || 0,
        currency: 'VND',
      };

      await createBooking(bookingData);
      
      if (typeof window !== 'undefined') {
        // Success will be shown via real-time update
        // Could also show a toast notification here
      } else {
        Alert.alert(
          'Thành công',
          `Đã thêm "${selectedFavoriteItem.name}" vào chuyến đi thành công!`
        );
      }
      
      setSelectedFavoriteItem(null);
    } catch (error: any) {
      console.error('Error adding favorite to trip:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thêm vào chuyến đi. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topNavTitle}>
            <Text style={styles.topNavTitleText}>Yêu thích</Text>
          </View>
          <View style={styles.topNavActions} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Yêu thích của tôi</Text>
              <Text style={styles.subtitle}>
                {sortedFavorites.length} mục yêu thích{' '}
                {filteredFavorites.length !== favorites.length &&
                  `(${favorites.length} tổng cộng)`}
              </Text>
            </View>
          </View>

          {/* Category Tabs */}
          <CategoryTabs onCategoryChange={handleCategoryChange} />

          {/* Favorites Grid */}
          {sortedFavorites.length === 0 ? (
            <EmptyState
              title="Chưa có mục yêu thích nào"
              message="Lưu các địa điểm, khách sạn hoặc dịch vụ bạn yêu thích để dễ dàng tìm lại sau"
              actionLabel="Khám phá ngay"
              onAction={() => router.push('/(tabs)/explore')}
            />
          ) : (
            <View style={styles.grid}>
              {sortedFavorites.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <FavoriteItemCard
                    item={item}
                    onRemove={handleRemove}
                    onBookNow={handleBookNow}
                    onAddToTrip={handleAddToTrip}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Trip Selector Modal */}
      <TripSelectorModal
        visible={showTripSelector}
        onClose={() => {
          setShowTripSelector(false);
          setSelectedFavoriteItem(null);
        }}
        onSelectTrip={handleSelectTrip}
        title="Chọn chuyến đi để thêm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  topNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
  },
  topNavTitle: {
    flex: 1,
    alignItems: 'center',
  },
  topNavTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  topNavActions: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '32%',
    minWidth: 280,
    flexGrow: 1,
  },
});

