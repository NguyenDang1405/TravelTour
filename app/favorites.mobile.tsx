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
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

interface FavoritesMobileProps {
  favorites?: any[] | undefined;
}

export default function FavoritesMobile({ favorites: convexFavorites }: FavoritesMobileProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedFavoriteItem, setSelectedFavoriteItem] = useState<FavoriteItem | null>(null);
  const removeFromFavorites = useMutation(api.favorites.removeFromFavorites);
  const createBooking = useMutation(api.bookings.createBooking);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  // Transform Convex favorites to UI format - đơn giản map từ Convex ra UI
  const favorites: FavoriteItem[] = useMemo(() => {
    if (!convexFavorites || !Array.isArray(convexFavorites) || convexFavorites.length === 0) {
      return [];
    }
    
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
    Alert.alert(
      'Xóa khỏi yêu thích',
      `Bạn có chắc chắn muốn xóa "${item.name}" khỏi danh sách yêu thích?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromFavorites({ favoriteId: item.id as any });
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa khỏi yêu thích. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
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
      
      Alert.alert(
        'Thành công',
        `Đã thêm "${selectedFavoriteItem.name}" vào chuyến đi thành công!`
      );
      
      setSelectedFavoriteItem(null);
    } catch (error: any) {
      console.error('Error adding favorite to trip:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thêm vào chuyến đi. Vui lòng thử lại.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu thích</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Category Tabs */}
          <CategoryTabs onCategoryChange={handleCategoryChange} />

          {/* Favorites List */}
          {sortedFavorites.length === 0 ? (
            <EmptyState
              title="Chưa có mục yêu thích nào"
              message="Lưu các địa điểm, khách sạn hoặc dịch vụ bạn yêu thích để dễ dàng tìm lại sau"
              actionLabel="Khám phá ngay"
              onAction={() => router.push('/(tabs)/explore')}
            />
          ) : (
            <View style={styles.list}>
              {sortedFavorites.map((item) => (
                <FavoriteItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onBookNow={handleBookNow}
                  onAddToTrip={handleAddToTrip}
                />
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
  list: {
    gap: 16,
  },
});

