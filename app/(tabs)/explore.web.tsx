import TripSelectorModal from '@/components/trip/trip-selector-modal';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useItemStore } from '@/store/useItemStore';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ExploreWebProps {
  user: any;
  convexUser: any;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'destination' | 'hotel' | 'attraction' | 'restaurant' | 'flight' | 'transport';
  location: string;
  price?: number;
  currency?: string;
  rating: number;
  reviews?: number;
  image: string;
  description: string;
}

export default function ExploreWeb({ user, convexUser: convexUserProp }: ExploreWebProps) {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'index';
  const { setSelectedItem } = useItemStore();
  
  // Get Clerk user if not provided
  const { user: clerkUser } = useUser();
  const finalUser = user || clerkUser;
  
  // ALWAYS query convexUser from Convex to ensure we get the latest data (including avatar)
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    finalUser?.id ? { clerkId: finalUser.id } : "skip"
  );
  
  // Always prioritize query result over props to ensure real-time updates
  const convexUser = convexUserFromQuery || convexUserProp;
  
  // Mutation to create user
  const createUser = useMutation(api.users.createUser);
  
  // Auto-create user in Convex if not exists
  React.useEffect(() => {
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
          if (!name && finalUser.unsafeMetadata?.fullName) {
            name = String(finalUser.unsafeMetadata.fullName);
          }
          
          const avatar = finalUser.imageUrl || undefined;
          
          if (clerkId && email) {
            console.log('🔄 ExploreWeb - Creating Convex user with:', { clerkId, email });
            await createUser({
              clerkId,
              email,
              name: name || undefined,
              avatar,
            });
            console.log('✅ ExploreWeb - Convex user đã được tạo thành công');
          } else {
            console.warn('⚠️ ExploreWeb - Cannot create Convex user: missing id or email', {
              hasId: !!clerkId,
              hasEmail: !!email,
            });
          }
        } catch (error: any) {
          // Ignore errors - có thể user đã tồn tại hoặc có lỗi khác
          console.log('⚠️ ExploreWeb - Không thể tạo Convex user:', error?.message || error);
        }
      }
    };
    
    syncUserToConvex();
  }, [finalUser, convexUser, createUser]);
  
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState((params.destination as string) || '');
  const [selectedFilters, setSelectedFilters] = useState({
    budget: '',
    duration: '',
    interests: [] as string[],
  });
  // Search type selector: 'all' | 'flight' | 'hotel' | 'attraction'
  const [searchType, setSearchType] = useState<'all' | 'flight' | 'hotel' | 'attraction'>((params.type as any) || 'all');
  // Flight search fields (optional)
  const [fromLocation, setFromLocation] = useState((params.from as string) || '');
  const [toLocation, setToLocation] = useState((params.destination as string) || '');
  const [departureDate, setDepartureDate] = useState((params.departureDate as string) || '');
  const [returnDate, setReturnDate] = useState((params.returnDate as string) || '');
  const [adults, setAdults] = useState(params.guests ? parseInt(params.guests as string) : 1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 15; // 15 items per page
  const hasInitialSearchRef = useRef(false);

  // Map Vietnamese names to IATA codes for Amadeus API
  const getIataCode = (locationName: string) => {
    if (!locationName) return undefined;
    const locMap: Record<string, string> = {
      'Hà Nội': 'HAN', 'Hồ Chí Minh': 'SGN', 'Đà Nẵng': 'DAD',
      'Phú Quốc': 'PQC', 'Nha Trang': 'CXR', 'Hải Phòng': 'HPH',
      'Đà Lạt': 'DLI', 'Huế': 'HUI', 'Cần Thơ': 'VCA',
      'Vinh': 'VII', 'Buôn Ma Thuột': 'BMV', 'Quy Nhơn': 'UIH'
    };
    // If it's already a 3-letter code, return uppercase
    if (locationName.trim().length === 3) return locationName.trim().toUpperCase();
    
    // Check map
    for (const [key, value] of Object.entries(locMap)) {
      if (locationName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(locationName.toLowerCase())) {
        return value;
      }
    }
    return locationName.trim().toUpperCase();
  };

  // Get favorites list
  const favoritesList = useQuery(
    api.favorites.getUserFavorites,
    convexUser ? { userId: convexUser._id } : 'skip'
  );
  
  // Create a Set of favorited itemIds for quick lookup
  const favoritedItemIds = useMemo(() => {
    return new Set(favoritesList?.map((f: any) => f.itemId) || []);
  }, [favoritesList]);

  // Mutations for favorites
  const addToFavorites = useMutation(api.favorites.addToFavorites);
  const removeFavoriteByItemId = useMutation(api.favorites.removeFavoriteByItemId);
  
  // Mutations for trips
  const createBooking = useMutation(api.bookings.createBooking);
  
  // Track processing state to prevent multiple clicks
  const processingRef = useRef<Set<string>>(new Set());
  
  // State for trip selector modal
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedItemForTrip, setSelectedItemForTrip] = useState<SearchResult | null>(null);

  const popularDestinations = [
    { name: "Đà Nẵng", image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["beach", "city"] },
    { name: "Phú Quốc", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["beach", "nature"] },
    { name: "Hạ Long", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["nature", "adventure"] },
    { name: "Hội An", image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["culture", "city"] },
    { name: "Sapa", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["nature", "adventure"] },
    { name: "Nha Trang", image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format&fit=crop", type: "destination", categories: ["beach", "city"] },
  ];

  const interestOptions = [
    { id: 'beach', name: 'Biển', icon: '🏖️' },
    { id: 'culture', name: 'Văn hóa', icon: '🏛️' },
    { id: 'adventure', name: 'Phiêu lưu', icon: '🧗' },
    { id: 'food', name: 'Ẩm thực', icon: '🍜' },
    { id: 'nature', name: 'Thiên nhiên', icon: '🌿' },
    { id: 'city', name: 'Thành phố', icon: '🏙️' },
  ];

  // Convex actions - Use unified search
  const unifiedSearchAction = useAction(api.api.unifiedSearch);

  const handleSearch = async (overrides?: { budget?: string; interests?: string[] }) => {
    const currentBudget = overrides?.budget !== undefined ? overrides.budget : selectedFilters.budget;
    const currentInterests = overrides?.interests !== undefined ? overrides.interests : selectedFilters.interests;
    
    // Logic: 
    // 1. Nếu searchType là 'flight' và có đầy đủ thông tin flight → search flights
    // 2. Nếu có text query → search với text
    // 3. Nếu chỉ có filters (không có text) → search với filters (dùng default location)
    // 4. Nếu không có cả hai → không search
    const hasQuery = searchQuery.trim().length > 0;
    const hasFilters = currentInterests.length > 0;
    const hasFlightInfo = searchType === 'flight' && fromLocation.trim() && toLocation.trim() && departureDate.trim();
    
    // Allow search if: has query, has filters, OR has flight info
    if (!hasQuery && !hasFilters && !hasFlightInfo) {
      // Không có gì để search
      Alert.alert('Thông báo', 'Vui lòng nhập thông tin tìm kiếm hoặc điền đầy đủ thông tin chuyến bay');
      return;
    }
    
    setIsSearching(true);
    setCurrentPage(1); // Reset to page 1 on new search
    try {
      // Determine search query: ưu tiên user input, nếu không có thì dùng destination của flight, nếu có filter thì dùng Việt Nam
      const searchQueryText = searchQuery.trim() || toLocation.trim() || (hasFilters ? "Việt Nam" : "");
      
      console.log('🔍 Search params:', {
        searchType,
        hasQuery,
        hasFilters,
        hasFlightInfo,
        fromLocation,
        toLocation,
        departureDate,
        returnDate,
        adults,
      });
      
      const shouldSearchFlights = searchType === 'flight' || searchType === 'all' || (fromLocation.trim() && toLocation.trim());
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const dateString = defaultDate.toISOString().split('T')[0];
      
      const flightOrigin = getIataCode(fromLocation) || 'HAN';
      const flightDestination = getIataCode(toLocation) || getIataCode(searchQueryText) || 'DAD';
      const flightDate = departureDate.trim() || dateString;
      const flightReturnDate = returnDate.trim() || undefined;
      
      console.log('✈️ Flight search check:', {
        searchType,
        shouldSearchFlights,
        flightOrigin,
        flightDestination,
        flightDate,
        flightReturnDate,
        hasFlightParams: !!(flightOrigin && flightDestination && flightDate),
      });
      
      const searchResult = await unifiedSearchAction({
        query: searchQueryText,
        filters: {
          budget: currentBudget ? parseFloat(currentBudget) : undefined,
          duration: selectedFilters.duration ? parseFloat(selectedFilters.duration) : undefined,
          interests: currentInterests.length > 0 ? currentInterests : undefined,
          destination: searchQueryText,
        },
        // Include flights if searchType is 'flight' or 'all'
        origin: shouldSearchFlights ? flightOrigin : undefined,
        destination: shouldSearchFlights ? flightDestination : undefined,
        departureDate: shouldSearchFlights ? flightDate : undefined,
        returnDate: shouldSearchFlights ? flightReturnDate : undefined,
        adults: adults,
        page: currentPage,
        limit: itemsPerPage,
      });

      // Filter results by selected search type
      let filteredResults = searchResult.results || [];
      
      console.log('📊 Search results before filtering:', {
        totalResults: filteredResults.length,
        searchType,
        resultsByType: {
          flight: filteredResults.filter((r: SearchResult) => r.type === 'flight').length,
          hotel: filteredResults.filter((r: SearchResult) => r.type === 'hotel').length,
          attraction: filteredResults.filter((r: SearchResult) => r.type === 'attraction').length,
          restaurant: filteredResults.filter((r: SearchResult) => r.type === 'restaurant').length,
        }
      });
      
      if (searchType !== 'all') {
        filteredResults = filteredResults.filter((item: SearchResult) => {
          if (searchType === 'flight') return item.type === 'flight';
          if (searchType === 'hotel') return item.type === 'hotel';
          if (searchType === 'attraction') return item.type === 'attraction' || item.type === 'restaurant';
          return true;
        });
      }
      
      console.log('📊 Search results after filtering:', {
        totalResults: filteredResults.length,
        searchType,
        flights: filteredResults.filter((r: SearchResult) => r.type === 'flight').length,
      });
      
      setSearchResults(filteredResults);
      setTotalResults(filteredResults.length);
      setHasMore(searchResult.hasMore || false);
    } catch (error) {
      console.error('Error searching:', error);
      // Fallback to empty results
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    if (!hasInitialSearchRef.current && (params.from || params.destination || params.departureDate)) {
      hasInitialSearchRef.current = true;
      setTimeout(() => {
        handleSearch();
      }, 500);
    }
  }, [params.from, params.destination, params.departureDate]);

  const toggleInterest = async (interestId: string) => {
    const newInterests = selectedFilters.interests.includes(interestId)
      ? selectedFilters.interests.filter(id => id !== interestId)
      : [...selectedFilters.interests, interestId];
    
    setSelectedFilters(prev => ({
      ...prev,
      interests: newInterests
    }));

    handleSearch({ interests: newInterests });
  };

  const handleItemClick = (item: SearchResult) => {
    // Map type to itemType for navigation
    const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
      'hotel': 'hotel',
      'flight': 'flight',
      'attraction': 'attraction',
      'restaurant': 'restaurant',
      'destination': 'attraction', // Default destination to attraction
    };
    
    const itemType = itemTypeMap[item.type] || 'attraction';
    const locationParam = item.location ? `&location=${encodeURIComponent(item.location)}` : '';
    // Save selected item to store to avoid extra API calls on details page
    setSelectedItem({
      id: String(item.id),
      name: item.name,
      type: itemType,
      location: item.location,
      price: item.price,
      rating: item.rating,
      reviews: (item as any).reviews,
      image: item.image,
      description: item.description,
      metadata: (item as any).metadata,
    });
    router.push(`/item-details?itemId=${encodeURIComponent(String(item.id))}&itemType=${encodeURIComponent(itemType)}${locationParam}`);
  };

  // Handle add to itinerary
  const handleAddToItinerary = (item: SearchResult, e?: any) => {
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
        image: selectedItemForTrip.image || undefined,
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
  
  // Handle favorite toggle
  const handleToggleFavorite = async (item: SearchResult, e?: any) => {
    console.log('❤️ handleToggleFavorite called', { itemId: item.id, itemName: item.name });
    
    if (e) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }

    if (!convexUser) {
      console.log('❌ No convexUser');
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào yêu thích');
      return;
    }

    const itemId = String(item.id);
    console.log('✅ convexUser exists:', convexUser._id);
    
    // Prevent multiple simultaneous clicks
    if (processingRef.current.has(itemId)) {
      console.log('⏳ Already processing:', itemId);
      return;
    }
    
    processingRef.current.add(itemId);
    
    try {
      const isFavorited = favoritedItemIds.has(itemId);
      console.log('📌 Current favorite status:', isFavorited);
      
      if (isFavorited) {
        // Remove from favorites
        console.log('🗑️ Removing from favorites...');
        await removeFavoriteByItemId({
          userId: convexUser._id,
          itemId: itemId,
        });
        console.log('✅ Removed from favorites');
        Alert.alert('Thành công', 'Đã xóa khỏi yêu thích');
      } else {
        // Add to favorites
        console.log('➕ Adding to favorites...');
        // Map type to itemType
        const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
          'hotel': 'hotel',
          'flight': 'flight',
          'attraction': 'attraction',
          'restaurant': 'restaurant',
          'destination': 'attraction',
        };
        
        const itemType = itemTypeMap[item.type] || 'attraction';
        console.log('📝 Item type:', itemType);
        
        // Ensure image is a valid URL
        const imageUrl = item.image && typeof item.image === 'string' && item.image.startsWith('http') 
          ? item.image 
          : undefined;
        
        // Ensure price is always > 0, estimate if needed
        let price = item.price || 0;
        const rating = item.rating || 0;
        
        if (price === 0) {
          // Estimate price based on type and rating
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
        
        const favoriteData = {
          userId: convexUser._id,
          itemId: itemId,
          itemType: itemType,
          name: item.name,
          location: item.location,
          price: price, // Always include price (estimated if needed)
          rating: rating,
          image: imageUrl,
          description: item.description || '',
        };
        
        console.log('💾 Favorite data to save:', favoriteData);
        const result = await addToFavorites(favoriteData);
        console.log('✅ Added to favorites, result:', result);
        Alert.alert('Thành công', 'Đã thêm vào yêu thích');
      }
    } catch (error: any) {
      console.error('❌ Error toggling favorite:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
    } finally {
      processingRef.current.delete(itemId);
    }
  };

  // Handle pagination
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || (newPage > currentPage && !hasMore)) return;
    
    setCurrentPage(newPage);
    setIsSearching(true);
    
    try {
      const hasQuery = searchQuery.trim().length > 0;
      const hasFilters = selectedFilters.interests.length > 0;
      const queryText = searchQuery.trim() || (hasFilters ? "Việt Nam" : "");
      
      const searchResult = await unifiedSearchAction({
        query: queryText,
        filters: {
          budget: selectedFilters.budget ? parseFloat(selectedFilters.budget) : undefined,
          duration: selectedFilters.duration ? parseFloat(selectedFilters.duration) : undefined,
          interests: selectedFilters.interests.length > 0 ? selectedFilters.interests : undefined,
          destination: queryText,
        },
        page: newPage,
        limit: itemsPerPage,
        origin: fromLocation ? getIataCode(fromLocation) : undefined,
        destination: toLocation ? getIataCode(toLocation) : undefined,
        departureDate: departureDate || undefined,
        returnDate: returnDate || undefined,
      });
      
      setSearchResults(searchResult.results || []);
      setTotalResults(searchResult.total || searchResult.results?.length || 0);
      setHasMore(searchResult.hasMore || false);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Search Result Item Component
  const SearchResultItem = ({ item }: { item: SearchResult }) => {
    const isFavorited = favoritedItemIds.has(item.id);
    const [imageError, setImageError] = useState(false);
    
    return (
      <View style={styles.resultCard}>
        <TouchableOpacity 
          style={styles.resultCardClickable}
          onPress={() => handleItemClick(item)}
          activeOpacity={0.85}
        >
          <View style={styles.resultImageContainer}>
            {!imageError && item.image && item.image.startsWith('http') ? (
              <Image 
                source={{ uri: item.image }} 
                style={styles.resultImage} 
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.resultImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
              </View>
            )}
            {Platform.OS === 'web' ? (
              <View
                style={styles.favoriteButton}
                {...({ 
                  onClick: (e: any) => {
                    console.log('🖱️ Heart button onClick (web)');
                    e?.stopPropagation?.();
                    e?.preventDefault?.();
                    handleToggleFavorite(item, e);
                  },
                  onMouseEnter: (e: any) => {
                    if (e?.currentTarget) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  },
                  onMouseLeave: (e: any) => {
                    if (e?.currentTarget) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
                    }
                  }
                } as any)}
              >
                <Ionicons
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorited ? "#FF6B6B" : "#666666"}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={(e) => {
                  console.log('🖱️ Heart button clicked');
                  if (e) {
                    e.stopPropagation?.();
                    e.preventDefault?.();
                  }
                  handleToggleFavorite(item, e);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorited ? "#FF6B6B" : "#666666"}
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.resultInfo}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <View style={styles.resultNameRow}>
                  {item.type === 'flight' && (
                    <Ionicons name="airplane" size={20} color={COLORS.primary} style={styles.typeIcon} />
                  )}
                  {item.type === 'hotel' && (
                    <Ionicons name="bed" size={20} color={COLORS.primary} style={styles.typeIcon} />
                  )}
                  {item.type === 'attraction' && (
                    <Ionicons name="location" size={20} color={COLORS.primary} style={styles.typeIcon} />
                  )}
                  {item.type === 'restaurant' && (
                    <Ionicons name="restaurant" size={20} color={COLORS.primary} style={styles.typeIcon} />
                  )}
                  <Text style={styles.resultName}>{item.name}</Text>
                </View>
                <View style={styles.resultLocationRow}>
                  <Ionicons name={item.type === 'flight' ? "airplane-outline" : "location-outline"} size={14} color={COLORS.textSecondary} />
                  <Text style={styles.resultLocation}>{item.location}</Text>
                </View>
              </View>
              {item.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
                  {typeof item.reviews === 'number' && item.reviews > 0 && (
                    <Text style={styles.reviewsText}>({item.reviews})</Text>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.resultDescription} numberOfLines={item.type === 'flight' ? 3 : 2}>
              {item.description || 'Không có mô tả'}
            </Text>
            {item.price && item.price > 0 && (
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {item.price.toLocaleString('vi-VN')} {String(item.currency || 'VND')}
                </Text>
                {item.type === 'flight' && (
                  <Text style={styles.pricePeriod}>/ người</Text>
                )}
                {item.type === 'hotel' && (
                  <Text style={styles.pricePeriod}>/ đêm</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              handleItemClick(item);
            }}
            // @ts-ignore
            onClick={(e: any) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              handleItemClick(item);
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
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <SearchResultItem item={item} />
  );

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity 
            style={styles.logo}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="airplane" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>TravelTour</Text>
          </TouchableOpacity>
          <View style={styles.navLinks}>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => {
                router.replace('/(tabs)');
              }}
            >
              <Text style={[
                styles.navLinkText,
                (currentRoute as any) === 'index' && styles.navLinkTextActive
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
            style={styles.profileIconButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {(() => {
              const avatarUrl = convexUser?.avatar || user?.imageUrl;
              return avatarUrl ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={[
                      styles.profileAvatar,
                      currentRoute === 'profile' && { borderColor: COLORS.primary }
                    ]}
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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.pageTitle}>Khám phá điểm đến</Text>
          <Text style={styles.pageSubtitle}>Tìm kiếm và khám phá những địa điểm tuyệt vời</Text>
          
          {/* Search Type Selector */}
          <View style={styles.searchTypeContainer}>
            <TouchableOpacity
              style={[styles.searchTypeButton, searchType === 'all' && styles.searchTypeButtonActive]}
              onPress={() => setSearchType('all')}
            >
              <Text style={[styles.searchTypeText, searchType === 'all' && styles.searchTypeTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchTypeButton, searchType === 'flight' && styles.searchTypeButtonActive]}
              onPress={() => setSearchType('flight')}
            >
              <Ionicons name="airplane" size={18} color={searchType === 'flight' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.searchTypeText, searchType === 'flight' && styles.searchTypeTextActive]}>
                Chuyến bay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchTypeButton, searchType === 'hotel' && styles.searchTypeButtonActive]}
              onPress={() => setSearchType('hotel')}
            >
              <Ionicons name="bed" size={18} color={searchType === 'hotel' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.searchTypeText, searchType === 'hotel' && styles.searchTypeTextActive]}>
                Khách sạn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchTypeButton, searchType === 'attraction' && styles.searchTypeButtonActive]}
              onPress={() => setSearchType('attraction')}
            >
              <Ionicons name="location" size={18} color={searchType === 'attraction' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.searchTypeText, searchType === 'attraction' && styles.searchTypeTextActive]}>
                Địa điểm tham quan
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            {searchType !== 'flight' && (
              <View style={styles.searchBar}>
                <Ionicons name="search" size={24} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm điểm đến, khách sạn, nhà hàng..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch()}
                />
                <TouchableOpacity 
                  style={styles.searchButton} 
                  onPress={() => handleSearch()}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {/* Optional Flight Search (only show when searchType is 'all' or 'flight') */}
            {(searchType === 'all' || searchType === 'flight') && (
            <View style={styles.flightSearchSection}>
              <Text style={styles.flightSearchLabel}>Thông tin chuyến bay</Text>
              <View style={styles.flightSearchRow}>
                <View style={styles.flightSearchField}>
                  <Text style={styles.flightSearchFieldLabel}>Từ</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.surfaceLight}`,
                        fontSize: 14,
                        backgroundColor: COLORS.white,
                        height: '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Chọn điểm đi</option>
                      <option value="Hà Nội">Hà Nội (HAN)</option>
                      <option value="Hồ Chí Minh">Hồ Chí Minh (SGN)</option>
                      <option value="Đà Nẵng">Đà Nẵng (DAD)</option>
                      <option value="Nha Trang">Nha Trang (CXR)</option>
                      <option value="Phú Quốc">Phú Quốc (PQC)</option>
                      <option value="Hải Phòng">Hải Phòng (HPH)</option>
                      <option value="Đà Lạt">Đà Lạt (DLI)</option>
                    </select>
                  ) : (
                    <TextInput
                      style={styles.flightSearchInput}
                      placeholder="Hà Nội"
                      value={fromLocation}
                      onChangeText={setFromLocation}
                    />
                  )}
                </View>
                <View style={styles.flightSearchField}>
                  <Text style={styles.flightSearchFieldLabel}>Đến</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.surfaceLight}`,
                        fontSize: 14,
                        backgroundColor: COLORS.white,
                        height: '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Chọn điểm đến</option>
                      <option value="Hà Nội">Hà Nội (HAN)</option>
                      <option value="Hồ Chí Minh">Hồ Chí Minh (SGN)</option>
                      <option value="Đà Nẵng">Đà Nẵng (DAD)</option>
                      <option value="Nha Trang">Nha Trang (CXR)</option>
                      <option value="Phú Quốc">Phú Quốc (PQC)</option>
                      <option value="Hải Phòng">Hải Phòng (HPH)</option>
                      <option value="Đà Lạt">Đà Lạt (DLI)</option>
                    </select>
                  ) : (
                    <TextInput
                      style={styles.flightSearchInput}
                      placeholder="Đà Nẵng"
                      value={toLocation}
                      onChangeText={setToLocation}
                    />
                  )}
                </View>
                <View style={styles.flightSearchField}>
                  <Text style={styles.flightSearchFieldLabel}>Ngày đi</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.surfaceLight}`,
                        fontSize: 14,
                        height: '38px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.flightSearchInput}
                      placeholder="YYYY-MM-DD"
                      value={departureDate}
                      onChangeText={setDepartureDate}
                    />
                  )}
                </View>
                <View style={styles.flightSearchField}>
                  <Text style={styles.flightSearchFieldLabel}>Ngày về</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.surfaceLight}`,
                        fontSize: 14,
                        height: '38px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.flightSearchInput}
                      placeholder="YYYY-MM-DD"
                      value={returnDate}
                      onChangeText={setReturnDate}
                    />
                  )}
                </View>
                <View style={styles.flightSearchField}>
                  <Text style={styles.flightSearchFieldLabel}>Người lớn</Text>
                  <View style={styles.guestControl}>
                    <TouchableOpacity style={styles.guestButton} onPress={() => setAdults(Math.max(1, adults - 1))}>
                      <Text style={styles.guestButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.guestValue}>{adults}</Text>
                    <TouchableOpacity style={styles.guestButton} onPress={() => setAdults(adults + 1)}>
                      <Text style={styles.guestButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {(searchType === 'flight' || searchType === 'all') && (
                  <View style={{ ...styles.flightSearchField, justifyContent: 'flex-end' }}>
                    <TouchableOpacity 
                      style={{
                        backgroundColor: COLORS.primary,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 38,
                        marginTop: 'auto'
                      }}
                      onPress={() => handleSearch()}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={{ color: COLORS.white, fontWeight: '600' }}>Tìm kiếm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            )}
          </View>

          {/* Filters */}
          {searchType !== 'flight' && (
            <View style={styles.filtersSection}>
            <Text style={styles.filterTitle}>Sở thích</Text>
            <View style={styles.filterChips}>
              {interestOptions.map((interest) => (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.filterChip,
                    selectedFilters.interests.includes(interest.id) && styles.filterChipActive
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                >
                  <Text style={styles.filterEmoji}>{interest.icon}</Text>
                  <Text style={[
                    styles.filterText,
                    selectedFilters.interests.includes(interest.id) && styles.filterTextActive
                  ]}>
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterTitle, { marginTop: 16 }]}>Ngân sách (VND)</Text>
            <View style={styles.filterChips}>
              {[
                { id: '', name: 'Tất cả' },
                { id: '1000000', name: '< 1 triệu' },
                { id: '2000000', name: '< 2 triệu' },
                { id: '5000000', name: '< 5 triệu' },
              ].map((budgetOption) => (
                <TouchableOpacity
                  key={budgetOption.id}
                  style={[
                    styles.filterChip,
                    selectedFilters.budget === budgetOption.id && styles.filterChipActive
                  ]}
                  onPress={() => {
                    setSelectedFilters(prev => ({ ...prev, budget: budgetOption.id }));
                    handleSearch({ budget: budgetOption.id });
                  }}
                >
                  <Text style={[
                    styles.filterText,
                    selectedFilters.budget === budgetOption.id && styles.filterTextActive
                  ]}>
                    {budgetOption.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          )}
        </View>

        {/* Popular Destinations */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Điểm đến phổ biến</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destinationsScroll}>
              {popularDestinations.map((destination, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.destinationCard}
                  onPress={async () => {
                    setSearchQuery(destination.name);
                    // Set filters based on destination categories
                    if (destination.categories && destination.categories.length > 0) {
                      setSelectedFilters(prev => ({
                        ...prev,
                        interests: destination.categories || []
                      }));
                    }
                    // Search with destination name and its categories
                    setIsSearching(true);
                    try {
                      const searchResult = await unifiedSearchAction({
                        query: destination.name,
                        filters: {
                          budget: selectedFilters.budget ? parseFloat(selectedFilters.budget) : undefined,
                          duration: selectedFilters.duration ? parseFloat(selectedFilters.duration) : undefined,
                          interests: destination.categories || undefined,
                          destination: destination.name,
                        },
                        page: 1,
                        limit: itemsPerPage,
                      });
                      setSearchResults(searchResult.results || []);
                      setTotalResults(searchResult.total || searchResult.results?.length || 0);
                      setHasMore(searchResult.hasMore || false);
                      setCurrentPage(1);
                    } catch (error) {
                      console.error('Error searching:', error);
                      setSearchResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                >
                  <Image source={{ uri: destination.image }} style={styles.destinationImage} resizeMode="cover" />
                  <View style={styles.destinationOverlay} />
                  <Text style={styles.destinationName}>{destination.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Results */}
        {(searchQuery.trim() || selectedFilters.interests.length > 0 || (fromLocation.trim() && toLocation.trim())) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSearching ? 'Đang tìm kiếm...' : 
                searchQuery.trim() 
                  ? (selectedFilters.interests.length > 0 
                      ? `Kết quả cho "${searchQuery}" (${selectedFilters.interests.map(id => interestOptions.find(i => i.id === id)?.name).filter(Boolean).join(', ')})`
                      : `Kết quả cho "${searchQuery}"`)
                  : `Kết quả theo danh mục: ${selectedFilters.interests.map(id => interestOptions.find(i => i.id === id)?.name).filter(Boolean).join(', ')}`}
            </Text>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
              </View>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <Text style={styles.resultsCount}>
                    {totalResults} kết quả
                    {searchType === 'flight' && ` (${searchResults.filter((r: SearchResult) => r.type === 'flight').length} chuyến bay)`}
                  </Text>
                )}
                {searchResults.length > 0 ? (
                  <>
                    {searchType === 'all' && searchResults.some(r => r.type === 'flight') && (
                      <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16, color: COLORS.text }}>✈️ Chuyến bay</Text>
                        <FlatList
                          data={searchResults.filter(r => r.type === 'flight')}
                          renderItem={renderSearchResult}
                          keyExtractor={(item) => item.id}
                          scrollEnabled={false}
                        />
                      </View>
                    )}
                    
                    {searchType === 'all' && searchResults.some(r => r.type !== 'flight') && (
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16, color: COLORS.text }}>🏨 Khách sạn & Điểm đến</Text>
                        <FlatList
                          data={searchResults.filter(r => r.type !== 'flight')}
                          renderItem={renderSearchResult}
                          keyExtractor={(item) => item.id}
                          scrollEnabled={false}
                        />
                      </View>
                    )}

                    {searchType !== 'all' && (
                      <FlatList
                        data={searchResults}
                        renderItem={renderSearchResult}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                      />
                    )}
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="airplane-outline" size={64} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>
                      {searchType === 'flight' ? 'Không tìm thấy chuyến bay' : 'Không tìm thấy kết quả'}
                    </Text>
                    {searchType === 'flight' && (
                      <Text style={styles.emptySubtext}>
                        Vui lòng kiểm tra lại thông tin: Từ, Đến, và Ngày đi
                      </Text>
                    )}
                  </View>
                )}
                {/* Pagination Controls */}
                {searchResults.length > 0 && totalResults > itemsPerPage && (
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && (styles.paginationButtonDisabled as any)
                      ]}
                      onPress={() => handlePageChange(currentPage - 1)}
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
                        (!hasMore || currentPage >= Math.ceil(totalResults / itemsPerPage)) && (styles.paginationButtonDisabled as any)
                      ]}
                      onPress={() => handlePageChange(currentPage + 1)}
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
            )}
          </View>
        )}
      </ScrollView>
      
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
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
        transition: 'color 0.2s',
        ':hover': {
          color: COLORS.primary,
        },
      },
    }),
  },
  navLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  searchSection: {
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: COLORS.surface,
  },
  pageTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 40,
  },
  searchContainer: {
    marginBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
    ...Platform.select({
      web: {
        outline: 'none',
        transition: 'all 0.2s ease',
        ':focus-within': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 4px ${COLORS.primary}15`,
        },
      },
    }),
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    ...Platform.select({
      web: {
        outline: 'none',
        borderWidth: 0,
        ':focus': {
          outline: 'none',
          borderWidth: 0,
        },
      },
    }),
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
      },
    }),
  },
  filtersSection: {
    marginTop: 8,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
          borderColor: COLORS.primaryLight,
        },
      },
    }),
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          ...SHADOWS.md,
        },
      },
    }),
  },
  filterEmoji: {
    fontSize: 18,
  },
  filterText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  section: {
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  destinationsScroll: {
    marginHorizontal: -40,
    paddingHorizontal: 40,
  },
  destinationCard: {
    width: 280,
    height: 200,
    borderRadius: RADIUS.xl,
    marginRight: SPACING.lg,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          transform: 'translateY(-6px) scale(1.02)',
          ...SHADOWS.xl,
        },
      },
    }),
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' as any,
  },
  destinationName: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.lg,
        },
      },
    }),
  },
  resultCardClickable: {
    flexDirection: 'row',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          transform: 'translateY(-2px)',
        },
      },
    }),
  },
  resultImageContainer: {
    position: 'relative',
    width: 200,
    height: 160,
  },
  resultImage: {
    width: 200,
    height: 160,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        ':hover': {
          backgroundColor: COLORS.white,
          transform: 'scale(1.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        },
        ':active': {
          transform: 'scale(0.95)',
        },
      },
    }),
  },
  resultInfo: {
    flex: 1,
    padding: 20,
    paddingBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeIcon: {
    marginRight: 4,
  },
  resultName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  resultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  resultDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 0,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.primaryLight,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  resultsCount: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    paddingHorizontal: 20,
  },
  paginationText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primaryLight,
        },
      },
    }),
  },
  searchTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  searchTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  searchTypeTextActive: {
    color: COLORS.white,
  },
  flightSearchSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  flightSearchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  flightSearchRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  flightSearchField: {
    flex: 1,
    minWidth: 150,
  },
  flightSearchFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  flightSearchInput: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: RADIUS.md,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  guestControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.background,
    padding: 3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    height: 38,
  },
  guestButton: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  guestValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'center',
  },
});

