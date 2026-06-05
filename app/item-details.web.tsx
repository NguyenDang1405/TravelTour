import AmenitiesList from '@/components/item/amenities-list';
import AvailabilityCalendar from '@/components/item/availability-calendar';
import BookingCTA from '@/components/item/booking-cta';
import ImageGallery from '@/components/item/image-gallery';
import PriceBreakdown from '@/components/item/price-breakdown';
import ReviewsSection from '@/components/item/reviews-section';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useItemStore } from '@/store/useItemStore';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ItemType = 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport';

function firstParam(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export default function ItemDetailsWeb() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    type?: string;
    itemId?: string;
    itemType?: string;
    location?: string;
    name?: string;
    price?: string;
    rating?: string;
    image?: string;
    description?: string;
    isAi?: string;
  }>();

  const itemId = (firstParam(params.itemId) || firstParam(params.id) || '').trim();
  const itemType = ((firstParam(params.itemType) || firstParam(params.type) || 'hotel').trim()) as ItemType;
  const locationParam = firstParam(params.location)?.trim() || undefined;
  const aiName = firstParam(params.name)?.trim();
  const aiPrice = firstParam(params.price)?.trim();
  const aiRating = firstParam(params.rating)?.trim();
  const aiImage = firstParam(params.image)?.trim();
  const aiDescription = firstParam(params.description)?.trim();
  const isAi = firstParam(params.isAi) === 'true';

  if (!itemId) {
    console.warn('ItemDetailsWeb: Missing itemId, skipping render', params);
    return null;
  }

  const selectedItem = useItemStore((s) => s.selectedItem);
  const canUseStore =
    !!selectedItem &&
    String(selectedItem.id) === String(itemId) &&
    String(selectedItem.type) === String(itemType);

  const { user } = useUser();
  const [item, setItem] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );

  // Actions
  const getItemDetails = useAction(api.items.getItemDetails);
  const getItemWeather = useAction(api.items.getItemWeather);

  // Query reviews - chỉ query khi có đủ tham số
  const reviews = useQuery(
    api.items.getItemReviews,
    (!canUseStore && itemId && itemType) ? { itemId, itemType } : 'skip'
  );

  // Fetch item details and weather
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If we navigated from a search list, use store data to avoid extra API calls
        if (canUseStore && selectedItem) {
          const img = selectedItem.image;
          let price = selectedItem.price || 0;
          const rating = selectedItem.rating || 0;
          
          // Estimate price if not available
          if (price === 0) {
            if (itemType === 'hotel') {
              if (rating >= 4.5) {
                price = 5000000;
              } else if (rating >= 4.0) {
                price = 3000000;
              } else if (rating >= 3.5) {
                price = 1500000;
              } else {
                price = 1000000;
              }
            } else if (itemType === 'restaurant') {
              if (rating >= 4.5) {
                price = 500000;
              } else if (rating >= 4.0) {
                price = 300000;
              } else {
                price = 200000;
              }
            } else if (itemType === 'attraction') {
              price = 200000;
            } else if (itemType === 'flight') {
              price = 2500000;
            } else {
              price = 200000;
            }
          }
          
          setItem({
            id: selectedItem.id,
            name: selectedItem.name,
            location: selectedItem.location || 'N/A',
            address: selectedItem.location || 'N/A',
            price: price,
            rating: rating,
            images: (typeof img === 'string' && img.startsWith('http')) ? [img] : [],
            description: selectedItem.description || 'Không có mô tả.',
            amenities: [],
            checkIn: '14:00',
            checkOut: '12:00',
          });
          setWeather(null);
          setIsLoading(false);
          return;
        }

        // Fetch item details
        const itemData = await getItemDetails({
          itemId,
          itemType,
          location: locationParam || 'Đà Nẵng', // Use location from params or fallback
        });

        // Transform data to match UI format
        // IMPORTANT: Preserve price from API - only estimate if price is 0 or missing
        let price = Number(itemData.price) || 0;
        const rating = itemData.rating || 0;
        
        console.log(`[ItemDetails] 💰 Price from API: ${itemData.price}, parsed: ${price}, rating: ${rating}`);
        
        // Estimate price ONLY if price is 0 or missing (don't override valid prices from API)
        if (price === 0 || !itemData.price) {
          console.log(`[ItemDetails] ⚠️ Price is 0 or missing, estimating based on rating...`);
          if (itemType === 'hotel') {
            if (rating >= 4.5) {
              price = 5000000;
            } else if (rating >= 4.0) {
              price = 3000000;
            } else if (rating >= 3.5) {
              price = 1500000;
            } else {
              price = 1000000;
            }
          } else if (itemType === 'restaurant') {
            if (rating >= 4.5) {
              price = 500000;
            } else if (rating >= 4.0) {
              price = 300000;
            } else {
              price = 200000;
            }
          } else if (itemType === 'attraction') {
            price = 200000;
          } else if (itemType === 'flight') {
            price = 2500000;
          } else {
            price = 200000;
          }
        }
        
        // Validate and process images
        let validImages: string[] = [];
        
        // Check itemData.images array first
        if (Array.isArray(itemData.images) && itemData.images.length > 0) {
          validImages = itemData.images.filter((img: any) => 
            img && typeof img === 'string' && img.startsWith('http')
          );
        }
        
        // If no valid images from array, check itemData.image
        if (validImages.length === 0 && itemData.image) {
          if (typeof itemData.image === 'string' && itemData.image.startsWith('http')) {
            validImages = [itemData.image];
          }
        }
        
        // If still no valid images, use fallback
        if (validImages.length === 0) {
          validImages = [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=95&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=95&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=95&auto=format&fit=crop',
          ];
          console.log(`[ItemDetails] ⚠️ No valid images found for ${itemData.name}, using fallback images`);
        } else {
          console.log(`[ItemDetails] ✅ Found ${validImages.length} valid images for ${itemData.name}`);
        }
        
        const transformedItem = {
          id: itemData.id || itemId,
          name: itemData.name,
          location: itemData.location || 'N/A',
          address: itemData.address || itemData.location || 'N/A',
          price: price,
          rating: rating,
          images: validImages, // Use validated images array
          description: itemData.description || 'Không có mô tả.',
          amenities: itemData.amenities || [],
          checkIn: itemData.checkIn || '14:00',
          checkOut: itemData.checkOut || '12:00',
          
          // Override with params if available
          ...(aiName && { name: aiName }),
          ...(aiPrice && { price: Number(aiPrice) }),
          ...(aiRating && { rating: Number(aiRating) }),
          ...(aiImage && { images: [aiImage] }),
          ...(aiDescription && { description: aiDescription }),

          // Additional fields based on type
          ...(itemType === 'flight' && {
            airline: itemData.airline,
            departure: itemData.departure,
            arrival: itemData.arrival,
            departureTime: itemData.departureTime,
            arrivalTime: itemData.arrivalTime,
            duration: itemData.duration,
            stops: itemData.stops,
          }),
          ...(itemType === 'attraction' && {
            category: itemData.category,
            duration: itemData.duration,
            openingHours: itemData.openingHours,
          }),
          ...(itemType === 'restaurant' && {
            category: itemData.category,
            cuisine: itemData.cuisine,
            openingHours: itemData.openingHours,
          }),
        };

        setItem(transformedItem);

        // Fetch weather for location
        const weatherLocation = locationParam || transformedItem.location;
        if (weatherLocation && weatherLocation !== 'N/A') {
          try {
            const weatherData = await getItemWeather({
              location: weatherLocation,
            });
            setWeather(weatherData);
          } catch (weatherError) {
            console.error('Error fetching weather:', weatherError);
            // Weather is optional, don't fail the whole page
          }
        }
      } catch (err: any) {
        console.error('Error fetching item details:', err);
        setError(err.message || 'Không thể tải thông tin item.');
        // Set fallback item
        setItem({
          id: itemId,
          name: 'Item không tìm thấy',
          location: 'N/A',
          price: 0,
          rating: 0,
          images: [],
          description: 'Không tìm thấy thông tin item.',
          amenities: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId && itemType) {
      fetchData();
    }
  }, [itemId, itemType, getItemDetails, getItemWeather]);

  // Remove input focus outline on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
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

  // Loading state
  if (isLoading || !item) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  // Error state
  if (error && !item.name) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topNavTitle}>
            <Text style={styles.topNavTitleText}>Chi tiết</Text>
          </View>
          <View style={styles.topNavActions} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Image Gallery */}
          <ImageGallery images={item.images} />

          {/* Main Info */}
          <View style={styles.mainInfo}>
              <View style={styles.infoSection}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>{item.name}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.location}>{item.location}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <View style={styles.stars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < Math.floor(item.rating) ? 'star' : 'star-outline'}
                          size={18}
                          color={i < item.rating ? '#FFB800' : COLORS.textSecondary}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingText}>{item.rating}</Text>
                    <Text style={styles.reviewsCount}>
                      ({reviews?.length || 0} đánh giá)
                    </Text>
                  </View>
                </View>
                {item.price > 0 && (
                  <View style={styles.headerPrice}>
                    <Text style={styles.priceLabel}>
                      {itemType === 'hotel' ? 'Từ' : itemType === 'flight' ? 'Giá' : 'Giá'}
                    </Text>
                    <Text style={styles.priceValue}>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(item.price)}
                    </Text>
                    {itemType === 'hotel' && (
                      <Text style={styles.pricePeriod}>/ đêm</Text>
                    )}
                    {itemType === 'restaurant' && (
                      <Text style={styles.pricePeriod}>/ người</Text>
                    )}
                  </View>
                )}
              </View>

              <Text style={styles.description}>{item.description}</Text>

              {/* Amenities */}
              {item.amenities && (
                <AmenitiesList amenities={item.amenities} />
              )}

              {/* Price Breakdown */}
              <PriceBreakdown
                basePrice={item.price}
                taxes={item.price * 0.1}
                totalPrice={item.price * 1.1}
                period="mỗi đêm"
              />

              {/* Availability Calendar */}
              <AvailabilityCalendar
                onDateSelect={(date) => console.log('Selected date:', date)}
                minDate={new Date().toISOString().split('T')[0]}
              />

              {/* Weather Info (if available) */}
              {weather && (
                <View style={styles.weatherSection}>
                  <Ionicons name="partly-sunny-outline" size={24} color={COLORS.primary} />
                  <View style={styles.weatherInfo}>
                    <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                    <Text style={styles.weatherDesc}>{weather.description}</Text>
                    <Text style={styles.weatherLocation}>{weather.city}</Text>
                  </View>
                </View>
              )}

              {/* Reviews */}
              <ReviewsSection
                reviews={reviews || []}
                averageRating={item.rating}
                totalReviews={reviews?.length || 0}
              />
            </View>

            {/* Booking CTA Sidebar */}
            <View style={styles.sidebar}>
              <BookingCTA
                itemId={itemId}
                itemType={itemType}
                price={item.price}
                itemName={item.name}
                itemLocation={item.location}
                itemImage={item.images?.[0]}
                itemDescription={item.description}
                itemRating={item.rating}
                userId={convexUser?._id}
                onBook={() => {
                  let url = `/booking?itemId=${itemId}&type=${itemType}`;
                  if (item.location) url += `&location=${encodeURIComponent(item.location)}`;
                  if (item.name) url += `&name=${encodeURIComponent(item.name)}`;
                  if (item.price) url += `&price=${encodeURIComponent(item.price)}`;
                  if (item.images?.[0]) url += `&image=${encodeURIComponent(item.images[0])}`;
                  if (item.description) url += `&description=${encodeURIComponent(item.description)}`;
                  if (item.rating) url += `&rating=${encodeURIComponent(item.rating)}`;
                  
                  router.push(url as any);
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
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
    maxWidth: 1400,
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
    flexDirection: 'row',
    gap: 8,
  },
  topNavButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
  },
  mainInfo: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
  },
  infoSection: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerPrice: {
    alignItems: 'flex-end',
    minWidth: 200,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  sidebar: {
    width: 380,
    position: 'sticky' as any,
    top: 100,
    height: 'fit-content' as any,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  errorBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  weatherSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  weatherDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  weatherLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

