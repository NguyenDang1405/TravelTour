import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useItemStore } from '@/store/useItemStore';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Responsive helper functions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for scaling (iPhone 12/13/14 - 390px)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Scale function for width-based sizing
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

// Scale function for height-based sizing
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

// Moderate scale (less aggressive scaling)
const moderateScale = (size: number, factor: number = 0.5) => 
  size + (scale(size) - size) * factor;

interface HomeMobileProps {
  user: any;
  convexUser: any;
  trips: any[];
}

export default function HomeMobile({ user, convexUser, trips }: HomeMobileProps) {
  const router = useRouter();
  const segments = useSegments();
  const isFavoritesPage = (segments as string[]).includes('favorites');
  const { setSelectedItem } = useItemStore();

  // Get favorites list and count
  const favoritesList = useQuery(
    api.favorites.getUserFavorites,
    convexUser ? { userId: convexUser._id } : 'skip'
  );

  // Get featured blog posts
  const featuredBlogPosts = useQuery(api.blog.getPublishedPosts, { limit: 5 });
  const favoritesCount = favoritesList?.length || 0;
  
  // Create a Set of favorited itemIds for quick lookup
  const favoritedItemIds = new Set(
    favoritesList?.map((f: any) => f.itemId) || []
  );
  
  // Mutations for favorites
  const addToFavorites = useMutation(api.favorites.addToFavorites);
  const removeFavoriteByItemId = useMutation(api.favorites.removeFavoriteByItemId);

  const displayName = convexUser?.name || 
    user?.fullName || 
    (user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.firstName || user?.lastName || 'Traveler');

  const upcomingTrips = trips.filter(trip => 
    trip.status === 'confirmed' || trip.status === 'planning'
  );

  // Convex actions - Use unifiedSearch for all searches (Goong API for attractions)
  const unifiedSearchAction = useAction(api.api.unifiedSearch);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const [popularDestinations, setPopularDestinations] = useState([
    { name: "Đà Nẵng", image: "🏖️", price: "2.5M", days: "3 ngày", oldPrice: "3.5M", discount: 30 },
    { name: "Phú Quốc", image: "🏝️", price: "3M", days: "4 ngày", oldPrice: "4.2M", discount: 28 },
    { name: "Hạ Long", image: "⛵", price: "1.8M", days: "2 ngày", oldPrice: "2.5M", discount: 28 },
    { name: "Hội An", image: "🏮", price: "2M", days: "3 ngày", oldPrice: "2.8M", discount: 28 },
    { name: "Sapa", image: "🏔️", price: "2.2M", days: "3 ngày", oldPrice: "3M", discount: 27 },
    { name: "Nha Trang", image: "🌊", price: "2.8M", days: "4 ngày", oldPrice: "3.8M", discount: 26 },
  ]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  const [quickSuggestions, setQuickSuggestions] = useState([
    { name: "Đà Nẵng", image: "🏖️", days: "3 ngày", color: "#0EA5E9" },
    { name: "Phú Quốc", image: "🏝️", days: "4 ngày", color: "#06B6D4" },
    { name: "Hạ Long", image: "⛵", days: "2 ngày", color: "#3B82F6" },
    { name: "Hội An", image: "🏮", days: "3 ngày", color: "#8B5CF6" },
  ]);

  // Load popular destinations from Foursquare API on mount
  useEffect(() => {
    const loadPopularDestinations = async () => {
      setIsLoadingDestinations(true);
      const vietnamCities = ["Đà Nẵng", "Phú Quốc", "Hạ Long", "Hội An", "Sapa", "Nha Trang"];
      const defaultPrices = ["2.5M", "3M", "1.8M", "2M", "2.2M", "2.8M"];
      const defaultOldPrices = ["3.5M", "4.2M", "2.5M", "2.8M", "3M", "3.8M"];
      const defaultDiscounts = [30, 28, 28, 28, 27, 26];
      const defaultImages = ["🏖️", "🏝️", "⛵", "🏮", "🏔️", "🌊"];
      const destinations: any[] = [];

      try {
        // Load attractions for each city using unifiedSearch (Goong API)
        for (let i = 0; i < vietnamCities.length; i++) {
          const city = vietnamCities[i];
          try {
            const result = await unifiedSearchAction({ 
              query: city,
              filters: { destination: city },
              limit: 1,
            });
            // Filter to get only attractions (Goong API)
            const attractions = (result.results || []).filter((item: any) => item.type === 'attraction');
            if (attractions.length > 0) {
              const attraction = attractions[0];
              destinations.push({
                name: city,
                image: defaultImages[i],
                price: defaultPrices[i],
                days: "3 ngày",
                oldPrice: defaultOldPrices[i],
                discount: defaultDiscounts[i],
                attractionId: attraction.id,
              });
            } else {
              // Use default data if no attractions found
              destinations.push({
                name: city,
                image: defaultImages[i],
                price: defaultPrices[i],
                days: "3 ngày",
                oldPrice: defaultOldPrices[i],
                discount: defaultDiscounts[i],
              });
            }
          } catch (error) {
            console.error(`Error loading attractions for ${city}:`, error);
            // Use default data if API fails
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
        console.log('Loaded destinations:', destinations.length, destinations);
        if (destinations.length > 0) {
          setPopularDestinations(destinations);
        }
      } catch (error) {
        console.error('Error loading popular destinations:', error);
        // Keep default destinations if all fails
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    loadPopularDestinations();
  }, [unifiedSearchAction]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const searchQueryText = searchQuery.trim();
      
      const searchResult = await unifiedSearchAction({
        query: searchQueryText,
        filters: {
          destination: searchQueryText,
        },
        origin: undefined,
        destination: undefined,
        departureDate: undefined,
        returnDate: undefined,
        adults: 1,
      });

      // Map results to include emoji for mobile
      const mappedResults = (searchResult.results || []).map((item: any) => ({
        ...item,
      }));

      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.favoritesButton}
                onPress={() => router.push('/favorites' as any)}
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
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/profile')}
              >
              <View style={styles.avatarContainer}>
                {(() => {
                  const avatarUrl = convexUser?.avatar || user?.imageUrl;
                  return avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  );
                })()}
              </View>
            </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={moderateScale(20)} color={COLORS.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm điểm đến..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={async () => {
                  if (searchQuery.trim()) {
                    await handleSearch();
                  }
                }}
                onFocus={() => setShowSearchResults(true)}
              />
              {searchQuery.trim() && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                >
                  <Ionicons name="close-circle" size={moderateScale(20)} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Search Results */}
          {(searchQuery.trim() || searchResults.length > 0) && (
            <View style={styles.searchResultsSection}>
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <>
                  <View style={styles.searchResultsHeader}>
                    <Text style={styles.searchResultsTitle}>
                      {searchQuery.trim() 
                        ? `Kết quả cho "${searchQuery}"`
                        : 'Kết quả tìm kiếm'}
                    </Text>
                    <Text style={styles.searchResultsCount}>
                      {searchResults.length} kết quả
                    </Text>
                  </View>
                  <View style={styles.searchResultsList}>
                    {searchResults.map((item: any, index: number) => (
                      <TouchableOpacity
                        key={item.id || index}
                        style={styles.searchResultCard}
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
                            reviews: item.reviews,
                            image: item.image,
                            description: item.description || '',
                            metadata: item.metadata,
                          });
                          router.push(`/item-details?itemId=${encodeURIComponent(String(item.id))}&itemType=${encodeURIComponent(itemType)}${locationParam}`);
                        }}
                      >
                        <View style={styles.searchResultImage}>
                          {typeof item.image === 'string' && item.image.startsWith('http') ? (
                            <Image
                              source={{ uri: item.image }}
                              style={styles.searchResultPhoto}
                              resizeMode="cover"
                            />
                          ) : (
                          <Text style={styles.searchResultEmoji}>
                            {item.type === 'attraction' ? '🏰' : 
                             item.type === 'restaurant' ? '🦐' : 
                             item.type === 'hotel' ? '🏨' : 
                             item.type === 'flight' ? '✈️' : 
                             '📍'}
                          </Text>
                          )}
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultName} numberOfLines={1}>
                            {item.name}
                          </Text>
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
                          <View style={styles.searchResultFooter}>
                            {item.rating > 0 && (
                              <View style={styles.searchResultRating}>
                                <Ionicons name="star" size={moderateScale(12)} color="#FFD700" />
                                <Text style={styles.searchResultRatingText}>{item.rating}</Text>
                              </View>
                            )}
                            {item.price > 0 && (
                              <Text style={styles.searchResultPrice}>
                                {item.price.toLocaleString('vi-VN')} {item.currency || 'VND'}
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={moderateScale(48)} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                  <Text style={styles.emptySubtext}>
                    Thử tìm kiếm với từ khóa khác
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Upcoming Trips */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chuyến đi sắp tới</Text>
              {upcomingTrips.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/my-trips')}>
                  <Text style={styles.seeAllText}>Xem tất cả</Text>
                </TouchableOpacity>
              )}
            </View>
            {upcomingTrips.length > 0 ? (
              <View style={styles.tripsContainer}>
                {upcomingTrips.slice(0, 2).map((trip) => (
                  <TouchableOpacity 
                    key={trip._id} 
                    style={styles.tripCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/trip/${trip._id}`)}
                  >
                    <View style={styles.tripCardContent}>
                      <View style={styles.tripIconContainer}>
                        <Ionicons name="airplane" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.tripInfo}>
                        <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                        <View style={styles.tripLocationRow}>
                          <Ionicons name="location" size={moderateScale(14)} color={COLORS.textSecondary} />
                          <Text style={styles.tripDestination} numberOfLines={1}>
                            {trip.destination}
                          </Text>
                        </View>
                        <View style={styles.tripDateRow}>
                          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.tripDate}>
                            {new Date(trip.startDate).toLocaleDateString('vi-VN', { 
                              day: '2-digit', 
                              month: '2-digit' 
                            })} - {new Date(trip.endDate).toLocaleDateString('vi-VN', { 
                              day: '2-digit', 
                              month: '2-digit' 
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[
                      styles.tripStatusBadge,
                      trip.status === 'confirmed' && styles.tripStatusBadgeConfirmed
                    ]}>
                      <Text style={[
                        styles.statusText,
                        trip.status === 'confirmed' && styles.statusTextConfirmed
                      ]}>
                        {trip.status === 'confirmed' ? 'Đã xác nhận' : 'Đang lên kế hoạch'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emptyState}
                onPress={() => router.push('/(tabs)/planning')}
                activeOpacity={0.7}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="airplane-outline" size={moderateScale(56)} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyText}>Chưa có chuyến đi nào</Text>
                <Text style={styles.emptySubtext}>
                  Bắt đầu lên kế hoạch chuyến đi đầu tiên của bạn
                </Text>
                <View style={styles.emptyButton}>
                  <Ionicons name="add-circle" size={moderateScale(20)} color={COLORS.white} />
                  <Text style={styles.emptyButtonText}>Tạo chuyến đi</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Best Deals Section */}
          {searchResults.length === 0 && !isSearching && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ưu đãi tốt nhất</Text>
              </View>
              
              {/* Location Filters */}
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
                        setShowSearchResults(false);
                      } else {
                        // Search for specific location
                        setSearchQuery(filter);
                        setShowSearchResults(true);
                        setIsSearching(true);
                        try {
                          const searchResult = await unifiedSearchAction({
                            query: filter,
                            filters: {
                              destination: filter,
                            },
                          });
                          setSearchResults(searchResult.results || []);
                        } catch (error) {
                          console.error('Error searching:', error);
                          setSearchResults([]);
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

              {/* Deal Cards */}
              {isLoadingDestinations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Đang tải ưu đãi...</Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.dealsContainer}
                  contentContainerStyle={styles.dealsContent}
                >
                  {popularDestinations
                    .filter(dest => 
                      !searchQuery || 
                      dest.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((destination, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.dealCard}
                        onPress={async () => {
                          setSearchQuery(destination.name);
                          setShowSearchResults(true);
                          await handleSearch();
                        }}
                        activeOpacity={0.9}
                      >
                        <View style={styles.dealBadge}>
                          <Text style={styles.dealBadgeText}>{destination.discount}% OFF</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.dealFavorite}
                          onPress={async (e) => {
                            e.stopPropagation();
                            if (!convexUser) {
                              Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào yêu thích');
                              return;
                            }
                            
                            try {
                              // Create unique itemId from destination name
                              const itemId = `destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`;
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
                                const priceStr = destination.price.replace(/[^\d.]/g, '');
                                const priceValue = parseFloat(priceStr) * (destination.price.includes('M') ? 1000000 : 1);
                                
                                // For mobile, destination.image is emoji, so we don't use it
                                // Use undefined for image since it's optional
                                
                                await addToFavorites({
                                  userId: convexUser._id,
                                  itemId: itemId,
                                  itemType: 'attraction',
                                  name: destination.name,
                                  location: destination.name,
                                  price: priceValue,
                                  rating: 4.5,
                                  image: undefined, // Mobile uses emoji, not URL
                                  description: `Điểm đến tuyệt vời tại ${destination.name}`,
                                });
                                Alert.alert('Thành công', 'Đã thêm vào yêu thích');
                              }
                            } catch (error: any) {
                              console.error('Error toggling favorite:', error);
                              Alert.alert('Lỗi', error.message || 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
                            }
                          }}
                        >
                          <Ionicons 
                            name={favoritedItemIds.has(`destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`) ? "heart" : "heart-outline"} 
                            size={20} 
                            color={favoritedItemIds.has(`destination_${destination.name.toLowerCase().replace(/\s+/g, '_')}`) ? "#FF6B6B" : COLORS.text} 
                          />
                        </TouchableOpacity>
                        <View style={[styles.dealImageContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                          <Text style={styles.dealEmoji}>{destination.image}</Text>
                        </View>
                        <View style={styles.dealContent}>
                          <Text style={styles.dealName} numberOfLines={1}>
                            Tốt nhất tại {destination.name}
                          </Text>
                          <View style={styles.dealDetails}>
                            <View style={styles.dealDetailRow}>
                              <Ionicons name="time-outline" size={moderateScale(12)} color={COLORS.textSecondary} />
                              <Text style={styles.dealInfo}>{destination.days}</Text>
                            </View>
                          </View>
                          <View style={styles.dealPriceContainer}>
                            <Text style={styles.dealPriceOld}>{destination.oldPrice} VND</Text>
                            <Text style={styles.dealPriceNew}>{destination.price} VND</Text>
                            <Text style={styles.dealPricePer}>/ người</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Featured Blog Posts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Blog nổi bật</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/blog')}>
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            {featuredBlogPosts === undefined ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Đang tải blog...</Text>
              </View>
            ) : featuredBlogPosts.length === 0 ? (
              <TouchableOpacity
                style={styles.blogEmptyState}
                onPress={() => router.push('/(tabs)/blog')}
                activeOpacity={0.8}
              >
                <Text style={styles.blogEmptyEmoji}>✍️</Text>
                <Text style={styles.blogEmptyText}>Chưa có bài blog nào</Text>
                <Text style={styles.blogEmptySubtext}>Hãy là người đầu tiên chia sẻ trải nghiệm!</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.blogListContent}
              >
                {featuredBlogPosts.map((post: any) => (
                  <TouchableOpacity
                    key={post._id}
                    style={styles.blogCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/blog/${post.slug || post._id}`)}
                  >
                    {post.images && post.images.length > 0 ? (
                      <Image
                        source={{ uri: post.images[0] }}
                        style={styles.blogCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.blogCardImage, styles.blogCardImagePlaceholder]}>
                        <Text style={styles.blogCardPlaceholderEmoji}>✍️</Text>
                      </View>
                    )}
                    <View style={styles.blogCategoryBadge}>
                      <Text style={styles.blogCategoryText}>
                        {post.category === 'hotel' ? 'Khách sạn' :
                         post.category === 'restaurant' ? 'Nhà hàng' :
                         post.category === 'attraction' ? 'Tham quan' :
                         post.category === 'destination' ? 'Điểm đến' : 'Chung'}
                      </Text>
                    </View>
                    <View style={styles.blogCardBody}>
                      <View style={styles.blogAuthorRow}>
                        <Image
                          source={{ uri: post.author?.avatar || 'https://i.pravatar.cc/150' }}
                          style={styles.blogAuthorAvatar}
                        />
                        <Text style={styles.blogAuthorName} numberOfLines={1}>
                          {post.author?.name || 'Ẩn danh'}
                        </Text>
                      </View>
                      <Text style={styles.blogCardTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                      {post.location && (
                        <View style={styles.blogLocationRow}>
                          <Ionicons name="location-outline" size={moderateScale(12)} color={COLORS.textSecondary} />
                          <Text style={styles.blogLocationText} numberOfLines={1}>
                            {post.location}
                          </Text>
                        </View>
                      )}
                      <View style={styles.blogCardFooter}>
                        <View style={styles.blogStat}>
                          <Ionicons name="heart-outline" size={moderateScale(13)} color={COLORS.textSecondary} />
                          <Text style={styles.blogStatText}>{post.likes || 0}</Text>
                        </View>
                        <View style={styles.blogStat}>
                          <Ionicons name="eye-outline" size={moderateScale(13)} color={COLORS.textSecondary} />
                          <Text style={styles.blogStatText}>{post.views || 0}</Text>
                        </View>
                        {post.rating > 0 && (
                          <View style={styles.blogStat}>
                            <Ionicons name="star" size={moderateScale(13)} color="#FFB800" />
                            <Text style={styles.blogStatText}>{post.rating}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/planning')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="add-circle" size={moderateScale(28)} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>Tạo chuyến đi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/explore')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${COLORS.secondary}15` }]}>
                  <Ionicons name="search" size={moderateScale(28)} color={COLORS.secondary} />
                </View>
                <Text style={styles.actionText}>Tìm kiếm</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="map" size={moderateScale(28)} color="#8B5CF6" />
                </View>
                <Text style={styles.actionText}>Bản đồ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: Platform.OS === 'ios' ? verticalScale(20) : verticalScale(40),
    paddingBottom: verticalScale(20),
  },
  headerLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  favoritesButton: {
    position: 'relative',
    padding: scale(8),
  },
  favoritesBadge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: '#FF6B6B',
    borderRadius: scale(10),
    minWidth: scale(18),
    height: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(4),
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  favoritesBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: COLORS.white,
  },
  greeting: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(4),
    fontWeight: '500',
  },
  userName: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: COLORS.text,
  },
  profileButton: {
    padding: scale(4),
  },
  avatarContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarImage: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.surfaceLight,
  },
  avatarText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.white,
  },
  searchBarContainer: {
    marginBottom: verticalScale(16),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: scale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: scale(12),
    minHeight: verticalScale(50),
  },
  searchIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: moderateScale(15),
    minHeight: verticalScale(22),
  },
  searchPlaceholder: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  filtersContainer: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(16),
  },
  filtersContent: {
    gap: scale(8),
    paddingRight: scale(20),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: verticalScale(36),
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterEmoji: {
    fontSize: moderateScale(16),
  },
  filterText: {
    fontSize: moderateScale(13),
    color: COLORS.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  searchResultsSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(24),
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  searchResultsTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  searchResultsCount: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchResultsList: {
    gap: verticalScale(12),
  },
  searchResultCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: scale(12),
    borderRadius: scale(12),
    gap: scale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(12),
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  searchResultPhoto: {
    width: '100%',
    height: '100%',
  },
  searchResultEmoji: {
    fontSize: moderateScale(28),
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  searchResultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: verticalScale(4),
  },
  searchResultLocation: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    flex: 1,
  },
  searchResultDescription: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(6),
  },
  searchResultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  searchResultRatingText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: COLORS.text,
  },
  searchResultPrice: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    gap: verticalScale(12),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: verticalScale(32),
    paddingHorizontal: scale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tripsContainer: {
    gap: 12,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    padding: scale(18),
    borderRadius: scale(16),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tripCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  tripIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(6),
  },
  tripLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  tripDestination: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    marginLeft: scale(4),
    flex: 1,
  },
  tripDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: moderateScale(13),
    color: COLORS.textSecondary,
    marginLeft: scale(4),
  },
  tripStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: COLORS.surfaceLight,
  },
  tripStatusBadgeConfirmed: {
    backgroundColor: `${COLORS.primary}15`,
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: COLORS.grey,
  },
  statusTextConfirmed: {
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(48),
    paddingHorizontal: scale(32),
    backgroundColor: COLORS.surface,
    borderRadius: scale(16),
    elevation: 1,
  },
  emptyIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    gap: scale(8),
  },
  emptyButtonText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    gap: verticalScale(16),
  },
  suggestionsContainer: {
    marginTop: -8,
  },
  suggestionsContent: {
    paddingRight: 20,
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    padding: scale(18),
    borderRadius: scale(16),
    marginRight: scale(12),
    alignItems: 'center',
    minWidth: scale(100),
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  suggestionEmoji: {
    fontSize: moderateScale(28),
  },
  suggestionName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
    textAlign: 'center',
  },
  suggestionDays: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: scale(20),
    borderRadius: scale(16),
    minWidth: scale(100),
    flex: 1,
    marginHorizontal: scale(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  actionText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  // Deals Section
  dealsContainer: {
    marginTop: verticalScale(16),
  },
  dealsContent: {
    paddingRight: scale(20),
    gap: scale(12),
  },
  dealCard: {
    width: Math.min(scale(280), SCREEN_WIDTH * 0.75),
    backgroundColor: COLORS.surface,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginRight: scale(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dealBadge: {
    position: 'absolute',
    top: verticalScale(12),
    right: scale(12),
    backgroundColor: COLORS.primary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    zIndex: 10,
  },
  dealBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: COLORS.white,
  },
  dealFavorite: {
    position: 'absolute',
    top: verticalScale(12),
    left: scale(12),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dealImageContainer: {
    width: '100%',
    height: verticalScale(160),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealEmoji: {
    fontSize: moderateScale(64),
  },
  dealContent: {
    padding: scale(16),
  },
  dealName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  dealDetails: {
    marginBottom: verticalScale(12),
  },
  dealDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(4),
  },
  dealInfo: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
  },
  dealPriceContainer: {
    marginTop: verticalScale(8),
  },
  dealPriceOld: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: verticalScale(4),
  },
  dealPriceNew: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: COLORS.primary,
  },
  dealPricePer: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  filterButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: scale(8),
    minHeight: verticalScale(36),
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Blog section styles
  blogListContent: {
    paddingRight: scale(20),
    gap: scale(12),
  },
  blogCard: {
    width: Math.min(scale(220), SCREEN_WIDTH * 0.6),
    backgroundColor: COLORS.surface,
    borderRadius: scale(16),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  blogCardImage: {
    width: '100%',
    height: verticalScale(120),
  },
  blogCardImagePlaceholder: {
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blogCardPlaceholderEmoji: {
    fontSize: moderateScale(40),
  },
  blogCategoryBadge: {
    position: 'absolute',
    top: verticalScale(10),
    left: scale(10),
    backgroundColor: COLORS.primary,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  blogCategoryText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: COLORS.white,
  },
  blogCardBody: {
    padding: scale(12),
  },
  blogAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(6),
  },
  blogAuthorAvatar: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: COLORS.surfaceLight,
  },
  blogAuthorName: {
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  blogCardTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(20),
  },
  blogLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    marginBottom: verticalScale(8),
  },
  blogLocationText: {
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
    flex: 1,
  },
  blogCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  blogStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  blogStatText: {
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  blogEmptyState: {
    alignItems: 'center',
    paddingVertical: verticalScale(24),
    backgroundColor: COLORS.surface,
    borderRadius: scale(16),
    gap: verticalScale(6),
    elevation: 1,
  },
  blogEmptyEmoji: {
    fontSize: moderateScale(36),
    marginBottom: verticalScale(4),
  },
  blogEmptyText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: COLORS.text,
  },
  blogEmptySubtext: {
    fontSize: moderateScale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});


