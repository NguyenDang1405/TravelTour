import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Location {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface LocationPickerProps {
  value?: Location;
  onChange: (location: Location) => void;
  placeholder?: string;
  label?: string;
}

// Popular Vietnamese cities for quick selection
const popularLocations: Location[] = [
  {
    name: 'Hà Nội',
    address: 'Hà Nội, Việt Nam',
    coordinates: { lat: 21.0285, lng: 105.8542 }
  },
  {
    name: 'Hồ Chí Minh',
    address: 'Thành phố Hồ Chí Minh, Việt Nam',
    coordinates: { lat: 10.8231, lng: 106.6297 }
  },
  {
    name: 'Đà Nẵng',
    address: 'Đà Nẵng, Việt Nam',
    coordinates: { lat: 16.0544, lng: 108.2022 }
  },
  {
    name: 'Hội An',
    address: 'Hội An, Quảng Nam, Việt Nam',
    coordinates: { lat: 15.8801, lng: 108.3380 }
  },
  {
    name: 'Huế',
    address: 'Huế, Thừa Thiên Huế, Việt Nam',
    coordinates: { lat: 16.4637, lng: 107.5909 }
  },
  {
    name: 'Nha Trang',
    address: 'Nha Trang, Khánh Hòa, Việt Nam',
    coordinates: { lat: 12.2388, lng: 109.1967 }
  },
  {
    name: 'Phú Quốc',
    address: 'Phú Quốc, Kiên Giang, Việt Nam',
    coordinates: { lat: 10.2899, lng: 103.9840 }
  },
  {
    name: 'Sapa',
    address: 'Sapa, Lào Cai, Việt Nam',
    coordinates: { lat: 22.3364, lng: 103.8440 }
  },
];

export default function LocationPicker({ 
  value, 
  onChange, 
  placeholder = "Chọn hoặc tìm kiếm địa điểm",
  label = "Địa điểm"
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showPopular, setShowPopular] = useState(false);

  // Simple geocoding function (can be replaced with API call)
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // For now, we'll do a simple text match with popular locations
      // In production, you'd call a geocoding API here
      const filtered = popularLocations.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.address.toLowerCase().includes(query.toLowerCase())
      );

      // If no match in popular locations, create a mock result
      if (filtered.length === 0) {
        setSearchResults([{
          name: query,
          address: `${query}, Việt Nam`,
          coordinates: { lat: 0, lng: 0 } // Would be filled by geocoding API
        }]);
      } else {
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchLocation(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelectLocation = (location: Location) => {
    onChange(location);
    setSearchQuery('');
    setShowResults(false);
    setShowPopular(false);
  };

  const displayValue = value ? `${value.name}${value.address !== value.name ? ` - ${value.address}` : ''}` : '';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <Ionicons name="location" size={20} color={COLORS.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery || displayValue}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowResults(true);
            setShowPopular(false);
            if (value && text !== displayValue) {
              onChange({ name: '', address: '', coordinates: { lat: 0, lng: 0 } });
            }
          }}
          onFocus={() => {
            if (!value) {
              setShowPopular(true);
            }
            setShowResults(true);
          }}
        />
        {value && (
          <TouchableOpacity
            onPress={() => {
              onChange({ name: '', address: '', coordinates: { lat: 0, lng: 0 } });
              setSearchQuery('');
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowPopular(!showPopular)}
          style={styles.popularButton}
        >
          <Ionicons 
            name={showPopular ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Popular Locations */}
      {showPopular && !searchQuery && (
        <View style={styles.popularContainer}>
          <Text style={styles.popularTitle}>Địa điểm phổ biến</Text>
          <FlatList
            data={popularLocations}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.popularItem}
                onPress={() => handleSelectLocation(item)}
              >
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <View style={styles.popularItemText}>
                  <Text style={styles.popularItemName}>{item.name}</Text>
                  <Text style={styles.popularItemAddress}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Search Results */}
      {showResults && searchQuery && (
        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                  <View style={styles.resultItemText}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemAddress}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Không tìm thấy địa điểm</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        ':focus-within': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }),
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outline: 'none',
      },
    }),
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  popularButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  popularContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }),
  },
  popularItemText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  popularItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  popularItemAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultsContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    ...SHADOWS.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }),
  },
  resultItemText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  resultItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  resultItemAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noResults: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
