import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BookingCTAProps {
  itemId: string;
  itemType: 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';
  price: number;
  currency?: string;
  itemName?: string;
  itemLocation?: string;
  itemImage?: string;
  itemDescription?: string;
  itemRating?: number;
  userId?: Id<'users'>;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onBook?: () => void;
}

export default function BookingCTA({
  itemId,
  itemType,
  price,
  currency = 'VND',
  itemName,
  itemLocation,
  itemImage,
  itemDescription,
  itemRating,
  userId,
  isFavorite: initialFavorite,
  onFavoriteToggle,
  onBook,
}: BookingCTAProps) {
  const router = useRouter();
  const addToFavorites = useMutation(api.favorites.addToFavorites);
  const removeFavoriteByItemId = useMutation(api.favorites.removeFavoriteByItemId);
  
  // Check if item is favorited
  const isFavorited = useQuery(
    api.favorites.isFavorited,
    userId && itemId ? { userId, itemId } : 'skip'
  );
  
  const [favorite, setFavorite] = useState(initialFavorite ?? false);

  useEffect(() => {
    if (isFavorited !== undefined) {
      setFavorite(isFavorited);
    }
  }, [isFavorited]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleFavorite = async () => {
    if (!userId) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào yêu thích');
      return;
    }

    try {
      console.log('Toggle favorite:', {
        favorite,
        itemId,
        userId,
        itemType,
      });

      if (favorite) {
        // Remove from favorites
        console.log('Removing from favorites...');
        await removeFavoriteByItemId({ userId, itemId });
        setFavorite(false);
        console.log('Removed successfully');
        Alert.alert('Thành công', 'Đã xóa khỏi yêu thích');
      } else {
        // Add to favorites
        const favoriteData = {
          userId,
          itemId,
          itemType,
          name: itemName || 'Item',
          location: itemLocation || 'N/A',
          price,
          rating: itemRating,
          image: itemImage,
          description: itemDescription,
        };
        
        console.log('Adding to favorites with data:', favoriteData);
        const result = await addToFavorites(favoriteData);
        console.log('Add to favorites result:', result);
        setFavorite(true);
        Alert.alert('Thành công', 'Đã thêm vào yêu thích');
      }
      onFavoriteToggle?.();
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
    }
  };

  const handleBook = () => {
    if (onBook) {
      onBook();
    } else {
      // Encode params for URL
      let url = `/booking?itemId=${itemId}&type=${itemType}`;
      if (itemLocation) url += `&location=${encodeURIComponent(itemLocation)}`;
      if (itemName) url += `&name=${encodeURIComponent(itemName)}`;
      if (price) url += `&price=${encodeURIComponent(price)}`;
      if (itemImage) url += `&image=${encodeURIComponent(itemImage)}`;
      if (itemDescription) url += `&description=${encodeURIComponent(itemDescription)}`;
      if (itemRating) url += `&rating=${encodeURIComponent(itemRating)}`;
      
      router.push(url as any);
    }
  };

  const handleShare = () => {
    // Mock share functionality
    Alert.alert('Chia sẻ', 'Link đã được sao chép vào clipboard!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Giá từ</Text>
        <Text style={styles.price}>{formatPrice(price)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.favoriteButton]}
          onPress={handleFavorite}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={favorite ? '#FF6B6B' : COLORS.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.bookButton]}
          onPress={handleBook}
        >
          <Text style={styles.bookButtonText}>Đặt ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    padding: 16,
    position: 'sticky',
    bottom: 0,
    zIndex: 100,
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    backgroundColor: COLORS.surfaceLight,
    width: 50,
  },
  shareButton: {
    backgroundColor: COLORS.surfaceLight,
    width: 50,
  },
  bookButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

