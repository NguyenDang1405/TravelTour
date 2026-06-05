import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useItemStore } from '@/store/useItemStore';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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

interface ExploreMobileProps {
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

export default function ExploreMobile({ user, convexUser }: ExploreMobileProps) {
  const router = useRouter();
  const { setSelectedItem } = useItemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    budget: '',
    duration: '',
    interests: [] as string[],
  });
  // Search type selector: 'all' | 'flight' | 'hotel' | 'attraction'
  const [searchType, setSearchType] = useState<'all' | 'flight' | 'hotel' | 'attraction'>('all');
  // Flight search fields (optional)
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const popularDestinations = [
    { name: "Đà Nẵng", type: "destination", image: "🏖️", categories: ["beach", "city"] },
    { name: "Phú Quốc", type: "destination", image: "🏝️", categories: ["beach", "nature"] },
    { name: "Hạ Long", type: "destination", image: "⛵", categories: ["nature", "adventure"] },
    { name: "Hội An", type: "destination", image: "🏮", categories: ["culture", "city"] },
    { name: "Sapa", type: "destination", image: "🏔️", categories: ["nature", "adventure"] },
    { name: "Nha Trang", type: "destination", image: "🌊", categories: ["beach", "city"] },
  ];

  const interestOptions = [
    { id: 'beach', name: 'Biển', icon: '🏖️', color: '#0EA5E9' },
    { id: 'culture', name: 'Văn hóa', icon: '🏛️', color: '#8B5CF6' },
    { id: 'adventure', name: 'Phiêu lưu', icon: '🧗', color: '#F59E0B' },
    { id: 'food', name: 'Ẩm thực', icon: '🍜', color: '#EF4444' },
    { id: 'nature', name: 'Thiên nhiên', icon: '🌿', color: '#10B981' },
    { id: 'city', name: 'Thành phố', icon: '🏙️', color: '#6366F1' },
  ];

  // Convex actions - Use unified search
  const unifiedSearchAction = useAction(api.api.unifiedSearch);

  const handleSearch = async () => {
    // Logic: 
    // 1. Nếu có text query → search với text
    // 2. Nếu chỉ có filters (không có text) → search với filters (dùng default location)
    // 3. Nếu không có cả hai → không search
    const hasQuery = searchQuery.trim().length > 0;
    const hasFilters = selectedFilters.interests.length > 0;
    
    if (!hasQuery && !hasFilters) {
      // Không có gì để search
      return;
    }
    
    setIsSearching(true);
    try {
      // Determine search query: ưu tiên user input, nếu không có thì dùng destination của flight, nếu có filter thì dùng Việt Nam
      const searchQueryText = searchQuery.trim() || toLocation.trim() || (hasFilters ? "Việt Nam" : "");
      
      console.log('Searching with:', {
        query: searchQueryText,
        filters: selectedFilters.interests,
        hasQuery,
        hasFilters
      });
      const shouldSearchFlights = searchType === 'flight' || (fromLocation.trim() && toLocation.trim() && departureDate.trim());
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const dateString = defaultDate.toISOString().split('T')[0];
      
      // Map Vietnamese names to IATA codes for Amadeus API
      const getIataCode = (locationName: string) => {
        if (!locationName) return undefined;
        const locMap: Record<string, string> = {
          'Hà Nội': 'HAN', 'Hồ Chí Minh': 'SGN', 'Đà Nẵng': 'DAD',
          'Phú Quốc': 'PQC', 'Nha Trang': 'CXR', 'Hải Phòng': 'HPH',
          'Đà Lạt': 'DLI', 'Huế': 'HUI', 'Cần Thơ': 'VCA',
          'Vinh': 'VII', 'Buôn Ma Thuột': 'BMV', 'Quy Nhơn': 'UIH'
        };
        if (locationName.trim().length === 3) return locationName.trim().toUpperCase();
        for (const [key, value] of Object.entries(locMap)) {
          if (locationName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(locationName.toLowerCase())) {
            return value;
          }
        }
        return locationName.trim().toUpperCase();
      };
      
      const flightOrigin = shouldSearchFlights ? (getIataCode(fromLocation) || 'HAN') : undefined;
      const flightDestination = shouldSearchFlights ? (getIataCode(toLocation) || 'DAD') : undefined;
      const flightDate = shouldSearchFlights ? (departureDate.trim() || dateString) : undefined;

      const searchResult = await unifiedSearchAction({
        query: searchQueryText,
        filters: {
          budget: selectedFilters.budget ? parseFloat(selectedFilters.budget) : undefined,
          duration: selectedFilters.duration ? parseFloat(selectedFilters.duration) : undefined,
          interests: selectedFilters.interests.length > 0 ? selectedFilters.interests : undefined,
          destination: searchQueryText,
        },
        origin: flightOrigin,
        destination: flightDestination,
        departureDate: flightDate,
        returnDate: undefined,
        adults: adults,
      });

      // Mobile: keep real image URLs from backend; fallback to emoji only if no usable URL
      let mappedResults = (searchResult.results || []).map((item: any) => ({
        ...item,
        image:
          typeof item.image === 'string' && item.image.startsWith('http')
            ? item.image
            : item.type === 'attraction' ? '🏰' :
              item.type === 'restaurant' ? '🦐' :
              item.type === 'hotel' ? '🏨' :
              item.type === 'flight' ? '✈️' :
              item.image || '📍',
      }));

      // Filter results by selected search type
      if (searchType !== 'all') {
        mappedResults = mappedResults.filter((item: SearchResult) => {
          if (searchType === 'flight') return item.type === 'flight';
          if (searchType === 'hotel') return item.type === 'hotel';
          if (searchType === 'attraction') return item.type === 'attraction' || item.type === 'restaurant';
          return true;
        });
      }

      // If user selected "flight" but no flights found, check if they provided flight params
      if (searchType === 'flight' && mappedResults.length === 0) {
        const hasFlightParams = fromLocation && toLocation && departureDate;
        if (!hasFlightParams) {
          console.log('⚠️ Flight search selected but missing required params (from/to/date)');
        }
      }

      console.log('Search results:', mappedResults.length);
      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error searching:', error);
      // Fallback to empty results
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleInterest = async (interestId: string) => {
    const newInterests = selectedFilters.interests.includes(interestId)
      ? selectedFilters.interests.filter(id => id !== interestId)
      : [...selectedFilters.interests, interestId];
    
    setSelectedFilters(prev => ({
      ...prev,
      interests: newInterests
    }));

    // Auto-search when filter changes
    // Logic: Nếu có query text → search với text + filter mới
    //        Nếu không có query text nhưng có filter → search với filter (dùng default location)
    const hasQuery = searchQuery.trim().length > 0;
    const hasFilters = newInterests.length > 0;
    
    if (!hasQuery && !hasFilters) {
      // Nếu bỏ hết filters và không có query → clear results
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Use search query if available, otherwise use default location for filter-only search
      const queryText = searchQuery.trim() || (hasFilters ? "Việt Nam" : "");
      
      console.log('Filter changed, searching with:', {
        query: queryText,
        filters: newInterests,
        hasQuery,
        hasFilters
      });
      
      const searchResult = await unifiedSearchAction({
        query: queryText,
        filters: {
          budget: selectedFilters.budget ? parseFloat(selectedFilters.budget) : undefined,
          duration: selectedFilters.duration ? parseFloat(selectedFilters.duration) : undefined,
          interests: newInterests.length > 0 ? newInterests : undefined,
          destination: queryText || undefined,
        },
        // Include flights if user provided from/to/date
        origin: fromLocation && toLocation ? fromLocation : undefined,
        destination: fromLocation && toLocation ? toLocation : undefined,
        departureDate: fromLocation && toLocation && departureDate ? departureDate : undefined,
        returnDate: undefined,
        adults: adults,
      });

      // Mobile: keep real image URLs from backend; fallback to emoji only if no usable URL
      let mappedResults = (searchResult.results || []).map((item: any) => ({
        ...item,
        image:
          typeof item.image === 'string' && item.image.startsWith('http')
            ? item.image
            : item.type === 'attraction' ? '🏰' :
              item.type === 'restaurant' ? '🦐' :
              item.type === 'hotel' ? '🏨' :
              item.type === 'flight' ? '✈️' :
              item.image || '📍',
      }));

      console.log('Filter search results:', mappedResults.length);
      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error searching with filter:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
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

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => handleItemClick(item)}
    >
      <View style={styles.resultImage}>
        {typeof item.image === 'string' && item.image.startsWith('http') ? (
          <Image
            source={{ uri: item.image }}
            style={styles.resultPhoto}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.resultEmoji}>{item.image}</Text>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultLocation}>{item.location}</Text>
        <Text style={styles.resultDescription}>{item.description}</Text>
        <View style={styles.resultFooter}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={moderateScale(14)} color="#FFD700" />
            <Text style={styles.rating}>
              {item.rating ? Number(item.rating).toFixed(1) : '0.0'}
              {typeof item.reviews === 'number' && item.reviews > 0 ? ` (${String(item.reviews)})` : ''}
            </Text>
          </View>
          {item.price && (
            <Text style={styles.price}>
              {item.price.toLocaleString('vi-VN')} {String(item.currency || 'VND')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Khám phá</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/ai-chat')}
          >
            <Ionicons name="sparkles" size={moderateScale(24)} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={moderateScale(24)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Type Selector */}
      <View style={styles.searchTypeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchTypeScroll}>
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
            <Ionicons name="airplane" size={moderateScale(16)} color={searchType === 'flight' ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.searchTypeText, searchType === 'flight' && styles.searchTypeTextActive]}>
              Chuyến bay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchTypeButton, searchType === 'hotel' && styles.searchTypeButtonActive]}
            onPress={() => setSearchType('hotel')}
          >
            <Ionicons name="bed" size={moderateScale(16)} color={searchType === 'hotel' ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.searchTypeText, searchType === 'hotel' && styles.searchTypeTextActive]}>
              Khách sạn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchTypeButton, searchType === 'attraction' && styles.searchTypeButtonActive]}
            onPress={() => setSearchType('attraction')}
          >
            <Ionicons name="location" size={moderateScale(16)} color={searchType === 'attraction' ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.searchTypeText, searchType === 'attraction' && styles.searchTypeTextActive]}>
              Địa điểm
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={moderateScale(20)} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm điểm đến, khách sạn, nhà hàng..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="arrow-forward" size={moderateScale(20)} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Optional Flight Search (only show when searchType is 'all' or 'flight') */}
      {(searchType === 'all' || searchType === 'flight') && (
      <View style={styles.flightSearchSection}>
        <Text style={styles.flightSearchLabel}>Thông tin chuyến bay</Text>
        <View style={styles.flightSearchRow}>
          <View style={styles.flightSearchField}>
            <Text style={styles.flightSearchFieldLabel}>Từ</Text>
            <TextInput
              style={styles.flightSearchInput}
              placeholder="HAN"
              value={fromLocation}
              onChangeText={setFromLocation}
            />
          </View>
          <View style={styles.flightSearchField}>
            <Text style={styles.flightSearchFieldLabel}>Đến</Text>
            <TextInput
              style={styles.flightSearchInput}
              placeholder="DAD"
              value={toLocation}
              onChangeText={setToLocation}
            />
          </View>
          <View style={styles.flightSearchField}>
            <Text style={styles.flightSearchFieldLabel}>Ngày đi</Text>
            <TextInput
              style={styles.flightSearchInput}
              placeholder="YYYY-MM-DD"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
          </View>
          <View style={styles.flightSearchField}>
            <Text style={styles.flightSearchFieldLabel}>Người lớn</Text>
            <View style={styles.guestControl}>
              <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))}>
                <Text style={styles.guestButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.guestValue}>{adults}</Text>
              <TouchableOpacity onPress={() => setAdults(adults + 1)}>
                <Text style={styles.guestButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersContent}>
          {interestOptions.map((interest) => {
            const isActive = selectedFilters.interests.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.filterChip,
                  isActive && [styles.filterChipActive, { 
                    backgroundColor: interest.color,
                    borderColor: interest.color,
                  }]
                ]}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.filterEmojiContainer,
                  isActive && [styles.filterEmojiContainerActive, {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }],
                  !isActive && {
                    backgroundColor: `${interest.color}15`,
                  }
                ]}>
                  <Text style={styles.filterEmoji}>{interest.icon}</Text>
                </View>
                <Text style={[
                  styles.filterText,
                  isActive && styles.filterTextActive
                ]}>
                  {interest.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Popular Destinations */}
      {!searchQuery && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Điểm đến phổ biến</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                    });

                    // Map results to include emoji for mobile
                    let mappedResults = (searchResult.results || []).map((item: any) => ({
                      ...item,
                      image:
                        typeof item.image === 'string' && item.image.startsWith('http')
                          ? item.image
                          : item.type === 'attraction' ? '🏰' :
                            item.type === 'restaurant' ? '🦐' :
                            item.type === 'hotel' ? '🏨' :
                            item.type === 'flight' ? '✈️' :
                            item.image || '📍',
                    }));

                    // Filter results by selected search type
                    if (searchType !== 'all') {
                      mappedResults = mappedResults.filter((item: SearchResult) => {
                        if (searchType === 'flight') return item.type === 'flight';
                        if (searchType === 'hotel') return item.type === 'hotel';
                        if (searchType === 'attraction') return item.type === 'attraction';
                        return true;
                      });
                    }

                    setSearchResults(mappedResults);
                  } catch (error) {
                    console.error('Error searching:', error);
                    setSearchResults([]);
                  } finally {
                    setIsSearching(false);
                  }
                }}
              >
                <Text style={styles.destinationEmoji}>{destination.image}</Text>
                <Text style={styles.destinationName}>{destination.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Results */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {(searchQuery.trim() || selectedFilters.interests.length > 0) && (
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
              <View>
                {searchResults.map((item) => (
                  <View key={item.id}>
                    {renderSearchResult({ item })}
                  </View>
                ))}
                {searchResults.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={moderateScale(64)} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  headerButton: {
    padding: scale(8),
  },
  filterButton: {
    padding: scale(8),
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(20),
    gap: scale(12),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(12),
    minHeight: verticalScale(50),
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: moderateScale(16),
    minHeight: verticalScale(22),
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: scale(50),
    minHeight: verticalScale(50),
  },
  searchTypeContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: COLORS.background,
  },
  searchTypeScroll: {
    gap: scale(8),
    paddingRight: scale(16),
  },
  searchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceLight,
    marginRight: scale(8),
  },
  searchTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  searchTypeText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  searchTypeTextActive: {
    color: COLORS.white,
  },
  filtersContainer: {
    marginBottom: verticalScale(24),
    paddingHorizontal: scale(20),
  },
  filtersContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    gap: scale(8),
    minHeight: verticalScale(36),
    borderWidth: 1.5,
    borderColor: COLORS.border || '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  filterChipActive: {
    elevation: 5,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowColor: '#000',
  },
  filterEmojiContainer: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.surfaceLight || '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterEmojiContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterEmoji: {
    fontSize: moderateScale(16),
  },
  filterText: {
    fontSize: moderateScale(14),
    color: COLORS.text,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: verticalScale(16),
    letterSpacing: -0.5,
  },
  destinationCard: {
    backgroundColor: COLORS.surface,
    padding: scale(20),
    borderRadius: scale(16),
    marginRight: scale(12),
    alignItems: 'center',
    minWidth: scale(100),
  },
  destinationEmoji: {
    fontSize: moderateScale(40),
    marginBottom: verticalScale(8),
  },
  destinationName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
  },
  resultImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(12),
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    overflow: 'hidden',
  },
  resultPhoto: {
    width: '100%',
    height: '100%',
  },
  resultEmoji: {
    fontSize: moderateScale(28),
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  resultLocation: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(6),
  },
  resultDescription: {
    fontSize: moderateScale(13),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(18),
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  rating: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: COLORS.text,
  },
  price: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: COLORS.primary,
  },
  flightSearchSection: {
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    marginHorizontal: scale(16),
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  flightSearchLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: verticalScale(12),
  },
  flightSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  flightSearchField: {
    flex: 1,
    minWidth: scale(120),
  },
  flightSearchFieldLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: verticalScale(6),
    textTransform: 'uppercase',
  },
  flightSearchInput: {
    backgroundColor: COLORS.background,
    padding: scale(12),
    borderRadius: scale(8),
    fontSize: moderateScale(14),
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  guestControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: COLORS.background,
    padding: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  guestButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(6),
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.primary,
  },
  guestValue: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.text,
    minWidth: scale(30),
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    gap: verticalScale(16),
  },
  loadingText: {
    fontSize: moderateScale(16),
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    gap: verticalScale(16),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});

