import TripSelectorModal from '@/components/trip/trip-selector-modal';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useItemStore } from '@/store/useItemStore';
import { useTripStore } from '@/store/useTripStore';
import { User, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface HomeWebProps {
  user: User | null | undefined;
  convexUser: any;
  trips: any[];
}

export default function HomeWeb({ user, convexUser: convexUserProp, trips }: HomeWebProps) {
  const router = useRouter();
  const segments = useSegments();
  const { trips: storeTrips } = useTripStore();
  const { setSelectedItem } = useItemStore();

  const currentRoute = segments[segments.length - 1] || 'index';
  const isFavoritesPage = segments.includes('favorites');

  // Get Clerk user if not provided
  const { user: clerkUser } = useUser();
  const finalUser = user || clerkUser;

  // Fallback: Query convexUser if not provided from props
  // ALWAYS query convexUser from Convex to ensure we get the latest data (including avatar)
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    finalUser?.id ? { clerkId: finalUser.id } : "skip"
  );

  // Always prioritize query result over props to ensure real-time updates
  const convexUser = convexUserFromQuery || convexUserProp;

  // Get favorites list and count
  const favoritesList = useQuery(
    api.favorites.getUserFavorites,
    convexUser ? { userId: convexUser._id } : 'skip'
  );
  const favoritesCount = favoritesList?.length || 0;

  // Get featured blog posts
  const featuredBlogPosts = useQuery(api.blog.getPublishedPosts, { limit: 6 });
  const featuredReviews = useQuery(api.reviews?.getFeaturedReviews) || [];

  // Create a Set of favorited itemIds for quick lookup - tự động cập nhật khi favoritesList thay đổi
  const favoritedItemIds = useMemo(() => {
    return new Set(favoritesList?.map((f: any) => f.itemId) || []);
  }, [favoritesList]);

  // Mutations for favorites
  const addToFavorites = useMutation(api.favorites.addToFavorites);
  const removeFavoriteByItemId = useMutation(api.favorites.removeFavoriteByItemId);
  const createUser = useMutation(api.users.createUser);

  // Mutations for bookings
  const createBooking = useMutation(api.bookings.createBooking);

  // State for trip selector modal
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedItemForTrip, setSelectedItemForTrip] = useState<any>(null);

  // Auto-create user in Convex if not exists
  useEffect(() => {
    const syncUserToConvex = async () => {
      if (finalUser && !convexUser) {
        try {
          const clerkId = finalUser.id;
          const email = finalUser.emailAddresses?.[0]?.emailAddress || finalUser.primaryEmailAddress?.emailAddress || "";

          // Xử lý name: ưu tiên fullName, nếu không có thì ghép firstName + lastName
          let name = finalUser.fullName || "";
          if (!name && (finalUser.firstName || finalUser.lastName)) {
            name = [finalUser.firstName, finalUser.lastName].filter(Boolean).join(" ").trim();
          }

          // Lấy name từ unsafeMetadata nếu có
          if (!name && (finalUser as any).unsafeMetadata?.fullName) {
            name = String((finalUser as any).unsafeMetadata.fullName);
          }

          const avatar = finalUser.imageUrl || "";

          if (clerkId && email) {
            console.log('Auto-creating user in Convex:', { clerkId, email, name });
            await createUser({
              clerkId,
              email,
              name: name || undefined,
              avatar: avatar || undefined,
            });
            console.log('User created in Convex successfully');
          }
        } catch (error: any) {
          // Ignore errors - có thể user đã tồn tại hoặc đang được tạo
          console.log("User creation in Convex:", error?.message || error);
        }
      }
    };

    syncUserToConvex();
  }, [finalUser, convexUser, createUser]);

  // Track processing state to prevent multiple clicks
  const processingRef = useRef<Set<string>>(new Set());

  // Handle add to itinerary
  const handleAddToItinerary = (item: any, e?: any) => {
    if (e) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }

    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào lịch trình');
      return;
    }

    setSelectedItemForTrip(item);
    setShowTripSelector(true);
  };

  // Handle trip selection from modal
  const handleSelectTrip = async (tripId: Id<'trips'>) => {
    if (!selectedItemForTrip || !convexUser) {
      return;
    }

    try {
      // Map item type
      const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
        'hotel': 'hotel',
        'flight': 'flight',
        'attraction': 'attraction',
        'restaurant': 'restaurant',
        'destination': 'attraction',
      };
      const bookingType = itemTypeMap[selectedItemForTrip.type] || 'attraction';

      // Parse location - handle null/undefined
      const locationStr = selectedItemForTrip.location || 'N/A';
      const locationParts = locationStr.split(',');
      const locationName = locationParts[0]?.trim() || locationStr;
      const address = locationStr;

      // Create booking from search result (giống như favorites page)
      const bookingData: any = {
        tripId,
        userId: convexUser._id,
        type: bookingType,
        provider: 'search',
        externalId: String(selectedItemForTrip.id || ''),
        name: selectedItemForTrip.name || 'Unnamed',
        description: selectedItemForTrip.description || undefined,
        location: {
          name: locationName,
          address: address,
          coordinates: {
            lat: 0, // Would need geocoding to get real coordinates
            lng: 0,
          },
        },
        price: selectedItemForTrip.price || 0,
        currency: selectedItemForTrip.currency || 'VND',
      };

      await createBooking(bookingData);

      setShowTripSelector(false);
      setSelectedItemForTrip(null);

      Alert.alert(
        'Thành công',
        `Đã thêm "${selectedItemForTrip.name}" vào chuyến đi thành công!`
      );
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thêm vào chuyến đi. Vui lòng thử lại.');
    }
  };

  // Handle favorite toggle function - click vào nút heart để thêm/xóa khỏi yêu thích
  const handleToggleFavorite = async (destination: any) => {
    if (!convexUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào yêu thích');
      return;
    }

    // Create unique itemId from destination name
    const itemId = `destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`;

    // Prevent multiple simultaneous clicks on the same item
    if (processingRef.current.has(itemId)) {
      return;
    }

    processingRef.current.add(itemId);

    try {
      const isFavorited = favoritedItemIds.has(itemId);

      if (isFavorited) {
        // Remove from favorites
        await removeFavoriteByItemId({
          userId: convexUser._id,
          itemId: itemId,
        });
        Alert.alert('Thành công', 'Đã xóa khỏi yêu thích');
      } else {
        // Add to favorites
        // Parse price (e.g., "2.5M" -> 2500000)
        const priceStr = destination.price?.replace(/[^\d.]/g, '') || '0';
        const priceValue = parseFloat(priceStr) * (destination.price?.includes('M') ? 1000000 : 1);

        // Ensure image is a valid URL (not emoji)
        const imageUrl = destination.image && typeof destination.image === 'string' && destination.image.startsWith('http')
          ? destination.image
          : undefined;

        const favoriteData = {
          userId: convexUser._id,
          itemId: itemId,
          itemType: 'attraction' as const,
          name: destination.name,
          location: destination.name,
          price: priceValue,
          rating: 4.5,
          image: imageUrl,
          description: `Điểm đến tuyệt vời tại ${destination.name}`,
        };

        await addToFavorites(favoriteData);
        Alert.alert('Thành công', 'Đã thêm vào yêu thích');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
    } finally {
      // Remove from processing set after a short delay
      setTimeout(() => {
        processingRef.current.delete(itemId);
      }, 500);
    }
  };

  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [activeFilter, setActiveFilter] = useState(0);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const fromInputRef = useRef<any>(null);
  const toInputRef = useRef<any>(null);
  const [fromInputPosition, setFromInputPosition] = useState({ x: 0, y: 0, width: 0 });
  const [toInputPosition, setToInputPosition] = useState({ x: 0, y: 0, width: 0 });
  const scrollViewRef = useRef<any>(null);

  // Bỏ border khi focus cho tất cả input trên web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.surfaceLight} !important;
          box-shadow: none !important;
        }
        input[type="text"]:focus,
        input[type="search"]:focus,
        input[type="date"]:focus {
          outline: none !important;
          border-color: ${COLORS.surfaceLight} !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  interface LocationOption {
    name: string;
    country: string;
    code: string;
    type: 'domestic' | 'international';
  }

  const popularLocations: LocationOption[] = [
    // Trong nước
    { name: 'Hà Nội', country: 'Việt Nam', code: 'HAN', type: 'domestic' },
    { name: 'Hồ Chí Minh', country: 'Việt Nam', code: 'SGN', type: 'domestic' },
    { name: 'Đà Nẵng', country: 'Việt Nam', code: 'DAD', type: 'domestic' },
    { name: 'Nha Trang', country: 'Việt Nam', code: 'CXR', type: 'domestic' },
    { name: 'Phú Quốc', country: 'Việt Nam', code: 'PQC', type: 'domestic' },
    { name: 'Hạ Long', country: 'Việt Nam', code: 'VDO', type: 'domestic' },
    { name: 'Hội An', country: 'Việt Nam', code: 'DAD', type: 'domestic' },
    { name: 'Huế', country: 'Việt Nam', code: 'HUI', type: 'domestic' },
    { name: 'Đà Lạt', country: 'Việt Nam', code: 'DLI', type: 'domestic' },
    { name: 'Cần Thơ', country: 'Việt Nam', code: 'VCA', type: 'domestic' },
    // Quốc tế
    { name: 'Bangkok', country: 'Thái Lan', code: 'BKK', type: 'international' },
    { name: 'Singapore', country: 'Singapore', code: 'SIN', type: 'international' },
    { name: 'Tokyo', country: 'Nhật Bản', code: 'NRT', type: 'international' },
    { name: 'Seoul', country: 'Hàn Quốc', code: 'ICN', type: 'international' },
    { name: 'Bali', country: 'Indonesia', code: 'DPS', type: 'international' },
    { name: 'Kuala Lumpur', country: 'Malaysia', code: 'KUL', type: 'international' },
    { name: 'Taipei', country: 'Đài Loan', code: 'TPE', type: 'international' },
    { name: 'Hong Kong', country: 'Hong Kong', code: 'HKG', type: 'international' },
    { name: 'Paris', country: 'Pháp', code: 'CDG', type: 'international' },
    { name: 'London', country: 'Anh', code: 'LHR', type: 'international' },
  ];

  const displayName = convexUser?.name ||
    user?.fullName ||
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.firstName || user?.lastName || 'Traveler');

  const upcomingTrips = (trips || []).filter(trip =>
    trip.status === 'confirmed' || trip.status === 'planning'
  );

  // Convex actions - Use unifiedSearch for all searches (Goong API for attractions)
  const getDestinationImageAction = useAction(api.api.getDestinationImage);
  const unifiedSearchAction = useAction(api.api.unifiedSearch);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 8; // 8 items per page (2 rows of 4 on web)

  // Popular destinations - will be loaded from API
  const [popularDestinations, setPopularDestinations] = useState([
    { name: "Đà Nẵng", image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop", price: "2.5M", days: "3 ngày", oldPrice: "3.5M", discount: 30 },
    { name: "Phú Quốc", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop", price: "3M", days: "4 ngày", oldPrice: "4.2M", discount: 28 },
    { name: "Hạ Long", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=95&auto=format&fit=crop", price: "1.8M", days: "2 ngày", oldPrice: "2.5M", discount: 28 },
    { name: "Hội An", image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=95&auto=format&fit=crop", price: "2M", days: "3 ngày", oldPrice: "2.8M", discount: 28 },
    { name: "Sapa", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop", price: "2.2M", days: "3 ngày", oldPrice: "3M", discount: 27 },
    { name: "Nha Trang", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop", price: "2.8M", days: "4 ngày", oldPrice: "3.8M", discount: 26 },
    { name: "Đà Lạt", image: "https://images.unsplash.com/photo-1596706935745-0d29193150db?w=1920&q=95&auto=format&fit=crop", price: "2.4M", days: "3 ngày", oldPrice: "3.2M", discount: 25 },
    { name: "Quy Nhơn", image: "https://images.unsplash.com/photo-1588667614002-c8402ee3cb73?w=1920&q=95&auto=format&fit=crop", price: "2.6M", days: "3 ngày", oldPrice: "3.4M", discount: 24 },
  ]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  // Load popular destinations from Foursquare API on mount
  useEffect(() => {
    const loadPopularDestinations = async () => {
      setIsLoadingDestinations(true);
      const vietnamCities = ["Đà Nẵng", "Phú Quốc", "Hạ Long", "Hội An", "Sapa", "Nha Trang", "Đà Lạt", "Quy Nhơn"];
      const defaultPrices = ["2.5M", "3M", "1.8M", "2M", "2.2M", "2.8M", "2.4M", "2.6M"];
      const defaultOldPrices = ["3.5M", "4.2M", "2.5M", "2.8M", "3M", "3.8M", "3.2M", "3.4M"];
      const defaultDiscounts = [30, 28, 28, 28, 27, 26, 25, 24];
      const defaultImages = [
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop", // Đà Nẵng
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop", // Phú Quốc
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=95&auto=format&fit=crop", // Hạ Long
        "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=95&auto=format&fit=crop", // Hội An
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop", // Sapa
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop", // Nha Trang
        "https://images.unsplash.com/photo-1596706935745-0d29193150db?w=1920&q=95&auto=format&fit=crop", // Đà Lạt
        "https://images.unsplash.com/photo-1588667614002-c8402ee3cb73?w=1920&q=95&auto=format&fit=crop", // Quy Nhơn
      ];
      const destinations: any[] = [];

      try {
        // Load attractions for each city (limit to 1 per city for homepage)
        for (let i = 0; i < vietnamCities.length; i++) {
          const city = vietnamCities[i];
          let destinationImage = defaultImages[i];

          try {
            // First, try to get destination image (guaranteed to have an image)
            try {
              const imageResult = await getDestinationImageAction({ location: city });
              console.log(`[Frontend] Got image result for ${city}:`, imageResult);
              if (imageResult?.image && imageResult.image.startsWith('http') && imageResult.image.length > 20) {
                destinationImage = imageResult.image;
                console.log(`[Frontend] ✅ Using Wikipedia/API image for ${city}: ${destinationImage.substring(0, 80)}...`);
              } else {
                console.log(`[Frontend] ⚠️ Invalid image result for ${city}, using default`);
              }
            } catch (imageError) {
              console.log(`[Frontend] ❌ Could not get destination image for ${city}, using default:`, imageError);
            }

            // Don't override Wikipedia images with Unsplash from attractions
            // Only check attractions if we don't have a Wikipedia image yet
            const hasWikipediaImage = destinationImage.includes('wikimedia.org');

            if (!hasWikipediaImage) {
              // Only try attractions if we don't have Wikipedia image
              try {
                const result = await searchAttractionsAction({ location: city });
                const attractions = result.results || [];
                if (attractions.length > 0) {
                  const attraction = attractions[0];
                  // Only use attraction image if it's Wikipedia/Geoapify (not Unsplash)
                  if (attraction.image &&
                    attraction.image.startsWith('http') &&
                    attraction.image.length > 20 &&
                    !attraction.image.includes('upload.wikimedia.org/wikipedia/en/8/8e') && // Skip broken Wikipedia URLs
                    (attraction.image.includes('wikimedia.org') || attraction.image.includes('geoapify'))) {
                    console.log(`[Frontend] ✅ Using attraction image (Wikipedia/Geoapify) for ${city}: ${attraction.image.substring(0, 80)}...`);
                    destinationImage = attraction.image;
                  } else {
                    console.log(`[Frontend] ⚠️ Attraction image is Unsplash or invalid, keeping destination image`);
                  }
                }
              } catch (attractionError) {
                console.log(`[Frontend] ⚠️ Could not get attractions for ${city}, using destination image`);
              }
            } else {
              console.log(`[Frontend] ✅ Keeping Wikipedia image for ${city}, skipping attraction check`);
            }

            console.log(`[Frontend] Final image for ${city}: ${destinationImage.substring(0, 80)}...`);
            destinations.push({
              name: city,
              image: destinationImage,
              price: defaultPrices[i],
              days: "3 ngày",
              oldPrice: defaultOldPrices[i],
              discount: defaultDiscounts[i],
            });
          } catch (error) {
            console.error(`Error loading data for ${city}:`, error);
            // Use default data if all fails
            destinations.push({
              name: city,
              image: defaultImages[i],
              price: defaultPrices[i],
              days: "3 ngày",
              oldPrice: defaultOldPrices[i],
              discount: defaultDiscounts[i],
            });
          }
        }

        // Always update destinations (even if some failed, we have defaults)
        console.log('[Frontend] Loaded destinations:', destinations.length);
        destinations.forEach((dest, idx) => {
          console.log(`[Frontend] Destination ${idx + 1}: ${dest.name} - Image: ${dest.image?.substring(0, 100)}...`);
        });
        if (destinations.length > 0) {
          setPopularDestinations(destinations);
          console.log('[Frontend] ✅ State updated with new destinations');
        } else {
          console.warn('No destinations loaded, keeping defaults');
        }
      } catch (error) {
        console.error('Error loading popular destinations:', error);
        // Keep default destinations if all fails
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    loadPopularDestinations();
  }, [unifiedSearchAction, getDestinationImageAction]);

  // Hero background image URL - beautiful tropical beach paradise scene
  // High quality travel/beach scene perfect for hero section
  const heroBackgroundImage = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop";

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity style={styles.logo}>
            <Ionicons name="airplane" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>TravelTour</Text>
          </TouchableOpacity>
          <View style={styles.navLinks}>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => {
                if (currentRoute !== 'index') {
                  router.replace('/(tabs)');
                }
              }}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'index' && styles.navLinkTextActive
              ]}>Trang chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'explore' && styles.navLinkTextActive
              ]}>Khám phá</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/planning')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'planning' && styles.navLinkTextActive
              ]}>Lịch trình</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/ai-chat')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'ai-chat' && styles.navLinkTextActive
              ]}>Travel Assistant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/blog')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'blog' && styles.navLinkTextActive
              ]}>Blog</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.favoritesButton}
            onPress={() => router.push('/favorites')}
          >
            <Ionicons
              name={isFavoritesPage ? "heart" : "heart-outline"}
              size={24}
              color={isFavoritesPage ? '#FF6B6B' : COLORS.text}
            />
            {favoritesCount > 0 && (
              <View style={styles.favoritesBadge}>
                <Text style={styles.favoritesBadgeText}>
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {(() => {
              const avatarUrl = convexUser?.avatar || user?.imageUrl;
              return avatarUrl ? (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.profileAvatar}
                    onError={(e) => {
                      console.error('❌ Error loading nav avatar:', e.nativeEvent.error);
                    }}
                  />
                  {currentRoute === 'profile' && <View style={styles.avatarActiveIndicator} />}
                </View>
              ) : (
                <View style={[
                  styles.profileAvatarPlaceholder,
                  currentRoute === 'profile' && styles.profileAvatarActive
                ]}>
                  <Ionicons
                    name="person"
                    size={22}
                    color={currentRoute === 'profile' ? COLORS.white : COLORS.text}
                  />
                </View>
              );
            })()}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Search */}
        <ImageBackground
          // source={{ uri: heroBackgroundImage }}
          source={require("@/assets/images/background/background_search3.png")}
          style={styles.heroSection}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Điểm đến của bạn là gì?</Text>
            <View style={styles.searchCard}>
              <View style={[
                styles.searchRow,
                (showFromSuggestions || showToSuggestions) && Platform.OS === 'web' && { zIndex: 1000 }
              ]}>
                <View style={[
                  styles.searchField,
                  showFromSuggestions && Platform.OS === 'web' && { zIndex: 1000 }
                ]}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>TỪ</Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      ref={fromInputRef}
                      style={styles.searchInput}
                      placeholder="Hà Nội"
                      placeholderTextColor={COLORS.textSecondary}
                      value={fromLocation}
                      onChangeText={(text) => {
                        setFromLocation(text);
                        setShowFromSuggestions(text.length > 0);
                      }}
                      onFocus={() => {
                        if (Platform.OS === 'web' && fromInputRef.current) {
                          // @ts-ignore
                          const element = fromInputRef.current._nativeNode || fromInputRef.current;
                          if (element) {
                            const rect = element.getBoundingClientRect();
                            setFromInputPosition({
                              x: rect.left,
                              y: rect.top + rect.height + 4,
                              width: rect.width
                            });
                          }
                        }
                        setShowFromSuggestions(fromLocation.length > 0 || true);
                      }}
                      onBlur={() => {
                        // Delay để cho phép click vào dropdown items
                        setTimeout(() => {
                          setShowFromSuggestions(false);
                        }, 300);
                      }}
                    />
                    {Platform.OS === 'web' && showFromSuggestions && (
                      <View style={styles.suggestionsList}>
                        <ScrollView
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          style={{ maxHeight: 240 }}
                        >
                          {popularLocations
                            .filter(loc =>
                              loc.name.toLowerCase().includes(fromLocation.toLowerCase()) ||
                              loc.country.toLowerCase().includes(fromLocation.toLowerCase()) ||
                              loc.code.toLowerCase().includes(fromLocation.toLowerCase())
                            )
                            .slice(0, 5)
                            .map((loc, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => {
                                  setFromLocation(loc.name);
                                  setShowFromSuggestions(false);
                                }}
                              >
                                <View style={styles.suggestionIcon}>
                                  <Ionicons
                                    name={loc.type === 'domestic' ? 'home' : 'airplane'}
                                    size={18}
                                    color={loc.type === 'domestic' ? COLORS.primary : '#10B981'}
                                  />
                                </View>
                                <View style={styles.suggestionContent}>
                                  <View style={styles.suggestionHeader}>
                                    <Text style={styles.suggestionName}>{loc.name}</Text>
                                    <Text style={styles.suggestionCode}>{loc.code}</Text>
                                  </View>
                                  <Text style={styles.suggestionCountry}>{loc.country}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          {fromLocation && popularLocations.filter(loc =>
                            loc.name.toLowerCase().includes(fromLocation.toLowerCase()) ||
                            loc.country.toLowerCase().includes(fromLocation.toLowerCase()) ||
                            loc.code.toLowerCase().includes(fromLocation.toLowerCase())
                          ).length === 0 && (
                              <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => {
                                  setShowFromSuggestions(false);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <View style={styles.suggestionIcon}>
                                  <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
                                </View>
                                <View style={styles.suggestionContent}>
                                  <Text style={styles.suggestionName}>Nhập tự do: {fromLocation}</Text>
                                  <Text style={styles.suggestionCountry}>Sử dụng địa điểm bạn đã nhập</Text>
                                </View>
                              </TouchableOpacity>
                            )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.searchField,
                  showToSuggestions && Platform.OS === 'web' && { zIndex: 1000 }
                ]}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>ĐẾN</Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      ref={toInputRef}
                      style={styles.searchInput}
                      placeholder="Đà Nẵng"
                      placeholderTextColor={COLORS.textSecondary}
                      value={toLocation}
                      onChangeText={(text) => {
                        setToLocation(text);
                        setShowToSuggestions(text.length > 0);
                      }}
                      onLayout={(e) => {
                        if (Platform.OS === 'web') {
                          // @ts-ignore
                          const element = toInputRef.current?._nativeNode || toInputRef.current;
                          if (element) {
                            const rect = element.getBoundingClientRect();
                            setToInputPosition({
                              x: rect.left,
                              y: rect.top + rect.height + 4,
                              width: rect.width
                            });
                          }
                        }
                      }}
                      onFocus={() => {
                        if (Platform.OS === 'web' && toInputRef.current) {
                          setTimeout(() => {
                            // @ts-ignore
                            const element = toInputRef.current?._nativeNode || toInputRef.current;
                            if (element) {
                              const rect = element.getBoundingClientRect();
                              setToInputPosition({
                                x: rect.left,
                                y: rect.top + rect.height + 4,
                                width: rect.width
                              });
                            }
                          }, 10);
                        }
                        setShowToSuggestions(toLocation.length > 0 || true);
                      }}
                      onBlur={() => {
                        // Delay để cho phép click vào dropdown items
                        setTimeout(() => {
                          setShowToSuggestions(false);
                        }, 300);
                      }}
                    />
                    {Platform.OS === 'web' && showToSuggestions && (
                      <View style={styles.suggestionsList}>
                        <ScrollView
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          style={{ maxHeight: 240 }}
                        >
                          {popularLocations
                            .filter(loc =>
                              loc.name.toLowerCase().includes(toLocation.toLowerCase()) ||
                              loc.country.toLowerCase().includes(toLocation.toLowerCase()) ||
                              loc.code.toLowerCase().includes(toLocation.toLowerCase())
                            )
                            .slice(0, 5)
                            .map((loc, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => {
                                  setToLocation(loc.name);
                                  setShowToSuggestions(false);
                                }}
                              >
                                <View style={styles.suggestionIcon}>
                                  <Ionicons
                                    name={loc.type === 'domestic' ? 'home' : 'airplane'}
                                    size={18}
                                    color={loc.type === 'domestic' ? COLORS.primary : '#10B981'}
                                  />
                                </View>
                                <View style={styles.suggestionContent}>
                                  <View style={styles.suggestionHeader}>
                                    <Text style={styles.suggestionName}>{loc.name}</Text>
                                    <Text style={styles.suggestionCode}>{loc.code}</Text>
                                  </View>
                                  <Text style={styles.suggestionCountry}>{loc.country}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          {toLocation && popularLocations.filter(loc =>
                            loc.name.toLowerCase().includes(toLocation.toLowerCase()) ||
                            loc.country.toLowerCase().includes(toLocation.toLowerCase()) ||
                            loc.code.toLowerCase().includes(toLocation.toLowerCase())
                          ).length === 0 && (
                              <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => {
                                  setShowToSuggestions(false);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <View style={styles.suggestionIcon}>
                                  <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
                                </View>
                                <View style={styles.suggestionContent}>
                                  <Text style={styles.suggestionName}>Nhập tự do: {toLocation}</Text>
                                  <Text style={styles.suggestionCountry}>Sử dụng địa điểm bạn đã nhập</Text>
                                </View>
                              </TouchableOpacity>
                            )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.searchRow}>
                <View style={styles.searchField}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>NGÀY ĐI</Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: COLORS.background,
                        padding: '14px 18px',
                        borderRadius: 12,
                        fontSize: 16,
                        lineHeight: '1.5',
                        color: COLORS.text,
                        border: `2px solid ${COLORS.surfaceLight}`,
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        minHeight: '50px',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = COLORS.primary;
                        e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = COLORS.surfaceLight;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Chọn ngày"
                      placeholderTextColor={COLORS.textSecondary}
                      value={departureDate}
                      onChangeText={setDepartureDate}
                    />
                  )}
                </View>
                <View style={styles.searchField}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="calendar" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>NGÀY VỀ</Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      min={departureDate || undefined}
                      style={{
                        width: '100%',
                        backgroundColor: COLORS.background,
                        padding: '14px 18px',
                        borderRadius: 12,
                        fontSize: 16,
                        lineHeight: '1.5',
                        color: COLORS.text,
                        border: `2px solid ${COLORS.surfaceLight}`,
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        minHeight: '50px',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = COLORS.primary;
                        e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = COLORS.surfaceLight;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Chọn ngày"
                      placeholderTextColor={COLORS.textSecondary}
                      value={returnDate}
                      onChangeText={setReturnDate}
                    />
                  )}
                </View>
              </View>
              <View style={styles.searchRow}>
                <View style={styles.searchField}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>SỐ KHÁCH</Text>
                  </View>
                  <View style={styles.guestControl}>
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={() => setGuests(Math.max(1, guests - 1))}
                    >
                      <Text style={styles.guestButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.guestValue}>{guests}</Text>
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={() => setGuests(guests + 1)}
                    >
                      <Text style={styles.guestButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.searchField}>
                  <View style={styles.searchFieldHeader}>
                    <Ionicons name="bed-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.searchLabel}>SỐ PHÒNG</Text>
                  </View>
                  <View style={styles.guestControl}>
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={() => setRooms(Math.max(1, rooms - 1))}
                    >
                      <Text style={styles.guestButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.guestValue}>{rooms}</Text>
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={() => setRooms(rooms + 1)}
                    >
                      <Text style={styles.guestButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => {
                  const params = new URLSearchParams();
                  if (toLocation) params.set('destination', toLocation);
                  if (fromLocation) params.set('from', fromLocation);
                  if (departureDate) params.set('departureDate', departureDate);
                  if (returnDate) params.set('returnDate', returnDate);
                  params.set('guests', guests.toString());
                  params.set('rooms', rooms.toString());

                  router.push(`/(tabs)/explore?${params.toString()}`);
                }}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color={COLORS.white} />
                    <Text style={styles.searchButtonText}>Tìm kiếm ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* Best Deals Section */}
        <View style={styles.dealsSection}>
          <View style={styles.dealsHeader}>
            <Text style={styles.dealsTitle}>Địa điểm nổi bật</Text>
            <View style={styles.dealsSearch}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.dealsSearchInput}
                placeholder="Tìm kiếm điểm đến..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={async () => {
                  if (searchQuery.trim()) {
                    setIsSearching(true);
                    try {
                      const searchQueryText = searchQuery.trim();

                      const searchResult = await unifiedSearchAction({
                        query: searchQueryText,
                        filters: {
                          budget: undefined,
                          duration: undefined,
                          destination: searchQueryText,
                        },
                        page: 1,
                        limit: itemsPerPage,
                      });

                      const results = searchResult.results || [];
                      const total = searchResult.total || results.length || 0;
                      const hasMore = searchResult.hasMore || false;

                      console.log('[Filter Search] Results:', {
                        count: results.length,
                        total: total,
                        hasMore: hasMore,
                        page: searchResult.page || 1,
                        limit: searchResult.limit || itemsPerPage,
                        firstItemImage: results[0]?.image,
                      });

                      setSearchResults(results);
                      setTotalResults(total);
                      setHasMore(hasMore);
                      setCurrentPage(1);
                      // Scroll to results
                      setTimeout(() => {
                        const resultsElement = document.getElementById('search-results');
                        if (resultsElement) {
                          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    } catch (error) {
                      console.error('Error searching:', error);
                      setSearchResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }
                }}
              />
              <TouchableOpacity
                style={styles.dealsSearchButton}
                onPress={async () => {
                  if (searchQuery.trim()) {
                    setIsSearching(true);
                    try {
                      const searchQueryText = searchQuery.trim();

                      const searchResult = await unifiedSearchAction({
                        query: searchQueryText,
                        filters: {
                          budget: undefined,
                          duration: undefined,
                          destination: searchQueryText,
                        },
                        page: 1,
                        limit: itemsPerPage,
                      });

                      const results = searchResult.results || [];
                      const total = searchResult.total || results.length || 0;
                      const hasMore = searchResult.hasMore || false;

                      console.log('[Filter Search] Results:', {
                        count: results.length,
                        total: total,
                        hasMore: hasMore,
                        page: searchResult.page || 1,
                        limit: searchResult.limit || itemsPerPage,
                        firstItemImage: results[0]?.image,
                      });

                      setSearchResults(results);
                      setTotalResults(total);
                      setHasMore(hasMore);
                      setCurrentPage(1);
                      // Scroll to results
                      setTimeout(() => {
                        const resultsElement = document.getElementById('search-results');
                        if (resultsElement) {
                          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    } catch (error) {
                      console.error('Error searching:', error);
                      setSearchResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }
                }}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.dealsSearchButtonText}>Tìm kiếm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Buttons - Location Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {['Tất cả', 'Đà Nẵng', 'Phú Quốc', 'Hạ Long', 'Hội An', 'Sapa', 'Nha Trang'].map((filter, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.filterButton, activeFilter === index && styles.filterButtonActive]}
                onPress={async () => {
                  setActiveFilter(index);
                  // Auto search when filter changes
                  if (index === 0) {
                    // "Tất cả" - clear location filter
                    setSearchQuery('');
                    setSearchResults([]);
                  } else {
                    // Search for specific location
                    setSearchQuery(filter);
                    setCurrentPage(1); // Reset to page 1
                    setIsSearching(true);
                    try {
                      const searchResult = await unifiedSearchAction({
                        query: filter,
                        filters: {
                          destination: filter,
                        },
                        page: 1,
                        limit: itemsPerPage,
                      });
                      const results = searchResult.results || [];
                      const total = searchResult.total || results.length || 0;
                      const hasMore = searchResult.hasMore || false;

                      console.log('[Filter Search] Results:', {
                        count: results.length,
                        total: total,
                        hasMore: hasMore,
                        page: searchResult.page || 1,
                        limit: searchResult.limit || itemsPerPage,
                        firstItemImage: results[0]?.image,
                      });

                      setSearchResults(results);
                      setTotalResults(total);
                      setHasMore(hasMore);
                    } catch (error) {
                      console.error('Error searching:', error);
                      setSearchResults([]);
                      setTotalResults(0);
                      setHasMore(false);
                    } finally {
                      setIsSearching(false);
                    }
                  }
                }}
              >
                <Text style={[styles.filterText, activeFilter === index && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Deal Cards Grid - Only show when no search results */}
          {searchResults.length === 0 && !isSearching && (
            <View style={styles.dealsGrid}>
              {isLoadingDestinations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Đang tải ưu đãi...</Text>
                </View>
              ) : (
                popularDestinations
                  .filter(dest =>
                    !searchQuery ||
                    dest.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((destination, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dealCard}
                      onPress={() => router.push('/(tabs)/explore')}
                      activeOpacity={0.9}
                    >
                      <View style={styles.dealBadge}>
                        <Text style={styles.dealBadgeText}>{destination.discount}% OFF</Text>
                      </View>
                      <Pressable
                        style={styles.dealFavorite}
                        onPress={(e?: any) => {
                          // Stop event propagation to prevent card click
                          if (e) {
                            if (e.stopPropagation) e.stopPropagation();
                            if (e.preventDefault) e.preventDefault();
                            if (Platform.OS === 'web' && e.nativeEvent) {
                              e.nativeEvent.stopImmediatePropagation?.();
                            }
                          }
                          // Call the handler function
                          handleToggleFavorite(destination);
                        }}
                        onPressIn={(e?: any) => {
                          // Also stop propagation on press in
                          if (e && e.stopPropagation) e.stopPropagation();
                        }}
                      >
                        <Ionicons
                          name={favoritedItemIds.has(`destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`) ? "heart" : "heart-outline"}
                          size={20}
                          color={favoritedItemIds.has(`destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`) ? "#FF6B6B" : COLORS.text}
                        />
                      </Pressable>
                      <ImageBackground
                        source={{ uri: destination.image }}
                        style={styles.dealImage}
                        resizeMode="cover"
                        key={`img-${destination.name}-${destination.image?.substring(0, 50)}`}
                      >
                        <View style={styles.dealImageOverlay} />
                      </ImageBackground>
                      <View style={styles.dealContent}>
                        <View style={styles.dealHeader}>
                          <Text style={styles.dealName}>Tốt nhất tại {destination.name}</Text>
                          <View style={styles.dealRating}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.dealRatingText}>4.5</Text>
                          </View>
                        </View>
                        <View style={styles.dealDetails}>
                          <View style={styles.dealDetailRow}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.dealInfo}>{destination.days} 2 đêm</Text>
                          </View>
                          <View style={styles.dealDetailRow}>
                            <Ionicons name="airplane-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.dealInfo}>Bao gồm vé máy bay khứ hồi*</Text>
                          </View>
                          <View style={styles.dealDetailRow}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.dealDate}>6 Th3 - Th11 2024</Text>
                          </View>
                          <View style={styles.dealDetailRow}>
                            <Ionicons name="alarm-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.dealBookBy}>Đặt trước 30 Th10 2024</Text>
                          </View>
                        </View>
                        <View style={styles.dealPriceContainer}>
                          <View style={styles.dealPrice}>
                            <Text style={styles.dealPriceOld}>{destination.oldPrice} VND</Text>
                            <View style={styles.dealPriceMain}>
                              <Text style={styles.dealPriceNew}>{destination.price} VND</Text>
                              <Text style={styles.dealPricePer}>/ người</Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.dealButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            // Navigate to booking with destination data
                            router.push({
                              pathname: '/booking',
                              params: {
                                destination: destination.name,
                                price: destination.price,
                                days: destination.days,
                                image: destination.image,
                                oldPrice: destination.oldPrice,
                                discount: destination.discount.toString(),
                              },
                            });
                          }}
                        >
                          <Text style={styles.dealButtonText}>Đặt ngay</Text>
                          <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </View>
          )}

          {/* Search Results Section */}
          {(searchQuery.trim() || searchResults.length > 0) && (
            <View id="search-results" style={styles.searchResultsSection}>
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>
                  {isSearching ? 'Đang tìm kiếm...' :
                    searchQuery.trim()
                      ? `Kết quả cho "${searchQuery}"`
                      : 'Kết quả tìm kiếm'}
                </Text>
                {searchResults.length > 0 && (
                  <Text style={styles.searchResultsCount}>
                    {totalResults > 0 ? totalResults : searchResults.length} kết quả
                  </Text>
                )}
              </View>

              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <>
                  <View style={styles.searchResultsGrid}>
                    {searchResults.map((item: any, index: number) => {
                      // Search Result Item Component
                      const SearchResultItem = () => {
                        const [imageError, setImageError] = useState(false);
                        const isFavorited = favoritedItemIds.has(item.id);

                        const handleToggleFavorite = async (e: any) => {
                          e.stopPropagation();
                          e.preventDefault?.();

                          if (!convexUser) {
                            Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào yêu thích');
                            return;
                          }

                          const itemId = item.id;
                          if (processingRef.current.has(itemId)) return;
                          processingRef.current.add(itemId);

                          try {
                            if (isFavorited) {
                              await removeFavoriteByItemId({
                                userId: convexUser._id,
                                itemId: itemId,
                              });
                              Alert.alert('Thành công', 'Đã xóa khỏi yêu thích');
                            } else {
                              const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
                                'hotel': 'hotel',
                                'flight': 'flight',
                                'attraction': 'attraction',
                                'restaurant': 'restaurant',
                                'destination': 'attraction',
                              };
                              const itemType = itemTypeMap[item.type] || 'attraction';
                              const imageUrl = item.image && typeof item.image === 'string' && item.image.startsWith('http')
                                ? item.image
                                : undefined;

                              await addToFavorites({
                                userId: convexUser._id,
                                itemId: itemId,
                                itemType: itemType,
                                name: item.name,
                                location: item.location,
                                price: item.price,
                                rating: item.rating || 0,
                                image: imageUrl,
                                description: item.description || '',
                              });
                              Alert.alert('Thành công', 'Đã thêm vào yêu thích');
                            }
                          } catch (error: any) {
                            console.error('Error toggling favorite:', error);
                            Alert.alert('Lỗi', error?.message || 'Không thể cập nhật yêu thích');
                          } finally {
                            processingRef.current.delete(itemId);
                          }
                        };

                        return (
                          <View style={styles.searchResultCard}>
                            <TouchableOpacity
                              style={styles.searchResultCardClickable}
                              onPress={() => {
                                const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
                                  'hotel': 'hotel',
                                  'flight': 'flight',
                                  'attraction': 'attraction',
                                  'restaurant': 'restaurant',
                                  'destination': 'attraction',
                                };
                                const itemType = itemTypeMap[item.type] || 'attraction';
                                const locationParam = item.location ? `&location=${encodeURIComponent(item.location)}` : '';
                                setSelectedItem({
                                  id: String(item.id),
                                  name: item.name,
                                  type: itemType,
                                  location: item.location,
                                  price: item.price,
                                  rating: item.rating,
                                  reviews: (item as any).reviews,
                                  image: item.image,
                                  description: item.description || '',
                                  metadata: (item as any).metadata,
                                });
                                router.push(`/item-details?itemId=${encodeURIComponent(String(item.id))}&itemType=${encodeURIComponent(itemType)}${locationParam}`);
                              }}
                              activeOpacity={0.85}
                            >
                              <View style={styles.searchResultImageContainer}>
                              {!imageError && item.image && typeof item.image === 'string' && item.image.startsWith('http') ? (
                                <Image
                                  source={{ uri: item.image }}
                                  style={styles.searchResultImage}
                                  resizeMode="cover"
                                  onError={() => {
                                    console.log(`[SearchResult] Image failed to load: ${item.image?.substring(0, 100)}`);
                                    setImageError(true);
                                  }}
                                />
                              ) : (
                                <View style={[styles.searchResultImage, styles.imagePlaceholder]}>
                                  <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
                                </View>
                              )}
                              <TouchableOpacity
                                style={styles.favoriteButton}
                                onPress={handleToggleFavorite}
                                onPressIn={(e) => {
                                  e.stopPropagation?.();
                                  e.preventDefault?.();
                                }}
                              >
                                <Ionicons
                                  name={isFavorited ? "heart" : "heart-outline"}
                                  size={22}
                                  color={isFavorited ? "#FF6B6B" : COLORS.text}
                                />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.searchResultContent}>
                              <View style={styles.searchResultHeader}>
                                <Text style={styles.searchResultName} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                {item.rating > 0 && (
                                  <View style={styles.searchResultRating}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.searchResultRatingText}>{item.rating.toFixed(1)}</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.searchResultLocationRow}>
                                <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.searchResultLocation} numberOfLines={1}>
                                  {item.location}
                                </Text>
                              </View>
                              {item.description && (
                                <Text style={styles.searchResultDescription} numberOfLines={2}>
                                  {item.description}
                                </Text>
                              )}
                              {item.price > 0 && (
                                <Text style={styles.searchResultPrice}>
                                  {item.price.toLocaleString('vi-VN')} {item.currency || 'VND'}
                                </Text>
                              )}
                            </View>
                            </TouchableOpacity>
                            <View style={[styles.searchResultContent, { paddingTop: 0, minHeight: 'auto' }]}>
                              <View style={styles.searchResultActions}>
                                <TouchableOpacity
                                  style={styles.detailButton}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    e?.preventDefault?.();
                                    const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
                                      'hotel': 'hotel',
                                      'flight': 'flight',
                                      'attraction': 'attraction',
                                      'restaurant': 'restaurant',
                                      'destination': 'attraction',
                                    };
                                    const itemType = itemTypeMap[item.type] || 'attraction';
                                    const locationParam = item.location ? `&location=${encodeURIComponent(item.location)}` : '';
                                    setSelectedItem({
                                      id: String(item.id),
                                      name: item.name,
                                      type: itemType,
                                      location: item.location,
                                      price: item.price,
                                      rating: item.rating,
                                      reviews: (item as any).reviews,
                                      image: item.image,
                                      description: item.description || '',
                                      metadata: (item as any).metadata,
                                    });
                                    router.push(`/item-details?itemId=${encodeURIComponent(String(item.id))}&itemType=${encodeURIComponent(itemType)}${locationParam}`);
                                  }}
                                  // @ts-ignore
                                  onClick={(e: any) => {
                                    e?.stopPropagation?.();
                                    e?.preventDefault?.();
                                    const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
                                      'hotel': 'hotel',
                                      'flight': 'flight',
                                      'attraction': 'attraction',
                                      'restaurant': 'restaurant',
                                      'destination': 'attraction',
                                    };
                                    const itemType = itemTypeMap[item.type] || 'attraction';
                                    const locationParam = item.location ? `&location=${encodeURIComponent(item.location)}` : '';
                                    setSelectedItem({
                                      id: String(item.id),
                                      name: item.name,
                                      type: itemType,
                                      location: item.location,
                                      price: item.price,
                                      rating: item.rating,
                                      reviews: (item as any).reviews,
                                      image: item.image,
                                      description: item.description || '',
                                      metadata: (item as any).metadata,
                                    });
                                    router.push(`/item-details?itemId=${encodeURIComponent(String(item.id))}&itemType=${encodeURIComponent(itemType)}${locationParam}`);
                                  }}
                                >
                                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                                  <Text style={styles.detailButtonText}>Chi tiết</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.addToItineraryButton}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    e?.preventDefault?.();
                                    handleAddToItinerary(item, e);
                                  }}
                                  // @ts-ignore
                                  onClick={(e: any) => {
                                    e?.stopPropagation?.();
                                    e?.preventDefault?.();
                                    handleAddToItinerary(item, e);
                                  }}
                                >
                                  <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                                  <Text style={styles.addToItineraryButtonText}>Thêm lịch trình</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      };

                      return <SearchResultItem key={item.id || index} />;
                    })}
                  </View>
                  {/* Pagination Controls */}
                  {totalResults > itemsPerPage && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage === 1 && styles.paginationButtonDisabled
                        ]}
                        onPress={async () => {
                          if (currentPage === 1 || isSearching) return;
                          const newPage = currentPage - 1;
                          setCurrentPage(newPage);
                          setIsSearching(true);
                          try {
                            const searchResult = await unifiedSearchAction({
                              query: searchQuery.trim() || "Việt Nam",
                              filters: {
                                destination: searchQuery.trim() || undefined,
                              },
                              page: newPage,
                              limit: itemsPerPage,
                            });
                            setSearchResults(searchResult.results || []);
                            setTotalResults(searchResult.total || searchResult.results?.length || 0);
                            setHasMore(searchResult.hasMore || false);
                          } catch (error) {
                            console.error('Error loading page:', error);
                          } finally {
                            setIsSearching(false);
                          }
                        }}
                        disabled={currentPage === 1 || isSearching}
                      >
                        <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? COLORS.textSecondary : COLORS.text} />
                        <Text style={[
                          styles.paginationButtonText,
                          currentPage === 1 && styles.paginationButtonTextDisabled
                        ]}>Trước</Text>
                      </TouchableOpacity>

                      <View style={styles.paginationInfo}>
                        <Text style={styles.paginationText}>
                          Trang {currentPage} / {Math.ceil(totalResults / itemsPerPage)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          (!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage)) && styles.paginationButtonDisabled
                        ]}
                        onPress={async () => {
                          if (!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage) || isSearching) return;
                          const newPage = currentPage + 1;
                          setCurrentPage(newPage);
                          setIsSearching(true);
                          try {
                            const searchResult = await unifiedSearchAction({
                              query: searchQuery.trim() || "Việt Nam",
                              filters: {
                                destination: searchQuery.trim() || undefined,
                              },
                              page: newPage,
                              limit: itemsPerPage,
                            });
                            setSearchResults(searchResult.results || []);
                            setTotalResults(searchResult.total || searchResult.results?.length || 0);
                            setHasMore(searchResult.hasMore || false);
                          } catch (error) {
                            console.error('Error loading page:', error);
                          } finally {
                            setIsSearching(false);
                          }
                        }}
                        disabled={!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage) || isSearching}
                      >
                        <Text style={[
                          styles.paginationButtonText,
                          (!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage)) && styles.paginationButtonTextDisabled
                        ]}>Sau</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={(!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage)) ? COLORS.textSecondary : COLORS.text}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                  <Text style={styles.emptySubtext}>
                    Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Featured Blog Posts Section */}
          <View style={webBlogStyles.section}>
            <View style={webBlogStyles.sectionHeader}>
              <Text style={webBlogStyles.sectionTitle}>Các bài viết mới nhất</Text>
              <TouchableOpacity
                style={webBlogStyles.seeAllBtn}
                onPress={() => router.push('/(tabs)/blog')}
              >
                <Text style={webBlogStyles.seeAllText}>Xem tất cả</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {featuredBlogPosts === undefined ? (
              <View style={webBlogStyles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={webBlogStyles.loadingText}>Đang tải blog...</Text>
              </View>
            ) : featuredBlogPosts.length === 0 ? (
              <TouchableOpacity
                style={webBlogStyles.emptyState}
                onPress={() => router.push('/(tabs)/blog')}
              >
                <Text style={webBlogStyles.emptyEmoji}>✍️</Text>
                <Text style={webBlogStyles.emptyTitle}>Chưa có bài blog nào</Text>
                <Text style={webBlogStyles.emptySubtitle}>Hãy là người đầu tiên chia sẻ trải nghiệm!</Text>
              </TouchableOpacity>
            ) : (
              <View style={webBlogStyles.grid}>
                {featuredBlogPosts.map((post: any) => (
                  <TouchableOpacity
                    key={post._id}
                    style={webBlogStyles.card}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/blog/${post.slug || post._id}`)}
                  >
                    {post.images && post.images.length > 0 ? (
                      <Image
                        source={{ uri: post.images[0] }}
                        style={webBlogStyles.cardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[webBlogStyles.cardImage, webBlogStyles.cardImagePlaceholder]}>
                        <Text style={webBlogStyles.cardPlaceholderEmoji}>✍️</Text>
                      </View>
                    )}
                    <View style={webBlogStyles.categoryBadge}>
                      <Text style={webBlogStyles.categoryBadgeText}>
                        {post.category === 'hotel' ? 'Khách sạn' :
                          post.category === 'restaurant' ? 'Nhà hàng' :
                            post.category === 'attraction' ? 'Tham quan' :
                              post.category === 'destination' ? 'Điểm đến' : 'Chung'}
                      </Text>
                    </View>
                    <View style={webBlogStyles.cardBody}>
                      <View style={webBlogStyles.authorRow}>
                        <Image
                          source={{ uri: post.author?.avatar || 'https://i.pravatar.cc/150' }}
                          style={webBlogStyles.authorAvatar}
                        />
                        <Text style={webBlogStyles.authorName} numberOfLines={1}>
                          {post.author?.name || 'Ẩn danh'}
                        </Text>
                      </View>
                      <Text style={webBlogStyles.cardTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                      {post.location && (
                        <View style={webBlogStyles.locationRow}>
                          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                          <Text style={webBlogStyles.locationText} numberOfLines={1}>
                            {post.location}
                          </Text>
                        </View>
                      )}
                      <Text style={webBlogStyles.cardPreview} numberOfLines={2}>
                        {post.content}
                      </Text>
                      <View style={webBlogStyles.cardFooter}>
                        <View style={webBlogStyles.stat}>
                          <Ionicons name="heart-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={webBlogStyles.statText}>{post.likes || 0}</Text>
                        </View>
                        <View style={webBlogStyles.stat}>
                          <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={webBlogStyles.statText}>{post.views || 0}</Text>
                        </View>
                        {post.rating > 0 && (
                          <View style={webBlogStyles.stat}>
                            <Ionicons name="star" size={14} color="#FFB800" />
                            <Text style={webBlogStyles.statText}>{post.rating}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }} />
                        <Text style={webBlogStyles.readMore}>Xem thêm →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

        </View>

        {/* Testimonials Section */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80' }}
          style={testimonialStyles.container}
          resizeMode="cover"
        >
          <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
          <Text style={testimonialStyles.title}>Khách hàng nói gì về chúng tôi</Text>
          <Text style={testimonialStyles.subtitle}>Chúng tôi vinh hạnh vì đã có cơ hội đồng hành với hơn 10.000 khách hàng trên khắp thế giới</Text>

          <View style={testimonialStyles.cardsContainer}>
            {featuredReviews && featuredReviews.length > 0 ? (
              featuredReviews.slice(0, 3).map((review: any, index: number) => {
                const isCenter = index === 1 || featuredReviews.length === 1;
                return (
                  <View key={review._id} style={[testimonialStyles.card, isCenter ? testimonialStyles.centerCard : testimonialStyles.sideCard]}>
                    <Text style={isCenter ? testimonialStyles.quoteTextCenter : testimonialStyles.quoteText} numberOfLines={5}>
                      "{review.content}"
                    </Text>
                    <View style={testimonialStyles.starsContainer}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={isCenter ? 24 : 20} color="#FFD700" />
                      ))}
                    </View>
                    <Image source={{ uri: review.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}` }} style={isCenter ? testimonialStyles.avatarCenter : testimonialStyles.avatar} />
                    <Text style={isCenter ? testimonialStyles.authorNameCenter : testimonialStyles.authorName}>{review.userName}</Text>
                  </View>
                );
              })
            ) : (
              <View style={[testimonialStyles.card, testimonialStyles.centerCard]}>
                <ActivityIndicator size="large" color="#00A3FF" />
                <Text style={{ marginTop: 10, color: '#64748b' }}>Đang tải đánh giá...</Text>
              </View>
            )}
          </View>
        </ImageBackground>

        {/* About Us Section */}
        <View style={aboutStyles.container}>
          <View style={aboutStyles.content}>
            <View style={aboutStyles.leftColumn}>
              <Text style={aboutStyles.title}>VỀ CHÚNG TÔI</Text>
              <Text style={aboutStyles.subtitle}>Nâng tầm giá trị cuộc sống</Text>
              <Text style={aboutStyles.description}>
                TravelTour là một trong những công ty du lịch hàng đầu Việt Nam, tiên phong kiến tạo những
                hành trình trọn vẹn, an toàn và giàu trải nghiệm. Với phương châm "Nâng tầm giá trị cuộc
                sống", chúng tôi không chỉ mang đến các chuyến đi, mà còn đem lại cơ hội khám phá, kết nối
                và lan tỏa những giá trị tốt đẹp cho khách hàng, cộng đồng và xã hội.
              </Text>
              <View style={aboutStyles.statsRow}>
                <View style={aboutStyles.statBox}>
                  <Text style={aboutStyles.statNumber}>30+</Text>
                  <Text style={aboutStyles.statLabel}>Năm kinh nghiệm</Text>
                </View>
                <View style={aboutStyles.statBox}>
                  <Text style={aboutStyles.statNumber}>10M+</Text>
                  <Text style={aboutStyles.statLabel}>Lượt khách hàng</Text>
                </View>
                <View style={aboutStyles.statBox}>
                  <Text style={aboutStyles.statNumber}>40+</Text>
                  <Text style={aboutStyles.statLabel}>Chi nhánh & VP</Text>
                </View>
              </View>
            </View>
            <View style={aboutStyles.rightColumn}>
              <View style={aboutStyles.imageCollage}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80' }} style={aboutStyles.collageImageMain} />
                <View style={aboutStyles.collageRightCol}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?w=500&auto=format&fit=crop&q=80' }} style={aboutStyles.collageImageSmall1} />
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=500&auto=format&fit=crop&q=80' }} style={aboutStyles.collageImageSmall2} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* App Banner Section */}
        <View style={appBannerStyles.container}>
          <ImageBackground
            source={require('@/assets/images/background/banner-app.png')}
            style={appBannerStyles.background}
            resizeMode="cover"
          >
            <View style={appBannerStyles.content}>
              <Text style={appBannerStyles.title}>Ứng dụng du lịch đa năng</Text>

              <View style={appBannerStyles.featuresBox}>
                <Ionicons name="checkmark-outline" size={16} color="#000" />
                <Text style={appBannerStyles.featureText}>Ưu đãi chỉ có trong Ứng Dụng</Text>
                <View style={appBannerStyles.featureDivider} />
                <Ionicons name="checkmark-outline" size={16} color="#000" />
                <Text style={appBannerStyles.featureText}>Lập kế hoạch chuyến đi dễ dàng</Text>
              </View>

              <View style={appBannerStyles.qrSection}>
                <View style={appBannerStyles.qrCodeWrapper}>
                  <Ionicons name="qr-code-outline" size={100} color="#000" />
                </View>

                <View style={appBannerStyles.statsContainer}>
                  <View style={appBannerStyles.statsRow}>
                    <View style={appBannerStyles.statItem}>
                      <Text style={appBannerStyles.statValue}>1.8M+</Text>
                      <Text style={appBannerStyles.statLabel}>Người dùng</Text>
                    </View>
                    <View style={appBannerStyles.statDivider} />
                    <View style={appBannerStyles.statItem}>
                      <Text style={appBannerStyles.statValue}>4.7+</Text>
                      <Text style={appBannerStyles.statLabel}>Xếp hạng</Text>
                    </View>
                  </View>

                  <View style={appBannerStyles.storeButtons}>
                    <TouchableOpacity style={appBannerStyles.storeBtn}>
                      <Ionicons name="logo-apple" size={24} color="#fff" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={appBannerStyles.storeSubText}>Download on the</Text>
                        <Text style={appBannerStyles.storeText}>App Store</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={appBannerStyles.storeBtn}>
                      <Ionicons name="logo-google-playstore" size={24} color="#fff" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={appBannerStyles.storeSubText}>GET IT ON</Text>
                        <Text style={appBannerStyles.storeText}>Google Play</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={appBannerStyles.downloadText}>Nhấn vào đây để tải ứng dụng</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Footer Section */}
        <View style={footerStyles.container}>
          <View style={footerStyles.content}>
            {/* Column 1: Info */}
            <View style={footerStyles.column}>
              <Text style={footerStyles.logoText}>TravelTour<Text style={footerStyles.logoDot}>.</Text></Text>
              <Text style={footerStyles.companyName}>Công ty Cổ phần Du Lịch TravelTour</Text>

              <View style={footerStyles.contactRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={footerStyles.contactText}>190 Pasteur, Phường Xuân Hòa, TP.HCM</Text>
              </View>
              <View style={footerStyles.contactRow}>
                <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                <Text style={footerStyles.contactText}>info@traveltour.com</Text>
              </View>

              <View style={footerStyles.socialSection}>
                <Text style={footerStyles.socialText}>Theo dõi chúng tôi trên:</Text>
                <View style={footerStyles.socialIcons}>
                  <Ionicons name="logo-instagram" size={20} color={COLORS.textSecondary} style={footerStyles.socialIcon} />
                  <Ionicons name="logo-facebook" size={20} color={COLORS.textSecondary} style={footerStyles.socialIcon} />
                  <Ionicons name="logo-whatsapp" size={20} color={COLORS.textSecondary} style={footerStyles.socialIcon} />
                  <Ionicons name="logo-tiktok" size={20} color={COLORS.textSecondary} style={footerStyles.socialIcon} />
                </View>
              </View>

              <TouchableOpacity style={footerStyles.hotlineButton}>
                <View style={footerStyles.hotlineIconWrapper}>
                  <Ionicons name="call" size={20} color={COLORS.white} />
                </View>
                <Text style={footerStyles.hotlineText}>1800 646 888</Text>
              </TouchableOpacity>
              <Text style={footerStyles.hotlineSub}>Tổng đài miễn phí 24/7</Text>
            </View>

            {/* Column 2: THÔNG TIN */}
            <View style={footerStyles.column}>
              <Text style={footerStyles.columnTitle}>THÔNG TIN</Text>
              <Text style={footerStyles.linkText}>Về chúng tôi</Text>
              <Text style={footerStyles.linkText}>Khảo sát tỷ lệ đạt visa</Text>
              <Text style={footerStyles.linkText}>Tạp chí du lịch</Text>
              <Text style={footerStyles.linkText}>Tin tức</Text>
              <Text style={footerStyles.linkText}>Sitemap</Text>
              <Text style={footerStyles.linkText}>Trợ giúp</Text>
            </View>

            {/* Column 3: ĐIỀU KIỆN - ĐIỀU KHOẢN */}
            <View style={footerStyles.column}>
              <Text style={footerStyles.columnTitle}>ĐIỀU KIỆN - ĐIỀU KHOẢN</Text>
              <Text style={footerStyles.linkText}>Chính sách riêng tư</Text>
              <Text style={footerStyles.linkText}>Thỏa thuận sử dụng</Text>
              <Text style={footerStyles.linkText}>Chính sách bảo vệ dữ liệu cá nhân</Text>
            </View>

            {/* Column 4: CHỨNG NHẬN & THANH TOÁN */}
            <View style={footerStyles.column}>
              <Text style={footerStyles.columnTitle}>CHỨNG NHẬN</Text>
              <View style={footerStyles.certRow}>
                <View style={footerStyles.certPlaceholder}><Text style={footerStyles.certText}>BỘ CÔNG THƯƠNG</Text></View>
                <View style={footerStyles.certPlaceholder}><Text style={footerStyles.certText}>DMCA PROTECTED</Text></View>
              </View>

              <Text style={[footerStyles.columnTitle, { marginTop: 24 }]}>CHẤP NHẬN THANH TOÁN</Text>
              <View style={footerStyles.paymentGrid}>
                {['VISA', 'MasterCard', 'JCB', 'VNPay', 'Momo', 'ZaloPay'].map((method) => (
                  <View key={method} style={footerStyles.paymentBox}>
                    <Text style={footerStyles.paymentText}>{method}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={footerStyles.bottomBar}>
            <Text style={footerStyles.copyrightText}>Bản quyền của TravelTour © 2025. Bảo lưu mọi quyền.</Text>
            <Text style={footerStyles.copyrightSub}>Ghi rõ nguồn "www.traveltour.com" khi sử dụng lại thông tin từ website này.</Text>
            <Text style={footerStyles.copyrightSub}>Số giấy phép kinh doanh lữ hành Quốc tế: 79-234/2022/TCDL-GP LHQT.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Buttons */}
      {Platform.OS === 'web' && (
        <View style={footerStyles.floatingButtons}>
          <TouchableOpacity
            style={footerStyles.floatBtn}
            onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <Ionicons name="arrow-up" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={footerStyles.floatBtn}>
            <Ionicons name="call" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Trip Selector Modal */}
      <TripSelectorModal
        visible={showTripSelector}
        onClose={() => {
          setShowTripSelector(false);
          setSelectedItemForTrip(null);
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
  navBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    ...SHADOWS.sm,
    gap: 16,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 32,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  navLinkText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    ...Platform.select({
      web: {
        transition: 'color 0.2s ease',
        ':hover': {
          color: COLORS.primary,
        },
      },
    }),
  },
  navLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
    position: 'relative',
    ...Platform.select({
      web: {
        '::after': {
          content: '""',
          position: 'absolute',
          bottom: -8,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: COLORS.primary,
          borderRadius: 2,
        },
      },
    }),
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }),
  },
  navButtonPrimary: {
    backgroundColor: COLORS.primary,
    ...Platform.select({
      web: {
        ':hover': {
          backgroundColor: '#0C94C7',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
        },
      },
    }),
  },
  navButtonText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  navButtonTextPrimary: {
    color: COLORS.white,
  },
  favoritesButton: {
    position: 'relative',
    padding: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          transform: 'scale(1.05)',
        },
      },
    }),
  },
  favoritesBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  favoritesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileIconButton: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          transform: 'scale(1.05)',
        },
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }),
  },
  avatarActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileAvatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    width: 42,
    height: 42,
    borderRadius: 21,
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }),
  },
  profileAvatarActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
    ...Platform.select({
      web: {
        overflow: 'visible',
      },
    }),
  },
  heroSection: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 40,
    minHeight: 600,
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.85) 0%, rgba(59, 130, 246, 0.75) 50%, rgba(14, 165, 233, 0.85) 100%)',
  },
  heroContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    zIndex: 1,
    ...Platform.select({
      web: {
        overflow: 'visible',
      },
    }),
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 20,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    letterSpacing: -1,
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        overflow: 'visible',
      },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        overflow: 'visible',
      },
    }),
  },
  searchField: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
    ...Platform.select({
      web: {
        overflow: 'visible',
      },
    }),
  },
  searchFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  searchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 10,
    ...Platform.select({
      web: {
        overflow: 'visible',
      },
    }),
  },
  searchInput: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
        outline: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',
        position: 'relative',
        zIndex: 1000,
      },
    }),
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 240,
    zIndex: 99999,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        position: 'absolute',
      },
    }),
  },
  suggestionsListFixed: {
    position: 'fixed',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    zIndex: 999999,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    maxHeight: 240,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        pointerEvents: 'auto',
      },
    }),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    backgroundColor: COLORS.white,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
        ':last-child': {
          borderBottomWidth: 0,
        },
      },
    }),
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  suggestionName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  suggestionCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  suggestionCountry: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  guestControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    paddingVertical: 4,
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
        },
      },
    }),
  },
  guestButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
        ':active': {
          transform: 'scale(0.95)',
        },
      },
    }),
  },
  guestButtonText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '700',
  },
  guestValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s',
        ':hover': {
          backgroundColor: '#0C94C7',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 20px rgba(14, 165, 233, 0.4)',
        },
        ':active': {
          transform: 'translateY(0)',
        },
      } as any,
    }),
  },
  searchButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  dealsSection: {
    paddingHorizontal: 40,
    paddingVertical: 40,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  dealsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  dealsTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  dealsSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  dealsSearchInput: {
    width: 200,
    fontSize: 14,
    color: COLORS.text,
    ...Platform.select({
      web: {
        outline: 'none !important',
        border: 'none !important',
        borderWidth: '0 !important',
        ':focus': {
          outline: 'none !important',
          border: 'none !important',
          borderWidth: '0 !important',
        },
      } as any,
    }),
  },
  dealsSearchButton: {
    backgroundColor: COLORS.grey,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dealsSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  filtersContainer: {
    marginBottom: 32,
  },
  filtersContent: {
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: `${COLORS.primary}10`,
        },
      } as any,
    }),
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
      },
    }),
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'flex-start',
  },
  dealCard: {
    ...Platform.select({
      web: {
        width: 'calc(25% - 18px)',
      },
      default: {
        width: (width - 80 - 72) / 4,
      }
    }),
    minWidth: 260,
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          transform: 'translateY(-8px)',
          ...SHADOWS.xl,
          borderColor: COLORS.primaryLight,
        },
      } as any,
    }),
  },
  dealBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  dealBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  dealFavorite: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
          transform: 'scale(1.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        ':active': {
          transform: 'scale(0.95)',
        },
      } as any,
    }),
  },
  dealImage: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  dealImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dealContent: {
    padding: 20,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dealName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  dealRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dealRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 4,
  },
  dealDetails: {
    marginBottom: 20,
    gap: 10,
  },
  dealDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dealDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  dealBookBy: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dealPriceContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  dealPrice: {
    flexDirection: 'column',
  },
  dealPriceOld: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 6,
  },
  dealPriceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  dealPriceNew: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  dealPricePer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          transform: 'translateY(-1px)',
          ...SHADOWS.md,
        },
        ':active': {
          transform: 'translateY(0)',
        },
      } as any,
    }),
  },
  dealButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  // Search Results Section
  searchResultsSection: {
    paddingTop: 0,
    paddingBottom: SPACING.xl,
    backgroundColor: 'transparent',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  searchResultsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  searchResultsCount: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
    ...Platform.select({
      web: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        '@media (max-width: 1200px)': {
          gridTemplateColumns: 'repeat(3, 1fr)',
        },
        '@media (max-width: 900px)': {
          gridTemplateColumns: 'repeat(2, 1fr)',
        },
        '@media (max-width: 600px)': {
          gridTemplateColumns: '1fr',
        },
      },
    }),
  },
  searchResultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        width: '100%',
      },
    }),
  },
  searchResultCardClickable: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          transform: 'translateY(-4px)',
          ...SHADOWS.lg,
        },
      },
    }),
  },
  searchResultImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surfaceLight,
  },
  searchResultImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surfaceLight,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 160,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.white,
          transform: 'scale(1.1)',
        },
      },
    }),
  },
  searchResultContent: {
    padding: SPACING.md,
    minHeight: 180,
    ...Platform.select({
      web: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      },
    }),
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchResultName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    lineHeight: 26,
  },
  searchResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  searchResultRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B8860B',
  },
  searchResultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  searchResultLocation: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  searchResultDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
    flex: 1,
  },
  searchResultPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  searchResultActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 'auto',
    paddingTop: SPACING.md,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.primaryLight + '10',
          borderColor: COLORS.primaryDark,
        },
      },
    }),
  },
  detailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addToItineraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          transform: 'translateY(-1px)',
          ...SHADOWS.md,
        },
      },
    }),
  },
  addToItineraryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  filterEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
    gap: SPACING.lg,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }),
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
        ':hover': {
          borderColor: COLORS.border,
          backgroundColor: COLORS.white,
        },
      },
    }),
  },
  paginationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  paginationButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  paginationInfo: {
    paddingHorizontal: SPACING.xl,
  },
  paginationText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
});

// Blog section styles for web
const webBlogStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 40,
    paddingVertical: 48,
    backgroundColor: COLORS.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seeAllText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  card: {
    width: '31%',
    minWidth: 260,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardImagePlaceholder: {
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderEmoji: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cardBody: {
    padding: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
  },
  authorName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  readMore: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

const testimonialStyles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#FAFCFF',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 60,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    maxWidth: 1200,
    width: '100%',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sideCard: {
    width: 320,
    opacity: 0.8,
    transform: [{ scale: 0.9 }],
    zIndex: 1,
  },
  centerCard: {
    width: 440,
    borderColor: '#00A3FF',
    borderWidth: 2,
    padding: 40,
    zIndex: 10,
    position: 'relative',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  quoteText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  quoteTextCenter: {
    fontSize: 15,
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
  },
  avatarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  authorName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  authorNameCenter: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '700',
  },
  navButtonLeft: {
    position: 'absolute',
    left: -20,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButtonRight: {
    position: 'absolute',
    right: -20,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

const appBannerStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1920 / 480, // responsive height based on width
    minHeight: 400,
    marginTop: -90
    // backgroundColor: '#004fc5',
  },
  background: {
    width: '100%',
    height: '130%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingLeft: '0%', // Adjust to push content to the right place over the image
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFB800', // yellow text
    marginBottom: 20,
  },
  featuresBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  featureText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 16,
  },
  featureDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#ccc',
    marginRight: 16,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginRight: 30,
  },
  statsContainer: {
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    marginRight: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginRight: 20,
  },
  storeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  storeSubText: {
    color: '#fff',
    fontSize: 8,
  },
  storeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  downloadText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
  }
});

const aboutStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 100,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 60,
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: 1,
    minWidth: 350,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#004fc5',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 24,
    lineHeight: 52,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'left',
    lineHeight: 28,
    marginBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: '#f8fafc',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  rightColumn: {
    flex: 0.8,
    minWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#004fc5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoLetter: {
    fontSize: 80,
    fontWeight: '900',
    color: '#ffffff',
    fontStyle: 'italic',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#004fc5',
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 1.5,
  }
});

// Footer styles for web
const footerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 60,
    width: '100%',
    marginTop: 40,
  },
  content: {
    flexDirection: 'row',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 40,
  },
  column: {
    flex: 1,
    minWidth: 200,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#004fc5',
    marginBottom: 16,
  },
  logoDot: {
    color: '#ed1c24',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  socialSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  socialText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  hotlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ed1c24',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  hotlineIconWrapper: {
    marginRight: 8,
  },
  hotlineText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },
  hotlineSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  columnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  linkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'color 0.2s',
        ':hover': { color: '#004fc5' }
      }
    })
  },
  certRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  certPlaceholder: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  certText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s',
        ':hover': { transform: 'translateY(-2px)' }
      } as any
    })
  },
  paymentBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  bottomBar: {
    backgroundColor: '#f8fafc',
    paddingVertical: 24,
    paddingHorizontal: 40,
    marginTop: 40,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  copyrightSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  floatingButtons: {
    position: 'fixed' as any,
    right: 24,
    bottom: 24,
    gap: 12,
    zIndex: 9999,
  },
  floatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#004fc5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s',
        ':hover': { transform: 'translateY(-2px)' }
      }
    })
  }
});




