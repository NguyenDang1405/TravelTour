import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

// Helper function to map city names to Amadeus city codes
function getCityCode(cityName: string): string | null {
  const cityCodeMap: Record<string, string> = {
    "hà nội": "HAN",
    "hanoi": "HAN",
    "hồ chí minh": "SGN",
    "ho chi minh": "SGN",
    "sài gòn": "SGN",
    "saigon": "SGN",
    "đà nẵng": "DAD",
    "da nang": "DAD",
    "danang": "DAD",
    "nha trang": "CXR",
    "nhatrang": "CXR",
    "phú quốc": "PQC",
    "phu quoc": "PQC",
    "hạ long": "VDO",
    "ha long": "VDO",
    "halong": "VDO",
    "hội an": "DAD",
    "hoi an": "DAD",
    "hoian": "DAD",
    "huế": "HUI",
    "hue": "HUI",
    "đà lạt": "DLI",
    "da lat": "DLI",
    "dalat": "DLI",
    "cần thơ": "VCA",
    "can tho": "VCA",
    "cantho": "VCA",
    "sapa": "HAN", // Sapa uses Hanoi airport
    "vũng tàu": "VTG",
    "vung tau": "VTG",
    "quy nhơn": "UIH",
    "quy nhon": "UIH",
    "phan thiết": "PAN",
    "phan thiet": "PAN",
    "buôn ma thuột": "BMV",
    "buon ma thuot": "BMV",
    "pleiku": "PXU",
    "vinh": "VII",
    "thanh hóa": "THD",
    "thanh hoa": "THD",
    "điện biên": "DIN",
    "dien bien": "DIN",
  };
  
  const normalizedName = cityName.toLowerCase().trim();
  return cityCodeMap[normalizedName] || null;
}

// Generate a fake but deterministic rating based on name string
function generateFakeRating(name: string): number {
  if (!name) return 4.0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const normalized = Math.abs(hash) % 9; // 0 to 8
  return 4.0 + (normalized * 0.1); // 4.0 to 4.8
}

// Amadeus API integration for hotels and flights
export const searchHotels = action({
  args: {
    cityCode: v.optional(v.string()), // Can be city code or city name
    cityName: v.optional(v.string()), // Alternative: city name
    checkInDate: v.optional(v.string()),
    checkOutDate: v.optional(v.string()),
    adults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    // Note: Amadeus API has been deprecated. Hotels are now sourced from SerpAPI (in unifiedSearch)
    // and mock data as fallback. Duffel API only supports flight search.
    console.log(`[searchHotels] Using mock data (Amadeus deprecated, hotels sourced via SerpAPI in unifiedSearch)`);
    return await ctx.runAction(api.api.getMockHotels, {
      city: args.cityName || "Đà Nẵng",
    });
  },
});

// Get hotel details by hotelId (uses mock data since Amadeus is deprecated)
export const getHotelById = action({
  args: {
    hotelId: v.string(),
    cityName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Amadeus API has been deprecated. Use mock data for hotel details.
    console.log(`[getHotelById] Looking up hotel ${args.hotelId} from mock data (Amadeus deprecated)`);
    const mockHotels = await ctx.runAction(api.api.getMockHotels, {
      city: args.cityName || "Đà Nẵng",
    });
    return mockHotels.find((h: any) => String(h.id) === String(args.hotelId)) || null;
  },
});
export const searchFlights = action({
  args: {
    origin: v.string(),
    destination: v.string(),
    departureDate: v.string(),
    adults: v.optional(v.number()),
    returnDate: v.optional(v.string()),
    max: v.optional(v.number()), // Max number of results
  },
  handler: async (ctx, args) => {
    const DUFFEL_API_TOKEN = process.env.DUFFEL_API_TOKEN;

    if (!DUFFEL_API_TOKEN) {
      console.warn("⚠️ Duffel API token not configured");
      throw new Error("Duffel API token not configured");
    }

    try {
      console.log(`[searchFlights] 🔍 Searching flights (Duffel): ${args.origin} → ${args.destination}, Date: ${args.departureDate}, Adults: ${args.adults || 1}`);
      
      // Build slices for Duffel API
      const slices: any[] = [
        {
          origin: args.origin.toUpperCase(),
          destination: args.destination.toUpperCase(),
          departure_date: args.departureDate,
        },
      ];

      // Add return slice if round trip
      if (args.returnDate) {
        slices.push({
          origin: args.destination.toUpperCase(),
          destination: args.origin.toUpperCase(),
          departure_date: args.returnDate,
        });
      }

      // Build passengers array
      const passengers: any[] = [];
      const adultCount = args.adults || 1;
      for (let i = 0; i < adultCount; i++) {
        passengers.push({ type: "adult" });
      }

      // Create offer request
      const response = await fetch("https://api.duffel.com/air/offer_requests", {
        method: "POST",
        headers: {
          "Accept-Encoding": "gzip",
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Duffel-Version": "v2",
          "Authorization": `Bearer ${DUFFEL_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            slices,
            passengers,
            max_connections: 1,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[searchFlights] ❌ Duffel API error ${response.status}:`, errorText);
        throw new Error(`Duffel API error: ${response.status}`);
      }

      const duffelData = await response.json();
      const offers = duffelData?.data?.offers || [];
      
      console.log(`[searchFlights] ✅ Duffel returned ${offers.length} flight offers`);

      // Transform Duffel response to match the format expected by unifiedSearch
      // (compatible with the old Amadeus format)
      const maxResults = args.max || 10;
      const transformedOffers = offers.slice(0, maxResults).map((offer: any) => {
        const firstSlice = offer.slices?.[0];
        const segments = firstSlice?.segments || [];
        const firstSeg = segments[0];
        const lastSeg = segments[segments.length - 1];
        
        // Map carrier info
        const carrierCode = firstSeg?.marketing_carrier?.iata_code || firstSeg?.operating_carrier?.iata_code || "XX";
        const airlineName = firstSeg?.marketing_carrier?.name || carrierCode;
        
        // Build itineraries in Amadeus-compatible format
        const itineraries = offer.slices?.map((slice: any) => {
          const sliceSegments = slice.segments || [];
          
          // Calculate duration from first departure to last arrival
          const firstDep = sliceSegments[0]?.departing_at;
          const lastArr = sliceSegments[sliceSegments.length - 1]?.arriving_at;
          let duration = slice.duration || "";
          
          if (!duration && firstDep && lastArr) {
            const depTime = new Date(firstDep).getTime();
            const arrTime = new Date(lastArr).getTime();
            const diffMs = arrTime - depTime;
            const hours = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            duration = `PT${hours}H${mins}M`;
          }

          return {
            duration,
            segments: sliceSegments.map((seg: any) => ({
              departure: {
                iataCode: seg.origin?.iata_code || "",
                at: seg.departing_at || "",
              },
              arrival: {
                iataCode: seg.destination?.iata_code || "",
                at: seg.arriving_at || "",
              },
              carrierCode: seg.marketing_carrier?.iata_code || "",
              operating: {
                carrierCode: seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code || "",
              },
              number: seg.marketing_carrier_flight_number || "",
              aircraft: {
                code: seg.aircraft?.iata_code || "",
              },
              duration: seg.duration || "",
            })),
          };
        }) || [];

        // Build carriers dictionary
        const carriersDict: Record<string, string> = {};
        for (const slice of (offer.slices || [])) {
          for (const seg of (slice.segments || [])) {
            const code = seg.marketing_carrier?.iata_code;
            const name = seg.marketing_carrier?.name;
            if (code && name) {
              carriersDict[code] = name;
            }
          }
        }

        return {
          id: offer.id || `duffel_${carrierCode}_${offer.total_amount}`,
          price: {
            total: offer.total_amount || "0",
            currency: offer.total_currency || "USD",
          },
          itineraries,
          dictionaries: {
            carriers: carriersDict,
          },
        };
      });

      // Build combined carriers dictionary
      const allCarriers: Record<string, string> = {};
      for (const offer of transformedOffers) {
        Object.assign(allCarriers, offer.dictionaries?.carriers || {});
      }

      // Return in Amadeus-compatible format for unifiedSearch
      return {
        data: transformedOffers,
        dictionaries: {
          carriers: allCarriers,
        },
      };
    } catch (error: any) {
      console.error("[searchFlights] ❌ Error:", error?.message || error);
      throw new Error(`Failed to fetch flight data: ${error?.message || 'Unknown error'}`);
    }
  },
});

// Foursquare Places API integration for attractions and restaurants
// Free tier: 1,000 requests/day, no credit card required

// Helper function to search Foursquare places
async function searchFoursquarePlaces(
  location: string,
  categoryId: string,
  apiKey: string,
  limit: number = 50 // Increased limit to get more results
) {
  // Foursquare API v3 requires Authorization header with API key
  // Try different formats: Bearer, fsq3 prefix, or direct
  console.log('Foursquare API key (first 15 chars):', apiKey.substring(0, 15) + '...');
  
  // Try formats in order: Bearer, direct, fsq3 prefix
  const formats = [
    `Bearer ${apiKey}`,           // Format 1: Bearer token
    apiKey,                       // Format 2: Direct key
    `fsq3${apiKey}`,              // Format 3: With fsq3 prefix
  ];
  
  let response: Response | null = null;
  let lastError: string = '';
  
  for (const authHeader of formats) {
    try {
      // Use higher limit to get more results (max 50 for free tier)
      response = await fetch(
        `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(location)}&categories=${categoryId}&limit=${limit}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": authHeader,
          },
        }
      );
      
      if (response.ok) {
        console.log(`✅ Foursquare API success with format: ${authHeader.substring(0, 20)}... (limit: ${limit})`);
        break;
      }
      
      if (response.status !== 401) {
        // If not 401, don't try other formats
        break;
      }
      
      const errorText = await response.text();
      lastError = errorText;
      console.log(`❌ Format failed (401): ${authHeader.substring(0, 20)}...`);
    } catch (error: any) {
      lastError = error.message;
      console.log(`❌ Format error: ${authHeader.substring(0, 20)}...`);
    }
  }
  
  if (!response) {
    throw new Error('Failed to make Foursquare API request');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Foursquare API error ${response.status}:`, errorText);
    console.error('Tried all formats, all failed. Please check API key in Foursquare Developer Portal.');
    throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Foursquare returned ${data.results?.length || 0} results for ${location}`);
  return data;
}

// Helper function to search places using Geoapify Places API
// Uses Circle filter (radius search) - BEST method for finding places near a location
async function searchGeoapifyPlaces(
  location: string,
  category: 'attraction' | 'restaurant',
  apiKey: string,
  limit: number = 6 // Default to 6 items per region
) {
  console.log(`[Geoapify] Searching for: ${location} (${category})`);
  
  try {
    // Step 1: Geocode location to get coordinates
    const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location + ', Vietnam')}&limit=1&apiKey=${apiKey}`;
      
    const geocodeResponse = await fetch(geocodeUrl, {
        headers: { "Accept": "application/json" },
      });
      
    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text().catch(() => 'Unknown error');
      console.log(`[Geoapify] ⚠️ Geocoding failed: ${errorText.substring(0, 200)}`);
      throw new Error(`Geoapify Geocoding error: ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.features || geocodeData.features.length === 0) {
      console.log(`[Geoapify] ⚠️ No geocoding results for: ${location}`);
      throw new Error('No geocoding results');
  }
  
    const feature = geocodeData.features[0];
    const lat = feature.geometry.coordinates[1];
    const lon = feature.geometry.coordinates[0];
    const placeId = feature.properties.place_id;
    
    console.log(`[Geoapify] ✅ Geocoded: lat=${lat}, lon=${lon}`);
    
    // Step 2: Search places using Circle filter (radius search) - BEST method
    const categories = category === 'restaurant' 
      ? 'catering.restaurant' 
      : 'tourism.sights';
    
    // Use the provided limit (default 5 per region)
    const searchLimit = Math.min(limit, 20); // API max is 20, but we want 5 per region
    
    // Try multiple formats in order of preference
    const formats = [
      // Format 1: Circle filter with categories (5km radius) - BEST for nearby search
      `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lon},${lat},5000&limit=${searchLimit}&apiKey=${apiKey}`,
      // Format 2: Place filter (search in entire city) - Good fallback
      placeId ? `https://api.geoapify.com/v2/places?categories=${categories}&filter=place:${placeId}&limit=${searchLimit}&apiKey=${apiKey}` : null,
      // Format 3: Circle without categories (broader search)
      `https://api.geoapify.com/v2/places?filter=circle:${lon},${lat},5000&limit=${searchLimit}&apiKey=${apiKey}`,
    ].filter(Boolean) as string[];
    
    let response: Response | null = null;
    let lastError: string = '';
    
    for (const endpoint of formats) {
      try {
      response = await fetch(endpoint, {
          headers: { "Accept": "application/json" },
      });
      
        if (response.ok) {
          console.log(`[Geoapify] ✅ Places API success`);
          break;
        }
        
        if (response.status !== 400) {
          const errorText = await response.text().catch(() => 'Unknown error');
          lastError = `Status ${response.status}: ${errorText}`;
          console.log(`[Geoapify] ⚠️ Format failed (${response.status})`);
          break;
        }
        
      const errorText = await response.text().catch(() => 'Unknown error');
        lastError = errorText;
        console.log(`[Geoapify] ⚠️ Format failed (400), trying next...`);
      } catch (error: any) {
        lastError = error.message;
      }
    }
    
    if (!response || !response.ok) {
      const errorText = lastError || 'Unknown error';
      console.error(`[Geoapify] ❌ API error: ${errorText.substring(0, 200)}`);
      throw new Error(`Geoapify API error: ${response?.status || 'network'} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Geoapify] ✅ Found ${data.features?.length || 0} results`);
    
    if (!data.features || data.features.length === 0) {
      return [];
    }
    
    // Filter by category if we didn't use categories in the query
    let filteredFeatures = data.features;
    if (category === 'attraction') {
      filteredFeatures = data.features.filter((f: any) => {
        const cats = f.properties.categories || [];
        return cats.some((c: string) => c.startsWith('tourism') || c.includes('attraction') || c.includes('sight'));
      });
    } else if (category === 'restaurant') {
      filteredFeatures = data.features.filter((f: any) => {
        const cats = f.properties.categories || [];
        return cats.some((c: string) => c.startsWith('catering') || c.includes('restaurant') || c.includes('food'));
      });
    }
    
    // Helper function to get image - Try Wikipedia first for attractions, fallback to curated images
    async function getPlaceImage(placeName: string, category: string, location: string): Promise<string> {
      const WIKIPEDIA_ACCESS_TOKEN = process.env.WIKIPEDIA_ACCESS_TOKEN;
      
      // Try Wikipedia for attractions (not restaurants - they usually don't have Wikipedia pages)
      if (category === 'attraction' && WIKIPEDIA_ACCESS_TOKEN) {
        try {
          // Clean place name for Wikipedia search - remove common Vietnamese prefixes
          const cleanName = placeName
            .replace(/^(Sân bay|Cảng|Chùa|Đền|Nhà thờ|Bảo tàng|Công viên|Bãi biển|Vịnh|Núi|Sông|Hồ|Đài|Tượng đài|Cung|Trung tâm|Khu|Khu vực)\s+/i, '')
            .trim();
          
          // Try multiple variations of the place name
          const searchVariations = [
            cleanName || placeName, // Clean name
            placeName, // Original name
            `${cleanName || placeName}, ${location}`, // With location
            `${placeName}, Vietnam`, // With country
          ];
          
          // Try each variation
          for (const searchTerm of searchVariations) {
            const wikiImage = await getWikipediaImage(searchTerm, WIKIPEDIA_ACCESS_TOKEN);
            if (wikiImage) {
              console.log(`[getPlaceImage] ✅ Using Wikipedia image for ${placeName} (searched as: ${searchTerm})`);
              return wikiImage;
            }
          }
          
          console.log(`[getPlaceImage] ⚠️ Wikipedia failed for all variations of ${placeName}, using fallback`);
        } catch (error) {
          console.log(`[getPlaceImage] ⚠️ Wikipedia failed for ${placeName}, using fallback`);
        }
      }
      
      // Fallback to curated images
      const vietnamLocationImages: Record<string, string> = {
        'Đà Nẵng': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
        'Phú Quốc': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop',
        'Hạ Long': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=95&auto=format&fit=crop',
        'Hội An': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=95&auto=format&fit=crop',
        'Sapa': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop',
        'Nha Trang': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop',
      };
      
      const famousAttractions: Record<string, string> = {
        'Bà Nà Hills': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
        'Cầu Vàng': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
        'Chùa Linh Ứng': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
        'Bãi biển Mỹ Khê': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
        'Phố cổ Hội An': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=95&auto=format&fit=crop',
        'Vịnh Hạ Long': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=95&auto=format&fit=crop',
        'Vinpearl': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop',
        'Núi Fansipan': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop',
      };
      
      if (famousAttractions[placeName]) {
        return famousAttractions[placeName];
      }
      
      if (vietnamLocationImages[location]) {
        return vietnamLocationImages[location];
      }
      
      return category === 'restaurant' 
        ? 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=95&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop';
    }
    
    // Transform Geoapify response to our format - limit to exactly 6 items per region
    const results = await Promise.all(filteredFeatures.slice(0, limit).map(async (feature: any) => {
      const properties = feature.properties;
      const placeName = properties.name || 'Unnamed Place';
      
      // Get image - try Wikipedia first for attractions
      const image = await getPlaceImage(placeName, category, location);
      
      // Extract additional data from raw datasource
      const raw = properties.datasource?.raw || {};
      const description = properties.description || 
                         raw.description || 
                         properties.categories?.join(', ') || 
                  '';
      
      const phone = properties.contact?.phone || raw.phone || '';
      const website = properties.website || raw.website || '';
      const openingHours = properties.opening_hours || 
                          properties.hours || 
                          raw.opening_hours || 
                          "N/A";
      
      return {
        id: properties.place_id || properties.osm_id || feature.id || Math.random().toString(),
        name: placeName,
        location: properties.formatted || properties.address_line2 || properties.address || location,
        coordinates: {
          lat: feature.geometry?.coordinates?.[1] || properties.lat || 0,
          lng: feature.geometry?.coordinates?.[0] || properties.lon || 0,
        },
        category: category,
        description: description,
        rating: 0, // Geoapify doesn't provide ratings
        price: category === 'attraction' ? 200000 : category === 'restaurant' ? 200000 : 1000000, // Estimate price
        image: image,
        duration: category === 'attraction' ? "2-4 giờ" : "1-2 giờ",
        openingHours: openingHours,
        phone: phone || undefined,
        website: website || undefined,
        distance: properties.distance || undefined,
      };
    }));
    
    console.log(`[Geoapify] 📊 Processed ${results.length} places`);
    return results;
  } catch (error: any) {
    console.error('[Geoapify] ❌ Request failed:', error.message);
    throw error;
  }
}

// Helper function to search OpenStreetMap places using Nominatim API (fallback)
async function searchOpenStreetMapPlaces(
  location: string,
  category: 'attraction' | 'restaurant',
  limit: number = 6 // Default to 6 items per region
) {
  console.log(`[OpenStreetMap] Searching for: ${location} (${category})`);

  let query = location;
  if (category === 'restaurant') {
    query = `${location} vietnam restaurant`;
  } else {
    query = `attraction ${location} vietnam`;
  }

  try {
    const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=20&addressdetails=1&extratags=1&countrycodes=vn`;
    
    const response = await fetch(endpoint, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TravelTourApp/1.0 (contact: support@traveltour.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[OpenStreetMap] ✅ Found ${data.length || 0} results`);
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Helper function to get image - Try Wikipedia first for attractions and hotels, fallback to curated images
    async function getPlaceImage(placeName: string, category: string, location: string): Promise<string> {
      const WIKIPEDIA_ACCESS_TOKEN = process.env.WIKIPEDIA_ACCESS_TOKEN;
      
      // Try Wikipedia for attractions and hotels (restaurants usually don't have Wikipedia pages)
      if ((category === 'attraction' || category === 'hotel') && WIKIPEDIA_ACCESS_TOKEN) {
        try {
          // Clean place name for Wikipedia search - remove common Vietnamese prefixes
          const cleanName = placeName
            .replace(/^(Sân bay|Cảng|Chùa|Đền|Nhà thờ|Bảo tàng|Công viên|Bãi biển|Vịnh|Núi|Sông|Hồ|Đài|Tượng đài|Cung|Trung tâm|Khu|Khu vực|Khách sạn|Nhà hàng|Resort|Hotel)\s+/i, '')
            .trim();
          
          // Convert Vietnamese city names to English for better Wikipedia search
          const cityNameMap: Record<string, string> = {
            'Đà Nẵng': 'Danang',
            'Phú Quốc': 'Phu Quoc',
            'Hạ Long': 'Ha Long',
            'Hội An': 'Hoi An',
            'Sapa': 'Sa Pa',
            'Nha Trang': 'Nha Trang',
          };
          
          const englishLocation = cityNameMap[location] || location;
          
          // Generate search variations
          const searchVariations: string[] = [];
          
          // For hotels, try English hotel name variations
          if (category === 'hotel') {
            // Try with "InterContinental" -> "InterContinental Danang"
            if (placeName.includes('InterContinental')) {
              searchVariations.push(
                `InterContinental ${englishLocation}`,
                `InterContinental ${englishLocation} Sun Peninsula Resort`,
                `InterContinental Danang Sun Peninsula Resort`,
                placeName.replace('Đà Nẵng', 'Danang'),
                placeName.replace('Đà Nẵng', 'Da Nang'),
              );
            }
            // Try with "Novotel" -> "Novotel Danang"
            if (placeName.includes('Novotel')) {
              searchVariations.push(
                `Novotel ${englishLocation}`,
                placeName.replace('Đà Nẵng', 'Danang'),
                placeName.replace('Đà Nẵng', 'Da Nang'),
              );
            }
            // Try with "Hyatt" -> "Hyatt Regency Danang"
            if (placeName.includes('Hyatt')) {
              searchVariations.push(
                `Hyatt Regency ${englishLocation}`,
                placeName.replace('Đà Nẵng', 'Danang'),
                placeName.replace('Đà Nẵng', 'Da Nang'),
              );
            }
            // Generic hotel name with location
            searchVariations.push(
              `${cleanName || placeName} ${englishLocation}`,
              `${placeName} ${englishLocation}`,
            );
          }
          
          // Common variations for all categories
          searchVariations.push(
            cleanName || placeName, // Clean name
            placeName, // Original name
            `${cleanName || placeName}, ${location}`, // With location (Vietnamese)
            `${cleanName || placeName}, ${englishLocation}`, // With location (English)
            `${placeName}, Vietnam`, // With country
            `${cleanName || placeName} ${englishLocation}`, // Name + English location
          );
          
          // Remove duplicates
          const uniqueVariations = [...new Set(searchVariations)];
          
          console.log(`[getPlaceImage] Trying ${uniqueVariations.length} Wikipedia variations for ${placeName}:`, uniqueVariations);
          
          // Try each variation
          for (const searchTerm of uniqueVariations) {
            const wikiImage = await getWikipediaImage(searchTerm, WIKIPEDIA_ACCESS_TOKEN);
            if (wikiImage) {
              console.log(`[getPlaceImage] ✅ Using Wikipedia image for ${placeName} (searched as: ${searchTerm})`);
              return wikiImage;
            }
          }
          
          console.log(`[getPlaceImage] ⚠️ Wikipedia failed for all variations of ${placeName}, using fallback`);
        } catch (error) {
          console.log(`[getPlaceImage] ⚠️ Wikipedia failed for ${placeName}, using fallback`);
        }
      }
      
      // Fallback: Generate unique image URL based on place name hash to avoid shared images
      // This ensures each place gets a different fallback image even if Wikipedia fails
      const placeHash = placeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const imageIndex = placeHash % 10; // Use modulo to cycle through different images
      
      // Use Unsplash with different search terms based on place name to get unique images
      const searchTerms = [
        'vietnam-tourism',
        'vietnam-landscape',
        'vietnam-culture',
        'vietnam-nature',
        'vietnam-heritage',
        'vietnam-travel',
        'vietnam-scenery',
        'vietnam-attraction',
        'vietnam-destination',
        'vietnam-beauty',
      ];
      
      const fallbackImages = [
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&q=95&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1920&q=95&auto=format&fit=crop"
      ];
      
      const fallbackImage = category === 'restaurant' 
        ? `https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=95&auto=format&fit=crop&sig=${placeHash}`
        : fallbackImages[placeHash % fallbackImages.length];
      
      console.log(`[getPlaceImage] Using unique fallback image for ${placeName} (hash: ${placeHash})`);
      return fallbackImage;
    }
    
    // Transform OSM response to our format - limit to exactly 6 items per region
    const results = await Promise.all(data.slice(0, limit).map(async (place: any) => {
      const placeName = place.display_name || place.name || 'Unnamed Place';
      const image = await getPlaceImage(placeName, category, location);
      
      return {
        id: place.place_id?.toString() || place.osm_id?.toString() || Math.random().toString(),
        name: placeName,
        location: place.display_name || location,
        coordinates: {
          lat: parseFloat(place.lat) || 0,
          lng: parseFloat(place.lon) || 0,
        },
        category: category,
        description: place.tags?.description || place.tags?.tourism || '',
        rating: 0,
        price: category === 'attraction' ? 200000 : category === 'restaurant' ? 200000 : 1000000, // Estimate price
        image: image,
        duration: category === 'attraction' ? "2-4 giờ" : "1-2 giờ",
        openingHours: "N/A",
      };
    }));
    
    console.log(`[OpenStreetMap] 📊 Processed ${results.length} places`);
    return results;
  } catch (error: any) {
    console.error('[OpenStreetMap] ❌ Request failed:', error.message);
    throw error;
  }
}

// Helper function to get place details from Goong API
async function getGoongPlaceDetails(placeName: string, location: string, apiKey: string): Promise<any | null> {
  try {
    // Encode place name and location for search (add Vietnam context if missing)
    const baseQuery = `${placeName}${location ? `, ${location}` : ""}`.trim();
    const searchQuery =
      /vietnam|việt\s*nam/i.test(baseQuery) ? baseQuery : `${baseQuery}, Vietnam`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Try multiple endpoints
    const endpoints = [
      `https://rsapi.goong.io/Place/Autocomplete?input=${encodedQuery}&api_key=${apiKey}`,
      `https://rsapi.goong.io/Place/Search?input=${encodedQuery}&api_key=${apiKey}`,
    ];
    
    console.log(`[Goong API] Searching for: "${searchQuery}"`);
    
    let searchResponse: Response | null = null;
    let goongSearchUrl = "";
    
    for (const url of endpoints) {
      goongSearchUrl = url;
      console.log(`[Goong API] 🔍 Trying endpoint: ${url.replace(apiKey, "***")}`);
      
      try {
        searchResponse = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "TravelTourApp/1.0",
          },
        });
        
        if (searchResponse.ok) {
          console.log(`[Goong API] ✅ Success with endpoint`);
          break;
        } else {
          const errorText = await searchResponse.text().catch(() => "Unknown error");
          console.log(`[Goong API] ⚠️ Endpoint failed: ${searchResponse.status} - ${errorText.substring(0, 200)}`);
          searchResponse = null;
        }
      } catch (error: any) {
        console.log(`[Goong API] ⚠️ Endpoint error: ${error.message}`);
        searchResponse = null;
      }
    }
    
    if (!searchResponse || !searchResponse.ok) {
      console.log(`[Goong API] ⚠️ All search endpoints failed`);
      return null;
    }
    
    const searchData = await searchResponse.json();
    
    // Debug: Log full response structure
    console.log(`[Goong API] 🔍 Search response structure:`, JSON.stringify(searchData, null, 2).substring(0, 1000));
    
    // Check for errors in response
    if (searchData.error_message || searchData.error) {
      const errorMsg = searchData.error_message || searchData.error?.message || JSON.stringify(searchData.error);
      console.log(`[Goong API] ⚠️ API error message: ${errorMsg}`);
      return null;
    }
    
    // Check if response has predictions or results
    const predictions = searchData.predictions || searchData.results || searchData.data || [];
    
    // Filter predictions - prioritize establishments (hotels, restaurants, attractions) over administrative areas
    // Establishments have more detailed info (photos, price, rating, reviews)
    const establishmentTypes = [
      'lodging', 'hotel', 'restaurant', 'food', 'cafe', 'bar', 
      'tourist_attraction', 'point_of_interest', 'establishment',
      'amusement_park', 'museum', 'park', 'beach', 'temple', 'church'
    ];
    
    const administrativeTypes = [
      'administrative_area_level_1', 'administrative_area_level_2', 
      'locality', 'sublocality', 'commune', 'village', 'street'
    ];
    
    // Separate establishments from administrative areas
    const establishments = predictions.filter((p: any) => 
      p.types && p.types.some((t: string) => establishmentTypes.includes(t))
    );
    
    const administrativeAreas = predictions.filter((p: any) => 
      !establishments.includes(p)
    );
    
    console.log(`[Goong API] 🔍 Found ${establishments.length} establishments and ${administrativeAreas.length} administrative areas`);
    
    // Prioritize establishments, fallback to administrative areas
    const sortedPredictions = establishments.length > 0 ? establishments : administrativeAreas;
    
    // Get first result's place_id for detail lookup
    if (sortedPredictions.length > 0) {
      const firstResult = sortedPredictions[0];
      const placeId = firstResult.place_id;
      
      console.log(`[Goong API] 🔍 Selected result:`, {
        description: firstResult.description,
        types: firstResult.types,
        compound: firstResult.compound,
        place_id: placeId,
      });
      
      if (placeId) {
        // Get place details using place_id
        const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`;
        const detailResponse = await fetch(detailUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "TravelTourApp/1.0",
          },
        });
        
        if (!detailResponse.ok) {
          const errorText = await detailResponse.text().catch(() => "Unknown error");
          console.log(`[Goong API] ⚠️ Detail API error: ${detailResponse.status} - ${errorText.substring(0, 200)}`);
          return null;
        }
        
        const detailData = await detailResponse.json();
        
        // Debug: Log full detail response
        console.log(`[Goong API] 🔍 Detail response structure:`, JSON.stringify(detailData, null, 2).substring(0, 2000));
        
        // Check for errors in detail response
        if (detailData.error_message || detailData.error) {
          const errorMsg = detailData.error_message || detailData.error?.message || JSON.stringify(detailData.error);
          console.log(`[Goong API] ⚠️ Detail API error message: ${errorMsg}`);
          return null;
        }
        
        // Get place data - could be in result, data, or directly
        const place = detailData.result || detailData.data || detailData;
        
        if (place) {
          console.log(`[Goong API] ✅ Found place: ${place.name || placeName}`);
          
          // Parse all photos and create full URLs
          const photos = place.photos || [];
          const photoUrls = photos.map((photo: any, index: number) => {
            if (photo.photo_reference) {
              return {
                url: `https://rsapi.goong.io/Place/Photo?photo_reference=${photo.photo_reference}&maxwidth=1920&api_key=${apiKey}`,
                thumbnail: `https://rsapi.goong.io/Place/Photo?photo_reference=${photo.photo_reference}&maxwidth=400&api_key=${apiKey}`,
                reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
              };
            }
            return null;
          }).filter((p: any) => p !== null);
          
          // Get primary image (first photo or thumbnail)
          const primaryImage = photoUrls.length > 0 
            ? photoUrls[0].url 
            : (place.photos?.[0]?.photo_reference 
              ? `https://rsapi.goong.io/Place/Photo?photo_reference=${place.photos[0].photo_reference}&maxwidth=1920&api_key=${apiKey}`
              : null);
          
          const thumbnail = photoUrls.length > 0 
            ? photoUrls[0].thumbnail 
            : (place.photos?.[0]?.photo_reference 
              ? `https://rsapi.goong.io/Place/Photo?photo_reference=${place.photos[0].photo_reference}&maxwidth=400&api_key=${apiKey}`
              : null);
          
          // Parse price from price_level or other fields
          let price = null;
          if (place.price_level !== undefined && place.price_level !== null) {
            // price_level: 0 = free, 1 = inexpensive, 2 = moderate, 3 = expensive, 4 = very expensive
            const priceLevels: Record<number, number> = {
              0: 0,        // Free
              1: 100000,   // Inexpensive: ~100k VND
              2: 500000,   // Moderate: ~500k VND
              3: 1500000,  // Expensive: ~1.5M VND
              4: 3000000,  // Very expensive: ~3M VND
            };
            price = priceLevels[place.price_level] || null;
          }
          
          // Build comprehensive description
          let description = place.name || "";
          if (place.editorial_summary?.overview) {
            description = place.editorial_summary.overview;
          } else if (place.description) {
            description = place.description;
          } else if (place.name) {
            description = `${place.name}${place.formatted_address ? ` tại ${place.formatted_address}` : ""}`;
          }
          
          // Get all available information
          return {
            title: place.name,
            name: place.name,
            address: place.formatted_address || place.vicinity || place.address || place.formatted_phone_number,
            rating: place.rating,
            reviews: place.user_ratings_total || place.reviews || 0,
            photos: photoUrls, // All photos with full URLs
            photo_references: photos.map((p: any) => p.photo_reference).filter(Boolean),
            thumbnail: thumbnail,
            image: primaryImage, // Primary image URL
            website: place.website || place.url,
            phone: place.formatted_phone_number || place.international_phone_number || place.phone,
            hours: place.opening_hours || place.current_opening_hours,
            opening_hours_text: place.opening_hours?.weekday_text || place.current_opening_hours?.weekday_text,
            description: description,
            editorial_summary: place.editorial_summary,
            coordinates: place.geometry?.location ? {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            } : null,
            geometry: place.geometry,
            type: place.types?.[0] || place.types?.[1] || "establishment",
            types: place.types || [],
            price: price,
            price_level: place.price_level,
            price_text: place.price_level !== undefined 
              ? ["Miễn phí", "Rẻ", "Trung bình", "Đắt", "Rất đắt"][place.price_level] || null
              : null,
            place_id: place.place_id,
            plus_code: place.plus_code,
            business_status: place.business_status,
            permanently_closed: place.permanently_closed,
            // Additional metadata
            metadata: {
              ...place,
              all_photos: photoUrls,
            },
          };
        }
      }
    }
    
    console.log(`[Goong API] ⚠️ No place results found for "${searchQuery}"`);
    console.log(`[Goong API] 🔍 Full search response:`, JSON.stringify(searchData, null, 2).substring(0, 1000));
    return null;
  } catch (error: any) {
    console.error(`[Goong API] ❌ Error fetching place details:`, error.message);
    return null;
  }
}

// Helper function to get an image from Goong API as a fallback
async function getGoongImage(placeName: string, location: string, apiKey: string): Promise<string | null> {
  try {
    const baseQuery = `${placeName}${location ? ` ${location}` : ""}`.trim();
    const searchQuery =
      /vietnam|việt\s*nam/i.test(baseQuery) ? baseQuery : `${baseQuery} Vietnam`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Try multiple endpoints to find the place
    const endpoints = [
      `https://rsapi.goong.io/Place/Autocomplete?input=${encodedQuery}&api_key=${apiKey}`,
      `https://rsapi.goong.io/Place/Search?input=${encodedQuery}&api_key=${apiKey}`,
    ];
    
    let response: Response | null = null;
    
    for (const url of endpoints) {
      try {
        response = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "TravelTourApp/1.0",
          },
        });
        
        if (response.ok) break;
        response = null;
      } catch (error) {
        response = null;
      }
    }

    if (!response || !response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Check for errors
    if (data.error_message) {
      console.log(`[Goong API] ⚠️ Image search error: ${data.error_message}`);
      return null;
    }
    
    // Filter to get establishments (hotels, attractions) which have photos
    const predictions = data.predictions || [];
    const establishmentTypes = ['lodging', 'hotel', 'restaurant', 'tourist_attraction', 'point_of_interest', 'establishment'];
    
    // Find establishments first
    const establishments = predictions.filter((p: any) => 
      p.types && p.types.some((t: string) => establishmentTypes.includes(t))
    );
    
    // Use establishments if found, otherwise use first prediction
    const targetPredictions = establishments.length > 0 ? establishments : predictions;
    
    console.log(`[Goong API] 🔍 Image search: Found ${establishments.length} establishments from ${predictions.length} predictions`);
    
    // Get first result and fetch its details for photo
    if (targetPredictions.length > 0) {
      const firstPrediction = targetPredictions[0];
      const placeId = firstPrediction.place_id;
      
      if (placeId) {
        console.log(`[Goong API] 🔍 Fetching image for place_id: ${placeId} (${firstPrediction.description})`);
        
        const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`;
        const detailResponse = await fetch(detailUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "TravelTourApp/1.0",
          },
        });
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          
          if (detailData.error_message) {
            console.log(`[Goong API] ⚠️ Detail error: ${detailData.error_message}`);
            return null;
          }
          
          const place = detailData.result || detailData.data || detailData;
          
          console.log(`[Goong API] 🔍 Place has photos: ${!!(place?.photos && place.photos.length > 0)}, count: ${place?.photos?.length || 0}`);
          
          if (place?.photos && Array.isArray(place.photos) && place.photos.length > 0) {
            const photoRef = place.photos[0].photo_reference;
            if (photoRef) {
              const photoUrl = `https://rsapi.goong.io/Place/Photo?photo_reference=${photoRef}&maxwidth=1920&api_key=${apiKey}`;
              console.log(`[Goong API] ✅ Found photo URL`);
              return photoUrl;
            }
          } else {
            console.log(`[Goong API] ⚠️ No photos found in place detail`);
          }
        } else {
          console.log(`[Goong API] ⚠️ Detail API error: ${detailResponse.status}`);
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Goong API Place Search (returns predictions list)
// Try multiple endpoints to find the correct one
// Helper function to get place details from SerpAPI (Google Maps)
// If ctx is provided, will check cache first
async function getSerpApiPlaceDetails(
  placeName: string, 
  location: string, 
  apiKey: string,
  ctx?: any // Optional action context for cache
): Promise<any | null> {
  try {
    // Encode place name and location for search (add Vietnam context if missing)
    const baseQuery = `${placeName}${location ? `, ${location}` : ""}`.trim();
    const searchQuery =
      /vietnam|việt\s*nam/i.test(baseQuery) ? baseQuery : `${baseQuery}, Vietnam`;
    const engine = "google_maps";
    
  // Check cache if ctx is provided
  if (ctx) {
    try {
      const cacheResult = await ctx.runQuery(api.serpApiCache.getCachedSerpApi, {
        engine,
        query: searchQuery,
      });
      
      if (cacheResult && cacheResult.cached && cacheResult.data) {
        console.log(`[SerpAPI] ✅ Using CACHED data for place: "${searchQuery}" (SAVED 1 API request)`);
        const data = cacheResult.data;
          
          // Check for place_results
          if (data.place_results) {
            const place = data.place_results;
            return {
              title: place.title,
              address: place.address,
              rating: place.rating,
              reviews: place.reviews,
              photos: place.photos || [],
              thumbnail: place.thumbnail,
              website: place.website,
              phone: place.phone,
              hours: place.hours,
              description: place.description,
              coordinates: place.gps_coordinates,
              type: place.type,
              price: place.price,
              menu: place.menu,
            };
          }
          
          // Check for local_results
          if (data.local_results && data.local_results.length > 0) {
            const place = data.local_results[0];
            return {
              title: place.title,
              address: place.address,
              rating: place.rating,
              reviews: place.reviews,
              photos: place.photos || [],
              thumbnail: place.thumbnail,
              website: place.website,
              phone: place.phone,
              hours: place.hours,
              description: place.description,
              coordinates: place.gps_coordinates,
              type: place.type,
              price: place.price,
            };
          }
        }
    } catch (error: any) {
      console.error(`[SerpAPI] ❌ Cache check error: ${error.message}, proceeding with API call (WILL COST 1 REQUEST)`);
    }
  }

  // Cache miss or no ctx - fetch from API (THIS COSTS 1 SERPAPI REQUEST)
  console.log(`[SerpAPI] 🔍 Fetching place details from API: "${searchQuery}" (COST: 1 request)`);
    const encodedQuery = encodeURIComponent(searchQuery);
    const serpApiUrl = `https://serpapi.com/search.json?engine=${engine}&q=${encodedQuery}&api_key=${apiKey}`;
    
    const response = await fetch(serpApiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TravelTourApp/1.0",
      },
    });
    
    if (!response.ok) {
      console.log(`[SerpAPI] ⚠️ API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Save to cache if ctx is provided
    if (ctx) {
      try {
        await ctx.runMutation(api.serpApiCache.saveSerpApiCache, {
          engine,
          query: searchQuery,
          data,
        });
        console.log(`[SerpAPI] 💾 Cached place details for: "${searchQuery}"`);
      } catch (error: any) {
        console.log(`[SerpAPI] ⚠️ Cache save error: ${error.message}`);
      }
    }
    
    // Check for place_results
    if (data.place_results) {
      const place = data.place_results;
      console.log(`[SerpAPI] ✅ Found place: ${place.title || placeName}`);
      
      return {
        title: place.title,
        address: place.address,
        rating: place.rating,
        reviews: place.reviews,
        photos: place.photos || [],
        thumbnail: place.thumbnail,
        website: place.website,
        phone: place.phone,
        hours: place.hours,
        description: place.description,
        coordinates: place.gps_coordinates,
        type: place.type,
        price: place.price,
        menu: place.menu,
      };
    }
    
    // Check for local_results
    if (data.local_results && data.local_results.length > 0) {
      const place = data.local_results[0];
      console.log(`[SerpAPI] ✅ Found in local_results: ${place.title || placeName}`);
      
      return {
        title: place.title,
        address: place.address,
        rating: place.rating,
        reviews: place.reviews,
        photos: place.photos || [],
        thumbnail: place.thumbnail,
        website: place.website,
        phone: place.phone,
        hours: place.hours,
        description: place.description,
        coordinates: place.gps_coordinates,
        type: place.type,
        price: place.price,
      };
    }
    
    console.log(`[SerpAPI] ⚠️ No place results found for "${searchQuery}"`);
    return null;
  } catch (error: any) {
    console.error(`[SerpAPI] ❌ Error fetching place details:`, error.message);
    return null;
  }
}

// Helper function to get an image from SerpAPI (Google Images) as a fallback
// If ctx is provided, will check cache first
async function getSerpApiImage(
  placeName: string, 
  location: string, 
  apiKey: string,
  ctx?: any // Optional action context for cache
): Promise<string | null> {
  try {
    const baseQuery = `${placeName}${location ? ` ${location}` : ""}`.trim();
    const searchQuery =
      /vietnam|việt\s*nam/i.test(baseQuery) ? baseQuery : `${baseQuery} Vietnam`;
    const engine = "google_images";
    
    // Check cache if ctx is provided
    if (ctx) {
      try {
        const cacheResult = await ctx.runQuery(api.serpApiCache.getCachedSerpApi, {
          engine,
          query: searchQuery,
        });
        
        if (cacheResult && cacheResult.cached && cacheResult.data) {
          console.log(`[SerpAPI] ✅ Using CACHED image for: "${searchQuery}" (SAVED 1 API request)`);
          const data = cacheResult.data;
          const first = data?.images_results?.[0];
          return first?.original || first?.thumbnail || null;
        }
      } catch (error: any) {
        console.error(`[SerpAPI] ❌ Cache check error: ${error.message}, proceeding with API call (WILL COST 1 REQUEST)`);
      }
    }
    
    // Cache miss or no ctx - fetch from API (THIS COSTS 1 SERPAPI REQUEST)
    console.log(`[SerpAPI] 🔍 Fetching image from API: "${searchQuery}" (COST: 1 request)`);
    const encodedQuery = encodeURIComponent(searchQuery);
    const serpApiUrl = `https://serpapi.com/search.json?engine=${engine}&q=${encodedQuery}&api_key=${apiKey}`;

    const response = await fetch(serpApiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TravelTourApp/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Save to cache if ctx is provided
    if (ctx) {
      try {
        await ctx.runMutation(api.serpApiCache.saveSerpApiCache, {
          engine,
          query: searchQuery,
          data,
        });
        console.log(`[SerpAPI] 💾 Cached image result for: "${searchQuery}"`);
      } catch (error: any) {
        console.log(`[SerpAPI] ⚠️ Cache save error: ${error.message}`);
      }
    }
    
    const first = data?.images_results?.[0];
    return first?.original || first?.thumbnail || null;
  } catch {
    return null;
  }
}

// SerpAPI Google Maps search (returns local_results list)
// If ctx is provided, will check cache first
async function serpApiMapsSearch(
  query: string, 
  apiKey: string, 
  ctx?: any // Optional action context for cache
): Promise<any[]> {
  const engine = "google_maps";
  
  // Check cache if ctx is provided
  if (ctx) {
    try {
      console.log(`[SerpAPI] 🔍 Checking cache for: "${query}" (engine: ${engine})`);
      const cacheResult = await ctx.runQuery(api.serpApiCache.getCachedSerpApi, {
        engine,
        query,
      });
      
      if (cacheResult && cacheResult.cached && cacheResult.data) {
        console.log(`[SerpAPI] ✅✅✅ CACHE HIT - Using CACHED data for: "${query}" (SAVED 1 SERPAPI REQUEST ✅)`);
        const data = cacheResult.data;
        if (data?.local_results && Array.isArray(data.local_results)) return data.local_results;
        if (data?.place_results) return [data.place_results];
        return [];
      } else {
        console.log(`[SerpAPI] ❌ Cache MISS for: "${query}" - Will call API (COST: 1 request)`);
      }
    } catch (error: any) {
      console.error(`[SerpAPI] ❌❌❌ Cache check FAILED: ${error.message}`);
      console.error(`[SerpAPI] ⚠️ This might mean serpApiCache table doesn't exist - check if schema is deployed!`);
      console.error(`[SerpAPI] ⚠️ Proceeding with API call (WILL COST 1 REQUEST)`);
    }
  } else {
    console.log(`[SerpAPI] ⚠️ No ctx provided - skipping cache check (WILL COST 1 REQUEST)`);
  }

  // Cache miss or no ctx - fetch from API (THIS COSTS 1 SERPAPI REQUEST)
  console.log(`[SerpAPI] 🔍 Fetching from API: "${query}" (COST: 1 request)`);
  const encodedQuery = encodeURIComponent(query);
  const serpApiUrl = `https://serpapi.com/search.json?engine=${engine}&q=${encodedQuery}&api_key=${apiKey}`;

  const response = await fetch(serpApiUrl, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "TravelTourApp/1.0",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.log(`[SerpAPI] ⚠️ Maps search error: ${response.status} - ${errorText.substring(0, 200)}`);
    return [];
  }

  const data = await response.json();
  
  // Save to cache if ctx is provided
  if (ctx) {
    try {
      await ctx.runMutation(api.serpApiCache.saveSerpApiCache, {
        engine,
        query,
        data,
      });
      console.log(`[SerpAPI] 💾💾💾 SAVED TO CACHE: "${query}" (Next call will use cache - NO COST)`);
    } catch (error: any) {
      console.error(`[SerpAPI] ❌❌❌ Cache SAVE FAILED: ${error.message}`);
      console.error(`[SerpAPI] ⚠️ This might mean serpApiCache table doesn't exist - check if schema is deployed!`);
      console.error(`[SerpAPI] ⚠️ Data was fetched but NOT cached - next call will COST another request`);
    }
  }
  
  if (data?.local_results && Array.isArray(data.local_results)) return data.local_results;
  if (data?.place_results) return [data.place_results];
  return [];
}

async function goongMapsSearch(query: string, apiKey: string): Promise<any[]> {
  const encodedQuery = encodeURIComponent(query);
  
  // Try different possible endpoints
  const endpoints = [
    `https://rsapi.goong.io/Place/Autocomplete?input=${encodedQuery}&api_key=${apiKey}`,
    `https://rsapi.goong.io/Place/Search?input=${encodedQuery}&api_key=${apiKey}`,
    `https://rsapi.goong.io/Geocode?address=${encodedQuery}&api_key=${apiKey}`,
  ];
  
  let response: Response | null = null;
  let goongSearchUrl = "";
  let lastError = "";
  
  // Try each endpoint until one works
  for (const url of endpoints) {
    goongSearchUrl = url;
    console.log(`[Goong API] 🔍 Trying endpoint: ${url.replace(apiKey, "***")}`);
    
    try {
      response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "TravelTourApp/1.0",
        },
      });
      
      if (response.ok) {
        console.log(`[Goong API] ✅ Success with endpoint: ${url.replace(apiKey, "***")}`);
        break;
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        lastError = `Status ${response.status}: ${errorText.substring(0, 200)}`;
        console.log(`[Goong API] ⚠️ Endpoint failed: ${lastError}`);
        response = null;
      }
    } catch (error: any) {
      lastError = error.message || error.toString();
      console.log(`[Goong API] ⚠️ Endpoint error: ${lastError}`);
      response = null;
    }
  }
  
  if (!response || !response.ok) {
    const errorText = await response?.text().catch(() => lastError || "Unknown error") || lastError;
    console.log(`[Goong API] ⚠️ All endpoints failed. Last error: ${errorText}`);
    console.log(`[Goong API] 🔍 API Key (first 10 chars): ${apiKey.substring(0, 10)}...`);
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.log(`[Goong API] ⚠️ Maps search error: ${response.status} - ${errorText}`);
    console.log(`[Goong API] 🔍 Request URL: ${goongSearchUrl.replace(apiKey, "***")}`);
    // Try to parse error response
    try {
      const errorData = JSON.parse(errorText);
      console.log(`[Goong API] 🔍 Error details:`, JSON.stringify(errorData, null, 2));
    } catch (e) {
      console.log(`[Goong API] 🔍 Error text: ${errorText}`);
    }
    return [];
  }

  const data = await response.json();
  
  // Debug: Log response structure
  console.log(`[Goong API] 🔍 Maps search response:`, JSON.stringify(data, null, 2).substring(0, 1000));
  
  // Check for errors
  if (data.error_message || data.error) {
    const errorMsg = data.error_message || data.error?.message || JSON.stringify(data.error);
    console.log(`[Goong API] ⚠️ Maps search error message: ${errorMsg}`);
    return [];
  }
  
  // Get predictions - Goong API returns predictions array
  const predictions = data.predictions || data.results || data.data || [];
  
  // Filter predictions - prioritize establishments (hotels, restaurants, attractions) 
  // Establishments have detailed info (photos, price, rating, reviews)
  const establishmentTypes = [
    'lodging', 'hotel', 'restaurant', 'food', 'cafe', 'bar', 
    'tourist_attraction', 'point_of_interest', 'establishment',
    'amusement_park', 'museum', 'park', 'beach', 'temple', 'church',
    'shopping_mall', 'store', 'gas_station', 'bank', 'hospital'
  ];
  
  // Separate establishments from administrative areas
  const establishments = predictions.filter((p: any) => 
    p.types && p.types.some((t: string) => establishmentTypes.includes(t))
  );
  
  const administrativeAreas = predictions.filter((p: any) => 
    !establishments.includes(p)
  );
  
  console.log(`[Goong API] 🔍 Found ${establishments.length} establishments and ${administrativeAreas.length} administrative areas from ${predictions.length} total`);
  
  // Prioritize establishments, include some administrative areas as fallback
  const sortedPredictions = [
    ...establishments.slice(0, 10), // Top 10 establishments
    ...administrativeAreas.slice(0, 2) // Top 2 administrative areas as fallback
  ];
  
  console.log(`[Goong API] 🔍 Using ${sortedPredictions.length} predictions (${establishments.length} establishments + ${Math.min(2, administrativeAreas.length)} admin areas)`);
  
  // Convert Goong predictions to a format similar to Goong API results
  if (sortedPredictions.length > 0) {
    // Fetch details for each prediction to get full information
    const results = await Promise.all(
      sortedPredictions.map(async (prediction: any) => {
        const placeId = prediction.place_id;
        if (!placeId) {
          console.log(`[Goong API] ⚠️ No place_id found in prediction:`, JSON.stringify(prediction, null, 2).substring(0, 200));
          return null;
        }
        
        try {
          const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`;
          console.log(`[Goong API] 🔍 Fetching detail for place_id: ${placeId}`);
          
          const detailResponse = await fetch(detailUrl, {
            headers: {
              "Accept": "application/json",
              "User-Agent": "TravelTourApp/1.0",
            },
          });
          
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            
            // Debug: Log FULL detail response to see what we get
            console.log(`[Goong API] 🔍 FULL Detail response for ${placeId}:`, JSON.stringify(detailData, null, 2));
            
            // Skip if error in detail response
            if (detailData.error_message || detailData.error) {
              const errorMsg = detailData.error_message || detailData.error?.message || JSON.stringify(detailData.error);
              console.log(`[Goong API] ⚠️ Detail error for ${placeId}: ${errorMsg}`);
              // Fallback to prediction data
              return {
                title: prediction.structured_formatting?.main_text || prediction.description || "Unknown",
                name: prediction.structured_formatting?.main_text || prediction.description || "Unknown",
                address: prediction.description || 
                  (prediction.compound ? `${prediction.compound.commune || ''} ${prediction.compound.district || ''} ${prediction.compound.province || ''}`.trim() : '') ||
                  "Unknown",
                description: prediction.description,
                place_id: placeId,
              };
            }
            
            // Get place data - Goong API returns data in 'result' field
            const place = detailData.result || detailData.data || detailData;
            
            console.log(`[Goong API] 🔍 Parsed place data:`, {
              name: place?.name,
              hasPhotos: !!(place?.photos && place.photos.length > 0),
              photosCount: place?.photos?.length || 0,
              hasPriceLevel: place?.price_level !== undefined,
              priceLevel: place?.price_level,
              hasRating: place?.rating !== undefined,
              rating: place?.rating,
              hasReviews: place?.user_ratings_total !== undefined,
              reviews: place?.user_ratings_total,
              hasDescription: !!(place?.description || place?.editorial_summary),
            });
            
            if (place) {
              console.log(`[Goong API] ✅ Place found: ${place.name || prediction.description}`);
              
              // Parse all photos - check multiple possible field names
              const photos = place.photos || place.photo || place.images || [];
              console.log(`[Goong API] 📸 Found ${photos.length} photos`);
              
              const photoUrls = photos.map((photo: any, index: number) => {
                // photo_reference could be in different formats
                const photoRef = photo.photo_reference || photo.reference || photo.photoReference || photo.id;
                
                if (photoRef) {
                  const photoUrl = `https://rsapi.goong.io/Place/Photo?photo_reference=${photoRef}&maxwidth=1920&api_key=${apiKey}`;
                  const thumbnailUrl = `https://rsapi.goong.io/Place/Photo?photo_reference=${photoRef}&maxwidth=400&api_key=${apiKey}`;
                  
                  console.log(`[Goong API] 📸 Photo ${index + 1}: reference=${photoRef.substring(0, 20)}...`);
                  
                  return {
                    url: photoUrl,
                    thumbnail: thumbnailUrl,
                    reference: photoRef,
                    width: photo.width,
                    height: photo.height,
                  };
                }
                return null;
              }).filter((p: any) => p !== null);
              
              console.log(`[Goong API] 📸 Processed ${photoUrls.length} photo URLs`);
              
              // Get primary image
              const primaryImage = photoUrls.length > 0 
                ? photoUrls[0].url 
                : (place.photos?.[0]?.photo_reference 
                  ? `https://rsapi.goong.io/Place/Photo?photo_reference=${place.photos[0].photo_reference}&maxwidth=1920&api_key=${apiKey}`
                  : null);
              
              const thumbnail = photoUrls.length > 0 
                ? photoUrls[0].thumbnail 
                : (place.photos?.[0]?.photo_reference 
                  ? `https://rsapi.goong.io/Place/Photo?photo_reference=${place.photos[0].photo_reference}&maxwidth=400&api_key=${apiKey}`
                  : null);
              
              // Parse price from price_level or other price fields
              let price = null;
              let priceText = null;
              
              if (place.price_level !== undefined && place.price_level !== null) {
                const priceLevels: Record<number, number> = {
                  0: 0,        // Free
                  1: 100000,   // Inexpensive: ~100k VND
                  2: 500000,   // Moderate: ~500k VND
                  3: 1500000,  // Expensive: ~1.5M VND
                  4: 3000000,  // Very expensive: ~3M VND
                };
                price = priceLevels[place.price_level] || null;
                priceText = ["Miễn phí", "Rẻ", "Trung bình", "Đắt", "Rất đắt"][place.price_level] || null;
                console.log(`[Goong API] 💰 Price level: ${place.price_level} = ${priceText} (${price} VND)`);
              } else if (place.price) {
                // If there's a direct price field
                price = typeof place.price === 'number' ? place.price : parseFloat(place.price) || null;
                console.log(`[Goong API] 💰 Direct price: ${price} VND`);
              }
              
              // Build comprehensive description from multiple sources
              let description = "";
              
              // Priority 1: Editorial summary (best description)
              if (place.editorial_summary?.overview) {
                description = place.editorial_summary.overview;
                console.log(`[Goong API] 📝 Using editorial_summary.overview`);
              } 
              // Priority 2: Description field
              else if (place.description) {
                description = place.description;
                console.log(`[Goong API] 📝 Using description field`);
              }
              // Priority 3: Reviews text (first review)
              else if (place.reviews && Array.isArray(place.reviews) && place.reviews.length > 0) {
                description = place.reviews[0].text || "";
                console.log(`[Goong API] 📝 Using first review text`);
              }
              // Priority 4: Build from name and address
              else if (place.name) {
                const address = place.formatted_address || place.vicinity || place.address || "";
                description = address ? `${place.name} - ${address}` : place.name;
                console.log(`[Goong API] 📝 Built description from name + address`);
              }
              // Fallback: Use prediction description
              else {
                description = prediction.description || "";
                console.log(`[Goong API] 📝 Using prediction description`);
              }
              
              console.log(`[Goong API] 📝 Final description length: ${description.length} chars`);
              
              return {
                title: place.name || prediction.description,
                name: place.name || prediction.description,
                address: place.formatted_address || place.vicinity || place.address || prediction.description,
                rating: place.rating,
                reviews: place.user_ratings_total || place.reviews || 0,
                photos: photoUrls, // All photos with URLs
                photo_references: photos.map((p: any) => p.photo_reference).filter(Boolean),
                thumbnail: thumbnail,
                image: primaryImage,
                website: place.website || place.url,
                phone: place.formatted_phone_number || place.international_phone_number || place.phone,
                hours: place.opening_hours || place.current_opening_hours,
                opening_hours_text: place.opening_hours?.weekday_text || place.current_opening_hours?.weekday_text,
                description: description,
                editorial_summary: place.editorial_summary,
                gps_coordinates: place.geometry?.location ? {
                  latitude: place.geometry.location.lat,
                  longitude: place.geometry.location.lng,
                } : null,
                geometry: place.geometry,
                type: place.types?.[0] || "establishment",
                types: place.types || [],
                price: price,
                price_level: place.price_level,
                price_text: place.price_level !== undefined 
                  ? ["Miễn phí", "Rẻ", "Trung bình", "Đắt", "Rất đắt"][place.price_level] || null
                  : null,
                place_id: prediction.place_id,
                business_status: place.business_status,
                permanently_closed: place.permanently_closed,
                metadata: {
                  ...place,
                  all_photos: photoUrls,
                },
              };
            }
          }
        } catch (error: any) {
          console.error(`[Goong API] Error fetching details for ${prediction.place_id}:`, error.message);
        }
        
        // Fallback to prediction data if detail fetch fails
        const compound = prediction.compound || {};
        const address = prediction.description || 
          (compound.province ? `${compound.commune || ''} ${compound.district || ''} ${compound.province}`.trim() : '') ||
          "Unknown";
        
        return {
          title: prediction.structured_formatting?.main_text || prediction.description || "Unknown",
          name: prediction.structured_formatting?.main_text || prediction.description || "Unknown",
          address: address,
          description: prediction.description,
          compound: compound,
          types: prediction.types || [],
          place_id: placeId,
        };
      })
    );
    
    return results.filter((r: any) => r !== null);
  }
  
  return [];
}

// Test function to verify Goong API is working and get full data (images, price, description)
export const testGoongAPI = action({
  args: {
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const GOONG_API_KEY = process.env.GOONG_API_KEY;
    const testQuery = args.query || "hotels in Đà Nẵng";
    
    if (!GOONG_API_KEY) {
      return {
        error: "GOONG_API_KEY not found in environment variables",
        success: false,
      };
    }
    
    try {
      console.log(`\n[Test Goong API] ==========================================`);
      console.log(`[Test Goong API] Testing with query: "${testQuery}"`);
      console.log(`[Test Goong API] API Key (first 10 chars): ${GOONG_API_KEY.substring(0, 10)}...`);
      console.log(`[Test Goong API] ==========================================\n`);
      
      // Test Place Autocomplete
      const searchUrl = `https://rsapi.goong.io/Place/Autocomplete?input=${encodeURIComponent(testQuery)}&api_key=${GOONG_API_KEY}`;
      console.log(`[Test Goong API] 🔍 Search URL: ${searchUrl.replace(GOONG_API_KEY, "***")}`);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "TravelTourApp/1.0",
        },
      });
      
      const searchData = await searchResponse.json();
      
      console.log(`[Test Goong API] 📊 Search Response Status: ${searchResponse.status}`);
      
      if (!searchResponse.ok || searchData.error_message || searchData.error) {
        return {
          error: searchData.error_message || searchData.error || `HTTP ${searchResponse.status}`,
          success: false,
          response: searchData,
        };
      }
      
      // Filter to get establishments (hotels, restaurants, attractions)
      const predictions = searchData.predictions || [];
      const establishmentTypes = [
        'lodging', 'hotel', 'restaurant', 'food', 'cafe', 'bar', 
        'tourist_attraction', 'point_of_interest', 'establishment',
        'amusement_park', 'museum', 'park', 'beach', 'temple', 'church'
      ];
      
      const establishments = predictions.filter((p: any) => 
        p.types && p.types.some((t: string) => establishmentTypes.includes(t))
      );
      
      console.log(`[Test Goong API] 📊 Found ${establishments.length} establishments from ${predictions.length} total predictions`);
      
      if (establishments.length === 0) {
        return {
          success: false,
          error: "No establishments found. Only administrative areas found.",
          searchResponse: searchData,
          predictions: predictions,
          message: "Try searching for 'hotels in [city]' or 'attractions in [city]'",
        };
      }
      
      // Test with first 3 establishments to get full data
      const testResults = [];
      
      for (let i = 0; i < Math.min(3, establishments.length); i++) {
        const prediction = establishments[i];
        const placeId = prediction.place_id;
        
        console.log(`\n[Test Goong API] 🔍 Testing establishment ${i + 1}/${Math.min(3, establishments.length)}`);
        console.log(`[Test Goong API] 📍 Name: ${prediction.description}`);
        console.log(`[Test Goong API] 🆔 Place ID: ${placeId}`);
        console.log(`[Test Goong API] 🏷️ Types: ${prediction.types?.join(', ') || 'N/A'}`);
        
        if (placeId) {
          const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`;
          
          const detailResponse = await fetch(detailUrl, {
            headers: {
              "Accept": "application/json",
              "User-Agent": "TravelTourApp/1.0",
            },
          });
          
          const detailData = await detailResponse.json();
          
          if (detailResponse.ok && !detailData.error_message && !detailData.error) {
            const place = detailData.result || detailData.data || detailData;
            
            // Parse photos
            const photos = place.photos || [];
            const photoUrls = photos.map((photo: any) => {
              const photoRef = photo.photo_reference || photo.reference || photo.photoReference;
              if (photoRef) {
                return {
                  url: `https://rsapi.goong.io/Place/Photo?photo_reference=${photoRef}&maxwidth=1920&api_key=${GOONG_API_KEY}`,
                  thumbnail: `https://rsapi.goong.io/Place/Photo?photo_reference=${photoRef}&maxwidth=400&api_key=${GOONG_API_KEY}`,
                  reference: photoRef,
                  width: photo.width,
                  height: photo.height,
                };
              }
              return null;
            }).filter(Boolean);
            
            // Parse price
            let price = null;
            let priceText = null;
            if (place.price_level !== undefined && place.price_level !== null) {
              const priceLevels: Record<number, number> = {
                0: 0,
                1: 100000,
                2: 500000,
                3: 1500000,
                4: 3000000,
              };
              price = priceLevels[place.price_level] || null;
              priceText = ["Miễn phí", "Rẻ", "Trung bình", "Đắt", "Rất đắt"][place.price_level] || null;
            }
            
            // Parse description
            let description = "";
            if (place.editorial_summary?.overview) {
              description = place.editorial_summary.overview;
            } else if (place.description) {
              description = place.description;
            } else if (place.reviews && Array.isArray(place.reviews) && place.reviews.length > 0) {
              description = place.reviews[0].text || "";
            } else if (place.name) {
              description = `${place.name}${place.formatted_address ? ` - ${place.formatted_address}` : ""}`;
            }
            
            const result = {
              name: place.name || prediction.description,
              address: place.formatted_address || place.vicinity || place.address || prediction.description,
              rating: place.rating,
              reviews: place.user_ratings_total || place.reviews || 0,
              photos: {
                count: photoUrls.length,
                urls: photoUrls,
                primaryImage: photoUrls.length > 0 ? photoUrls[0].url : null,
                thumbnail: photoUrls.length > 0 ? photoUrls[0].thumbnail : null,
              },
              price: {
                level: place.price_level,
                text: priceText,
                value: price,
                currency: "VND",
              },
              description: {
                text: description,
                length: description.length,
                source: place.editorial_summary ? "editorial_summary" : 
                       place.description ? "description" : 
                       place.reviews ? "reviews" : "name+address",
              },
              phone: place.formatted_phone_number || place.international_phone_number || place.phone,
              website: place.website || place.url,
              hours: place.opening_hours || place.current_opening_hours,
              coordinates: place.geometry?.location ? {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              } : null,
              types: place.types || prediction.types || [],
              place_id: placeId,
              fullData: place, // Include full response for debugging
            };
            
            console.log(`[Test Goong API] ✅ Successfully parsed data:`);
            console.log(`  - Photos: ${result.photos.count}`);
            console.log(`  - Price: ${result.price.text || 'N/A'} (${result.price.value || 'N/A'} VND)`);
            console.log(`  - Rating: ${result.rating || 'N/A'}`);
            console.log(`  - Reviews: ${result.reviews || 0}`);
            console.log(`  - Description: ${result.description.length} chars from ${result.description.source}`);
            
            testResults.push(result);
          } else {
            console.log(`[Test Goong API] ⚠️ Detail API error: ${detailData.error_message || detailData.error || detailResponse.status}`);
            testResults.push({
              name: prediction.description,
              place_id: placeId,
              error: detailData.error_message || detailData.error || `HTTP ${detailResponse.status}`,
            });
          }
        }
      }
      
      return {
        success: true,
        query: testQuery,
        establishmentsFound: establishments.length,
        totalPredictions: predictions.length,
        results: testResults,
        summary: {
          withPhotos: testResults.filter((r: any) => r.photos && r.photos.count > 0).length,
          withPrice: testResults.filter((r: any) => r.price && r.price.value !== null).length,
          withDescription: testResults.filter((r: any) => r.description && r.description.length > 0).length,
          withRating: testResults.filter((r: any) => r.rating !== undefined && r.rating !== null).length,
        },
      };
    } catch (error: any) {
      console.error(`[Test Goong API] ❌ Error:`, error);
      return {
        error: error.message || error.toString(),
        success: false,
        stack: error.stack,
      };
    }
  },
});

// Upgrade Google hosted image URL to get higher quality
function upgradeGoogleHostedImageUrl(url: string): string {
  if (typeof url !== "string") return url as any;
  // Most Google-hosted thumbnails look like:
  // https://lh5.googleusercontent.com/p/...=w408-h306-k-no
  // Bump size to reduce blur when displayed large.
  if (/googleusercontent\.com\/p\//i.test(url)) {
    // Replace =w###-h###... with a larger size for better quality
    const upgraded = url.replace(/=w\d+-h\d+[^&]*/i, "=w2048-h1536-k-no");
    return upgraded;
  }
  // Some URLs use =s### pattern
  if (/googleusercontent\.com/i.test(url) && /=s\d+/i.test(url)) {
    return url.replace(/=s\d+/i, "=s2048");
  }
  return url;
}

// Helper function to get image from Wikipedia API
async function getWikipediaImage(query: string, accessToken: string): Promise<string | null> {
  try {
    // Map Vietnamese city names to English names for Wikipedia
    const cityNameMap: Record<string, string> = {
      'Đà Nẵng': 'Da Nang',
      'Phú Quốc': 'Phu Quoc',
      'Hạ Long': 'Ha Long Bay',
      'Hội An': 'Hoi An',
      'Sapa': 'Sa Pa', // Wikipedia uses "Sa Pa" with space
      'Nha Trang': 'Nha Trang',
    };
    
    const englishName = cityNameMap[query] || query;
    
    // Try Wikipedia REST API with access token
    const wikiQueries = [englishName, query];
    
    for (const wikiQuery of wikiQueries) {
      try {
        const encodedQuery = encodeURIComponent(wikiQuery);
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;
        
        console.log(`[Wikipedia] Trying to get image for: ${wikiQuery}`);
        
        // Wikipedia REST API is public and doesn't require authentication
        // Try without Authorization first (most reliable)
        let wikiResponse = await fetch(wikiUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "TravelTourApp/1.0 (contact: support@traveltour.app)",
          },
        });
        
        // If that fails, try with Authorization header (for rate limits)
        if (!wikiResponse.ok && accessToken && accessToken.length > 50) {
          console.log(`[Wikipedia] Retrying with Authorization header for ${wikiQuery}`);
          wikiResponse = await fetch(wikiUrl, {
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${accessToken}`,
              "User-Agent": "TravelTourApp/1.0 (contact: support@traveltour.app)",
            },
          });
        }
        
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          
          // Try originalimage first (if available) - this is the full-size image
          if (wikiData.originalimage?.source) {
            const originalUrl = wikiData.originalimage.source;
            if (originalUrl.startsWith('http') && originalUrl.length > 20) {
              console.log(`[Wikipedia] ✅ Found originalimage for ${wikiQuery}: ${originalUrl.substring(0, 100)}`);
              return originalUrl;
            }
          }
          
          // Fallback to thumbnail
          if (wikiData.thumbnail?.source) {
            let imageUrl = wikiData.thumbnail.source;
            
            // Fix Wikipedia thumbnail URL
            // Format: https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Example.jpg/300px-Example.jpg
            // We want: https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg
            if (imageUrl.includes('/thumb/')) {
              const parts = imageUrl.split('/thumb/');
              if (parts.length === 2) {
                const basePath = parts[0];
                const thumbPath = parts[1];
                const pathParts = thumbPath.split('/');
                if (pathParts.length > 1) {
                  pathParts.pop(); // Remove size suffix
                  const filePath = pathParts.join('/');
                  imageUrl = `${basePath}/${filePath}`;
                }
              }
            }
            
            if (imageUrl.startsWith('http') && imageUrl.length > 20 && !imageUrl.includes('/thumb/')) {
              console.log(`[Wikipedia] ✅ Found thumbnail image for ${wikiQuery}`);
              return imageUrl;
            }
          }
        } else {
          console.log(`[Wikipedia] ⚠️ API error for ${wikiQuery}: ${wikiResponse.status}`);
        }
      } catch (error: any) {
        console.log(`[Wikipedia] ❌ Error fetching ${wikiQuery}:`, error.message);
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('[Wikipedia] ❌ Request failed:', error.message);
    return null;
  }
}

// Get destination image for a city (used by homepage)
export const getDestinationImage = action({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const location = args.location;
    console.log(`[getDestinationImage] Getting image for: ${location}`);
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    if (SERPAPI_KEY) {
      // Try Maps thumbnail first (cheap: 1 call)
      const places = await serpApiMapsSearch(`${location} Vietnam`, SERPAPI_KEY, ctx);
      const thumb = places?.[0]?.thumbnail;
      if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
        return { image: thumb };
      }

      // Fallback to Google Images (still SerpAPI)
      const img = await getSerpApiImage(location, "Vietnam", SERPAPI_KEY, ctx);
      if (img) return { image: img };
    } else {
      console.log(`[getDestinationImage] ⚠️ SERPAPI_KEY missing, using fallback`);
    }
    
    // Fallback to curated Unsplash images (high quality)
    const destinationImages: Record<string, string> = {
      'Đà Nẵng': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=95&auto=format&fit=crop',
      'Phú Quốc': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop',
      'Hạ Long': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=95&auto=format&fit=crop',
      'Hội An': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=95&auto=format&fit=crop',
      'Sapa': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop',
      'Nha Trang': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=95&auto=format&fit=crop',
    };
    
    const image = destinationImages[location] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop';
    console.log(`[getDestinationImage] Using fallback image for ${location}`);
    return { image };
  },
});

// Search attractions using Geoapify Places API (with OpenStreetMap as fallback)
export const searchAttractions = action({
  args: {
    location: v.string(),
    category: v.optional(v.string()),
    page: v.optional(v.number()), // Pagination: page number (1-based)
    limit: v.optional(v.number()), // Pagination: items per page
  },
  handler: async (ctx, args) => {
    const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || 'eb78ec7a127445c0a25ea8b5e856442a';
    const limit = args.limit || 15; // Increased default limit to 15
    const page = args.page || 1; // Default to page 1
    
    console.log(`[searchAttractions] Location: ${args.location}, Page: ${page}, Limit: ${limit}`);
    console.log(`[searchAttractions] API Key exists: ${!!GEOAPIFY_API_KEY}`);
    
    // Try Geoapify first (has better data)
    if (GEOAPIFY_API_KEY) {
      try {
        console.log(`[searchAttractions] Trying Geoapify...`);
        const geoapifyResults = await searchGeoapifyPlaces(args.location, 'attraction', GEOAPIFY_API_KEY, limit);
        
        console.log(`[searchAttractions] Geoapify returned ${geoapifyResults.length} results`);
        
        if (geoapifyResults.length > 0) {
          // Apply pagination
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedResults = geoapifyResults.slice(startIndex, endIndex);
          
          console.log(`[searchAttractions] ✅ Using Geoapify results (page ${page}, showing ${paginatedResults.length} items)`);
          return {
            results: paginatedResults,
            total: geoapifyResults.length,
            page: page,
            limit: limit,
            hasMore: endIndex < geoapifyResults.length,
          };
        } else {
          console.log(`[searchAttractions] ⚠️ Geoapify returned 0 results, trying OpenStreetMap`);
        }
      } catch (geoapifyError: any) {
        console.error(`[searchAttractions] ❌ Geoapify failed:`, geoapifyError.message);
        console.error("[searchAttractions] Trying OpenStreetMap fallback...");
      }
    } else {
      console.log(`[searchAttractions] ⚠️ No API key, skipping Geoapify`);
    }
    
    // Fallback to OpenStreetMap
    try {
      console.log(`[searchAttractions] Searching OpenStreetMap for: ${args.location} (attraction)`);
      const osmResults = await searchOpenStreetMapPlaces(args.location, 'attraction', limit);
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = osmResults.slice(startIndex, endIndex);
      
      return {
        results: paginatedResults,
        total: osmResults.length,
        page: page,
        limit: limit,
        hasMore: endIndex < osmResults.length,
      };
    } catch (osmError: any) {
      console.error("OpenStreetMap failed, using mock data:", osmError.message);
      // Final fallback to mock data
      try {
        const mockResults: any[] = await ctx.runAction(api.api.getMockAttractions, {
          city: args.location,
        });
        // Apply pagination to mock data
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults: any[] = mockResults.slice(startIndex, endIndex);
        
        return {
          results: paginatedResults,
          total: mockResults.length,
          page: page,
          limit: limit,
          hasMore: endIndex < mockResults.length,
        };
      } catch (fallbackError) {
        throw new Error("Failed to fetch attraction data");
      }
    }
  },
});

// Search restaurants using Geoapify Places API (with OpenStreetMap as fallback)
export const searchRestaurants = action({
  args: {
    location: v.string(),
    page: v.optional(v.number()), // Pagination: page number (1-based)
    limit: v.optional(v.number()), // Pagination: items per page (default 6 per region)
  },
  handler: async (ctx, args) => {
    const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || 'eb78ec7a127445c0a25ea8b5e856442a';
    const limit = args.limit || 6; // Default to 6 items per region
    const page = args.page || 1; // Default to page 1
    
    console.log(`[searchRestaurants] Location: ${args.location}, Page: ${page}, Limit: ${limit}`);
    console.log(`[searchRestaurants] API Key exists: ${!!GEOAPIFY_API_KEY}`);
    
    // Try Geoapify first (has better data)
    if (GEOAPIFY_API_KEY) {
      try {
        console.log(`[searchRestaurants] Trying Geoapify...`);
        const geoapifyResults = await searchGeoapifyPlaces(args.location, 'restaurant', GEOAPIFY_API_KEY, limit);
        
        console.log(`[searchRestaurants] Geoapify returned ${geoapifyResults.length} results`);
        
        if (geoapifyResults.length > 0) {
          // Apply pagination
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedResults = geoapifyResults.slice(startIndex, endIndex);
          
          console.log(`[searchRestaurants] ✅ Using Geoapify results (page ${page}, showing ${paginatedResults.length} items)`);
          return {
            results: paginatedResults,
            total: geoapifyResults.length,
            page: page,
            limit: limit,
            hasMore: endIndex < geoapifyResults.length,
          };
        } else {
          console.log(`[searchRestaurants] ⚠️ Geoapify returned 0 results, trying OpenStreetMap`);
        }
      } catch (geoapifyError: any) {
        console.error(`[searchRestaurants] ❌ Geoapify failed:`, geoapifyError.message);
        console.error("[searchRestaurants] Trying OpenStreetMap fallback...");
      }
    } else {
      console.log(`[searchRestaurants] ⚠️ No API key, skipping Geoapify`);
    }
    
    // Fallback to OpenStreetMap
    try {
      console.log(`[searchRestaurants] Searching OpenStreetMap for: ${args.location} (restaurant)`);
      const osmResults = await searchOpenStreetMapPlaces(args.location, 'restaurant', limit);
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = osmResults.slice(startIndex, endIndex);
      
      return {
        results: paginatedResults,
        total: osmResults.length,
        page: page,
        limit: limit,
        hasMore: endIndex < osmResults.length,
      };
    } catch (osmError: any) {
      console.error("OpenStreetMap failed, using mock data:", osmError.message);
      // Final fallback to mock data
      try {
        const mockResults: any[] = await ctx.runAction(api.api.getMockRestaurants, {
          city: args.location,
        });
        // Apply pagination to mock data
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults: any[] = mockResults.slice(startIndex, endIndex);
        
        return {
          results: paginatedResults,
          total: mockResults.length,
          page: page,
          limit: limit,
          hasMore: endIndex < mockResults.length,
        };
      } catch (fallbackError) {
        throw new Error("Failed to fetch restaurant data");
      }
    }
  },
});

// OpenWeatherMap API for weather data
export const getWeather = action({
  args: {
    city: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!OPENWEATHER_API_KEY) {
      console.warn("[getWeather] ⚠️ OPENWEATHER_API_KEY not configured in Convex env, returning mock weather");
      // Return mock weather instead of throwing - caller in items.ts already has fallback
      return null;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(args.city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=vi`
      );

      if (!response.ok) {
        console.warn(`[getWeather] ⚠️ OpenWeather API returned ${response.status}, using mock`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("[getWeather] OpenWeather API error:", error);
      return null;
    }
  },
});

// Mock data for development (when APIs are not available)
export const getMockHotels = action({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const WIKIPEDIA_ACCESS_TOKEN = process.env.WIKIPEDIA_ACCESS_TOKEN;
    
    const mockHotels = [
      // ===== ĐÀ NẴNG =====
      { id: "dn1", name: "InterContinental Đà Nẵng", location: "Đà Nẵng", price: 2500000, rating: 4.5, image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800", description: "Khách sạn 5 sao với view biển tuyệt đẹp", category: "beach", tags: ["beach", "luxury"], amenities: ["WiFi", "Pool", "Spa", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "dn2", name: "Novotel Đà Nẵng", location: "Đà Nẵng", price: 1800000, rating: 4.3, image: "https://images.unsplash.com/photo-1551882547-ff40c4a49f8e?w=800", description: "Khách sạn 4 sao gần trung tâm thành phố", category: "city", tags: ["city", "urban"], amenities: ["WiFi", "Pool", "Gym", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "dn3", name: "Hyatt Regency Đà Nẵng", location: "Đà Nẵng", price: 3200000, rating: 4.7, image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800", description: "Khách sạn 5 sao sang trọng với dịch vụ cao cấp", category: "luxury", tags: ["city", "luxury"], amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar"], checkIn: "15:00", checkOut: "11:00" },
      { id: "dn4", name: "Furama Resort Đà Nẵng", location: "Đà Nẵng", price: 2200000, rating: 4.4, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Resort biển sang trọng với bãi biển riêng", category: "beach", tags: ["beach", "resort"], amenities: ["WiFi", "Pool", "Beach", "Spa", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      // ===== VŨNG TÀU =====
      { id: "vt1", name: "Pullman Vũng Tàu", location: "Vũng Tàu", price: 1800000, rating: 4.5, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", description: "Khách sạn 5 sao sang trọng gần bãi biển Front Beach", category: "beach", tags: ["beach", "luxury"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar"], checkIn: "14:00", checkOut: "12:00" },
      { id: "vt2", name: "Grand Hotel Vũng Tàu", location: "Vũng Tàu", price: 900000, rating: 4.1, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", description: "Khách sạn 3 sao lịch sử, vị trí trung tâm gần biển", category: "city", tags: ["city", "beach"], amenities: ["WiFi", "Pool", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "vt3", name: "Imperial Hotel Vũng Tàu", location: "Vũng Tàu", price: 1200000, rating: 4.2, image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800", description: "Khách sạn 4 sao với view biển Back Beach tuyệt đẹp", category: "beach", tags: ["beach", "sea view"], amenities: ["WiFi", "Pool", "Sea View", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "vt4", name: "Sammy Hotel Vũng Tàu", location: "Vũng Tàu", price: 650000, rating: 3.9, image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800", description: "Khách sạn 3 sao tiện lợi, giá cả hợp lý", category: "city", tags: ["affordable", "city"], amenities: ["WiFi", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      // ===== HUẾ =====
      { id: "hue1", name: "Azerai La Résidence Huế", location: "Huế", price: 2800000, rating: 4.7, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Khách sạn di sản sang trọng bên bờ sông Hương", category: "heritage", tags: ["heritage", "luxury", "river view"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar"], checkIn: "14:00", checkOut: "12:00" },
      { id: "hue2", name: "Green Hotel Huế", location: "Huế", price: 700000, rating: 4.2, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800", description: "Khách sạn 3 sao thân thiện, gần các điểm tham quan", category: "city", tags: ["affordable", "central"], amenities: ["WiFi", "Restaurant", "Breakfast"], checkIn: "14:00", checkOut: "12:00" },
      { id: "hue3", name: "Indochine Palace Huế", location: "Huế", price: 1500000, rating: 4.4, image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", description: "Khách sạn 4 sao phong cách Đông Dương lịch sử", category: "heritage", tags: ["heritage", "colonial"], amenities: ["WiFi", "Pool", "Spa", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      // ===== HÀ NỘI =====
      { id: "hn1", name: "Sofitel Legend Metropole Hà Nội", location: "Hà Nội", price: 5500000, rating: 4.9, image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800", description: "Khách sạn lịch sử biểu tượng của Hà Nội, di sản thế giới", category: "heritage", tags: ["heritage", "luxury", "iconic"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar", "Gym"], checkIn: "15:00", checkOut: "12:00" },
      { id: "hn2", name: "Melia Hà Nội", location: "Hà Nội", price: 2000000, rating: 4.3, image: "https://images.unsplash.com/photo-1551882547-ff40c4a49f8e?w=800", description: "Khách sạn 5 sao hiện đại trung tâm thành phố", category: "business", tags: ["business", "luxury", "central"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar"], checkIn: "14:00", checkOut: "12:00" },
      { id: "hn3", name: "Hanoi La Siesta Hotel", location: "Hà Nội", price: 1200000, rating: 4.6, image: "https://images.unsplash.com/photo-1499856871958-5b9357452202?w=800", description: "Boutique hotel sang trọng tại Phố Cổ Hà Nội", category: "boutique", tags: ["boutique", "old quarter"], amenities: ["WiFi", "Restaurant", "Rooftop Bar", "Spa"], checkIn: "14:00", checkOut: "12:00" },
      // ===== TP HỒ CHÍ MINH =====
      { id: "hcm1", name: "Park Hyatt Sài Gòn", location: "Hồ Chí Minh", price: 6000000, rating: 4.9, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Khách sạn 5 sao đẳng cấp tại trung tâm Quận 1", category: "luxury", tags: ["luxury", "iconic", "central"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar", "Gym"], checkIn: "15:00", checkOut: "12:00" },
      { id: "hcm2", name: "Caravelle Sài Gòn", location: "Hồ Chí Minh", price: 3500000, rating: 4.6, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", description: "Khách sạn lịch sử biểu tượng tại trung tâm Sài Gòn", category: "heritage", tags: ["heritage", "central", "rooftop"], amenities: ["WiFi", "Pool", "Rooftop Bar", "Restaurant", "Spa"], checkIn: "14:00", checkOut: "12:00" },
      { id: "hcm3", name: "Liberty Central Saigon Riverside", location: "Hồ Chí Minh", price: 1500000, rating: 4.2, image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800", description: "Khách sạn 4 sao view sông Sài Gòn, vị trí trung tâm", category: "city", tags: ["river view", "central"], amenities: ["WiFi", "Pool", "Restaurant", "Rooftop"], checkIn: "14:00", checkOut: "12:00" },
      // ===== NHA TRANG =====
      { id: "nt1", name: "Vinpearl Resort Nha Trang", location: "Nha Trang", price: 3000000, rating: 4.8, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Resort đảo sang trọng với công viên giải trí", category: "resort", tags: ["island", "resort", "theme park"], amenities: ["WiFi", "Pool", "Beach", "Theme Park", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "nt2", name: "Sheraton Nha Trang", location: "Nha Trang", price: 2500000, rating: 4.5, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", description: "Khách sạn 5 sao view biển Nha Trang tuyệt vời", category: "beach", tags: ["beach", "luxury", "sea view"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar"], checkIn: "14:00", checkOut: "12:00" },
      { id: "nt3", name: "Sunrise Nha Trang Beach Hotel", location: "Nha Trang", price: 1500000, rating: 4.3, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800", description: "Khách sạn 4 sao bãi biển, nhạc live hàng đêm", category: "beach", tags: ["beach", "entertainment"], amenities: ["WiFi", "Pool", "Beach Bar", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      // ===== ĐÀ LẠT =====
      { id: "dl1", name: "Dalat Palace Heritage Hotel", location: "Đà Lạt", price: 3500000, rating: 4.8, image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", description: "Khách sạn di sản Pháp cổ kính, nhìn ra hồ Xuân Hương", category: "heritage", tags: ["heritage", "lake view", "colonial"], amenities: ["WiFi", "Restaurant", "Bar", "Garden"], checkIn: "14:00", checkOut: "12:00" },
      { id: "dl2", name: "Terracotta Hotel Đà Lạt", location: "Đà Lạt", price: 1200000, rating: 4.4, image: "https://images.unsplash.com/photo-1499856871958-5b9357452202?w=800", description: "Boutique hotel phong cách gốm độc đáo giữa rừng thông", category: "boutique", tags: ["boutique", "unique", "forest"], amenities: ["WiFi", "Restaurant", "Garden", "Fireplace"], checkIn: "14:00", checkOut: "12:00" },
      // ===== HỘI AN =====
      { id: "ha1", name: "Anantara Hội An Resort", location: "Hội An", price: 3800000, rating: 4.8, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Resort 5 sao sang trọng ven sông Thu Bồn", category: "resort", tags: ["river view", "luxury", "resort"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Boat tours"], checkIn: "14:00", checkOut: "12:00" },
      { id: "ha2", name: "Hội An Historic Hotel", location: "Hội An", price: 1500000, rating: 4.3, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800", description: "Khách sạn 4 sao gần phố cổ UNESCO", category: "heritage", tags: ["heritage", "old town"], amenities: ["WiFi", "Pool", "Restaurant", "Bicycle"], checkIn: "14:00", checkOut: "12:00" },
      // ===== HẠ LONG =====
      { id: "hl1", name: "Paradise Elegance Cruise", location: "Hạ Long", price: 4500000, rating: 4.9, image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800", description: "Du thuyền 5 sao hạng sang ngắm Vịnh Hạ Long", category: "cruise", tags: ["cruise", "luxury", "bay views"], amenities: ["WiFi", "Spa", "Restaurant", "Kayaking", "Cooking class"], checkIn: "12:00", checkOut: "10:00" },
      { id: "hl2", name: "Vinpearl Resort Hạ Long", location: "Hạ Long", price: 2800000, rating: 4.6, image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800", description: "Resort cao cấp view Vịnh Hạ Long hùng vĩ", category: "resort", tags: ["resort", "bay view", "luxury"], amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Cable Car"], checkIn: "14:00", checkOut: "12:00" },
      // ===== PHÚ QUỐC =====
      { id: "pq1", name: "JW Marriott Phú Quốc", location: "Phú Quốc", price: 6500000, rating: 4.9, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Resort siêu sang trọng phong cách đại học cổ trên đảo", category: "luxury", tags: ["luxury", "beach", "iconic"], amenities: ["WiFi", "Pool", "Beach", "Spa", "Multiple Restaurants", "Gym"], checkIn: "15:00", checkOut: "12:00" },
      { id: "pq2", name: "Premier Village Phú Quốc", location: "Phú Quốc", price: 4000000, rating: 4.7, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", description: "Resort biệt thự pool villa nhìn ra biển xanh", category: "resort", tags: ["villa", "beach", "pool"], amenities: ["WiFi", "Private Pool", "Beach", "Spa", "Restaurant"], checkIn: "14:00", checkOut: "12:00" },
      { id: "pq3", name: "La Veranda Phú Quốc", location: "Phú Quốc", price: 2500000, rating: 4.5, image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800", description: "Resort bungalow phong cách Pháp thuộc trên bãi biển", category: "boutique", tags: ["boutique", "colonial", "beach"], amenities: ["WiFi", "Pool", "Beach", "Restaurant", "Bar"], checkIn: "14:00", checkOut: "12:00" },
    ];

    // Normalize city name for flexible matching
    const normalizeCity = (city: string): string => {
      const cityLower = city.toLowerCase();
      if (cityLower.includes('đà nẵng') || cityLower.includes('da nang') || cityLower.includes('danang') || cityLower.includes('dad')) return 'đà nẵng';
      if (cityLower.includes('phú quốc') || cityLower.includes('phu quoc') || cityLower.includes('pqc')) return 'phú quốc';
      if (cityLower.includes('hạ long') || cityLower.includes('ha long') || cityLower.includes('halong') || cityLower.includes('vdo')) return 'hạ long';
      if (cityLower.includes('hội an') || cityLower.includes('hoi an') || cityLower.includes('hoian')) return 'hội an';
      if (cityLower.includes('nha trang') || cityLower.includes('nhatrang') || cityLower.includes('cxr')) return 'nha trang';
      if (cityLower.includes('sapa') || cityLower.includes('sa pa')) return 'sapa';
      if (cityLower.includes('vũng tàu') || cityLower.includes('vung tau')) return 'vũng tàu';
      if (cityLower.includes('huế') || cityLower.includes('hue')) return 'huế';
      if (cityLower.includes('hà nội') || cityLower.includes('hanoi') || cityLower.includes('han')) return 'hà nội';
      if (cityLower.includes('hồ chí minh') || cityLower.includes('ho chi minh') || cityLower.includes('sài gòn') || cityLower.includes('saigon') || cityLower.includes('sgn')) return 'hồ chí minh';
      if (cityLower.includes('đà lạt') || cityLower.includes('da lat') || cityLower.includes('dalat') || cityLower.includes('dli')) return 'đà lạt';
      if (cityLower.includes('quy nhơn') || cityLower.includes('quy nhon')) return 'quy nhơn';
      if (cityLower.includes('phan thiết') || cityLower.includes('phan thiet')) return 'phan thiết';
      if (cityLower.includes('cần thơ') || cityLower.includes('can tho') || cityLower.includes('vca')) return 'cần thơ';
      return cityLower;
    };

    const normalizedCity = normalizeCity(args.city);
    console.log(`[getMockHotels] 🔍 Filtering hotels for city: "${args.city}" -> normalized: "${normalizedCity}"`);
    
    const filteredHotels = mockHotels.filter(hotel => {
      const hotelLocation = hotel.location.toLowerCase();
      const cityMatch = hotelLocation.includes(normalizedCity) || normalizedCity.includes(hotelLocation);
      console.log(`[getMockHotels]   Checking hotel "${hotel.name}" (location: "${hotel.location}"): ${cityMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      return cityMatch;
    });
    
    console.log(`[getMockHotels] 📊 Filtered ${filteredHotels.length} hotels from ${mockHotels.length} total`);
    
    // If no hotels found, use all hotels as fallback
    const hotelsToProcess = filteredHotels.length > 0 ? filteredHotels : mockHotels;
    if (filteredHotels.length === 0) {
      console.log(`[getMockHotels] ⚠️ No hotels found for "${args.city}", using all ${mockHotels.length} hotels as fallback`);
    }
    
    // Try to get Wikipedia images for each hotel
    if (WIKIPEDIA_ACCESS_TOKEN) {
      const hotelsWithImages = await Promise.all(hotelsToProcess.map(async (hotel) => {
        try {
          // Try to get Wikipedia image
          const cityNameMap: Record<string, string> = {
            'Đà Nẵng': 'Danang',
            'Phú Quốc': 'Phu Quoc',
            'Hạ Long': 'Ha Long',
            'Hội An': 'Hoi An',
            'Sapa': 'Sa Pa',
            'Nha Trang': 'Nha Trang',
          };
          
          const englishLocation = cityNameMap[hotel.location] || hotel.location;
          const searchVariations = [
            `${hotel.name.replace('Đà Nẵng', 'Danang')}`,
            `${hotel.name.replace('Đà Nẵng', 'Da Nang')}`,
            `InterContinental ${englishLocation}`,
            `Novotel ${englishLocation}`,
            `Hyatt Regency ${englishLocation}`,
          ];
          
          for (const searchTerm of searchVariations) {
            const wikiImage = await getWikipediaImage(searchTerm, WIKIPEDIA_ACCESS_TOKEN);
            if (wikiImage) {
              console.log(`[getMockHotels] ✅ Found Wikipedia image for ${hotel.name}`);
              return { ...hotel, image: wikiImage };
            }
          }
        } catch (error) {
          console.log(`[getMockHotels] ⚠️ Wikipedia failed for ${hotel.name}`);
        }
        
        // Fallback to Unsplash
        return { 
          ...hotel, 
          image: hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=95&auto=format&fit=crop" 
        };
      }));
      
      return hotelsWithImages;
    }
    
    // Fallback without Wikipedia
    return hotelsToProcess.map(hotel => ({
      ...hotel,
      image: hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&auto=format&fit=crop"
    }));
  },
});

export const getMockAttractions = action({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const WIKIPEDIA_ACCESS_TOKEN = process.env.WIKIPEDIA_ACCESS_TOKEN;
    
    const mockAttractions = [
      {
        id: "1",
        name: "Bà Nà Hills",
        location: "Đà Nẵng",
        price: 800000,
        rating: 4.8,
        image: "", // Will be set from Wikipedia
        description: "Khu du lịch trên núi với cầu Vàng nổi tiếng",
        category: "attraction",
        tags: ["adventure", "nature", "city"],
        duration: "4-6 giờ",
        openingHours: "07:00 - 22:00",
      },
      {
        id: "2",
        name: "Chùa Linh Ứng",
        location: "Đà Nẵng",
        price: 50000, // Free/cheap temple entry
        rating: 4.4,
        image: "", // Will be set from Wikipedia
        description: "Chùa cổ với tượng Phật Quan Âm cao nhất Việt Nam",
        category: "temple",
        tags: ["culture", "historical"],
        duration: "1-2 giờ",
        openingHours: "06:00 - 18:00",
      },
      {
        id: "3",
        name: "Bãi biển Mỹ Khê",
        location: "Đà Nẵng",
        price: 0, // Free beach
        rating: 4.6,
        image: "", // Will be set from Wikipedia
        description: "Bãi biển đẹp nhất thế giới với cát trắng mịn",
        category: "beach",
        tags: ["beach", "nature"],
        duration: "2-4 giờ",
        openingHours: "24/7",
      },
    ];

    const filteredAttractions = mockAttractions.filter(attraction => 
      attraction.location.toLowerCase().includes(args.city.toLowerCase())
    );
    
    // Try to get Wikipedia images for each attraction
    if (WIKIPEDIA_ACCESS_TOKEN) {
      const attractionsWithImages = await Promise.all(filteredAttractions.map(async (attraction) => {
        try {
          const wikiImage = await getWikipediaImage(attraction.name, WIKIPEDIA_ACCESS_TOKEN);
          if (wikiImage) {
            console.log(`[getMockAttractions] ✅ Found Wikipedia image for ${attraction.name}`);
            return { ...attraction, image: wikiImage };
          }
        } catch (error) {
          console.log(`[getMockAttractions] ⚠️ Wikipedia failed for ${attraction.name}`);
        }
        
        // Fallback to Unsplash
        return { 
          ...attraction, 
          image: attraction.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=95&auto=format&fit=crop" 
        };
      }));
      
      return attractionsWithImages;
    }
    
    // Fallback without Wikipedia
    return filteredAttractions.map(attraction => ({
      ...attraction,
      image: attraction.image || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop"
    }));
  },
});

export const getMockRestaurants = action({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const mockRestaurants = [
      {
        id: "1",
        name: "Nhà hàng Hải Sản Mỹ Khê",
        location: "Đà Nẵng",
        price: 500000,
        rating: 4.3,
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=95&auto=format&fit=crop",
        description: "Hải sản tươi ngon với view biển",
        category: "seafood",
        tags: ["food", "beach"],
        cuisine: "Hải sản",
        openingHours: "10:00 - 22:00",
      },
      {
        id: "2",
        name: "Quán Bún Bò Huế",
        location: "Đà Nẵng",
        price: 80000,
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=95&auto=format&fit=crop",
        description: "Bún bò Huế đặc sản miền Trung",
        category: "vietnamese",
        tags: ["food", "culture"],
        cuisine: "Việt Nam",
        openingHours: "06:00 - 14:00",
      },
      {
        id: "3",
        name: "Nhà hàng Sky36",
        location: "Đà Nẵng",
        price: 1200000,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=95&auto=format&fit=crop",
        description: "Nhà hàng trên cao với view toàn thành phố",
        category: "fine-dining",
        tags: ["food", "city"],
        cuisine: "Quốc tế",
        openingHours: "18:00 - 23:00",
      },
    ];

    return mockRestaurants.filter(restaurant => 
      restaurant.location.toLowerCase().includes(args.city.toLowerCase())
    );
  },
});

// Unified Search Action - Main search flow with cache
// This is the main entry point for search functionality
export const unifiedSearch = action({
  args: {
    query: v.string(),
    filters: v.optional(v.object({
      budget: v.optional(v.number()),
      duration: v.optional(v.number()),
      interests: v.optional(v.array(v.string())),
      destination: v.optional(v.string()),
    })),
    // Optional flight search params (Amadeus)
    origin: v.optional(v.string()),
    destination: v.optional(v.string()),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    adults: v.optional(v.number()),
    page: v.optional(v.number()), // Pagination: page number (1-based)
    limit: v.optional(v.number()), // Pagination: items per page per region (default 6)
  },
  handler: async (ctx, args) => {
    console.log(`\n[unifiedSearch] ==========================================`);
    console.log(`[unifiedSearch] 🔍 NEW SEARCH REQUEST`);
    console.log(`[unifiedSearch] Query: "${args.query || ""}"`);
    console.log(`[unifiedSearch] Page: ${args.page || 1}, Limit: ${args.limit || 20}`);
    console.log(`[unifiedSearch] Filters:`, JSON.stringify(args.filters || {}, null, 2));
    console.log(`[unifiedSearch] ⚠️ SERPAPI Cache enabled - will check cache before API calls`);
    console.log(`[unifiedSearch] ==========================================\n`);
    
    const filters = args.filters || {
      budget: undefined,
      duration: undefined,
      interests: undefined,
      destination: undefined,
    };
    
    const page = args.page || 1; // Default to page 1
    const limit = args.limit || 20; // Default to 20 items per region

    // If query is empty but has interests, use a default query for category-based search
    // This allows searching by category/filter only
    let searchQuery = (args.query || "").trim();
    
    // Check if this is a flight search (has origin, destination, date) - check early
    const hasFlightParams = !!(args.origin && args.destination && args.departureDate);
    
    // If no query but has filters, use default location
    if (!searchQuery && filters.interests && filters.interests.length > 0) {
      searchQuery = "Việt Nam";
      console.log("No query provided but has filters, using default location:", searchQuery);
    }

    // Must have either query, filters, OR flight params to search
    if (!searchQuery && (!filters.interests || filters.interests.length === 0) && !hasFlightParams) {
      console.log("No query, no filters, and no flight params, returning empty results");
      return {
        results: [],
        fromCache: false,
      };
    }
    
    console.log("Unified search called with:", {
      query: searchQuery,
      hasFilters: filters.interests && filters.interests.length > 0,
      hasFlightParams: hasFlightParams,
      flightOrigin: args.origin,
      flightDestination: args.destination,
      flightDate: args.departureDate,
      filters: filters
    });
    
    // Step 1: Check cache for non-flight results
    let cacheResult: any = { cached: false, results: null };
    if (searchQuery || (filters.interests && filters.interests.length > 0)) {
      cacheResult = await ctx.runQuery(api.searchCache.getCachedSearch, {
        query: searchQuery,
        filters,
      });
    }

    if (cacheResult.cached && cacheResult.results) {
      const SERPAPI_KEY = process.env.SERPAPI_KEY;

      // Invalidate cache if it contains obvious mock/fallback images (so we can refresh with SerpAPI)
      const hasMockImages = cacheResult.results.some((item: any) => 
        item.image && typeof item.image === "string" && item.image.includes("example.com")
      );
      const hasFallbackUnsplash = cacheResult.results.some((item: any) =>
        item.image &&
        typeof item.image === "string" &&
        (item.image.includes("source.unsplash.com") ||
          item.image.includes("images.unsplash.com/photo-1566073771259") ||
          item.image.includes("images.unsplash.com/photo-1559339352") ||
          item.image.includes("vietnam-travel"))
      );
      const missingReviewsEverywhere = cacheResult.results.every(
        (item: any) => item.reviews === undefined || item.reviews === null
      );
      
      if (hasMockImages || (SERPAPI_KEY && (hasFallbackUnsplash || missingReviewsEverywhere))) {
        console.log(
          "[unifiedSearch] Cache hit but looks stale (fallback images / no reviews). Fetching fresh SerpAPI results."
        );
        // Don't use cache, continue to fetch fresh data
        cacheResult.cached = false;
      } else {
        console.log("Cache hit for query:", searchQuery);
        
        // If we also need flights, we shouldn't return immediately!
        if (!hasFlightParams) {
          // Apply pagination to cached results
          const totalCached = cacheResult.results.length;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedResults = cacheResult.results.slice(startIndex, endIndex);
          
          return {
            results: paginatedResults,
            total: totalCached,
            page: page,
            limit: limit,
            hasMore: endIndex < totalCached,
            fromCache: true,
          };
        }
      }
    }

    if (hasFlightParams) {
      console.log("[unifiedSearch] ✈️ Flight search mode - Fetching flights from APIs");
    } else {
      console.log("Cache miss for query:", searchQuery, "- Fetching from APIs");
    }

      // Step 2: Cache miss - SERP API (Google Maps) for best results with images, prices, and details
      const allResults: any[] = [];
      const SERPAPI_KEY = process.env.SERPAPI_KEY;
      
      // If flight-only search, skip hotels/attractions/restaurants
      const isFlightOnlySearch = hasFlightParams && !searchQuery && (!filters.interests || filters.interests.length === 0);
      
      if (isFlightOnlySearch) {
        console.log("[unifiedSearch] ✈️ Flight-only search detected - skipping hotels/attractions/restaurants");
      }

      // helper: stable-ish id
      const makeId = (type: string, title: string, address?: string) => {
        const raw = `${type}:${title}:${address || ""}`;
        const hash = raw.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return `${type}_${hash}`;
      };

      const pickImage = async (title: string, location: string, place: any) => {
        // Try to get image from place data first (from SerpAPI)
        const photo = place?.photos?.[0];
        const img =
          photo?.image ||
          (typeof photo === "string" ? photo : null) ||
          place?.thumbnail ||
          null;
        if (img && typeof img === "string" && img.startsWith("http")) return img;
        
        // Fallback to SerpAPI Google Images
        if (SERPAPI_KEY) {
          const fallback = await getSerpApiImage(title, location, SERPAPI_KEY, ctx);
          if (fallback) return fallback;
        }
        
        // Try to get image from Wikipedia API
        const WIKIPEDIA_ACCESS_TOKEN = process.env.WIKIPEDIA_ACCESS_TOKEN;
        if (WIKIPEDIA_ACCESS_TOKEN && title && title.toLowerCase() !== "unknown") {
          try {
            // Clean up title for Wikipedia search
            const cleanTitle = title
              .replace(/^(Khách sạn|Nhà hàng|Resort|Hotel|Khu nghỉ dưỡng|Trung tâm)\s+/i, '')
              .trim();
              
            const wikiQueries = [
              title,
              `${title} ${location}`,
              `${cleanTitle} ${location}`
            ];
            
            for (const q of wikiQueries) {
              const wikiImg = await getWikipediaImage(q, WIKIPEDIA_ACCESS_TOKEN);
              if (wikiImg) return wikiImg;
            }
          } catch (e) {
            console.log(`[unifiedSearch] ⚠️ Wikipedia image failed for ${title}`);
          }
        }
        
        // Final fallback to Unsplash
        const placeHash = title.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
        const fallbackImages = [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1499856871958-5b9357452202?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80&auto=format&fit=crop"
        ];
        return fallbackImages[placeHash % fallbackImages.length];
      };

      // Helper function to parse price from Goong API price_text
      const parsePrice = (priceText: string | undefined): number => {
        if (!priceText || typeof priceText !== 'string') return 0;
        
        // Remove currency symbols and spaces
        let cleaned = priceText.replace(/[₫$€£¥,]/g, '').trim();
        
        // Extract numbers
        const numbers = cleaned.match(/[\d.]+/g);
        if (!numbers || numbers.length === 0) return 0;
        
        let price = parseFloat(numbers[0]);
        
        // Handle multipliers (K = thousand, M = million)
        if (cleaned.toLowerCase().includes('k') || cleaned.toLowerCase().includes('nghìn')) {
          price *= 1000;
        } else if (cleaned.toLowerCase().includes('m') || cleaned.toLowerCase().includes('triệu')) {
          price *= 1000000;
        }
        
        // If price seems too low (less than 10k), might be in USD, convert to VND
        if (price < 10000 && (priceText.includes('$') || priceText.toLowerCase().includes('usd'))) {
          price *= 25000; // Convert USD to VND
        }
        
        return Math.round(price);
      };

      const mapPlace = async (place: any, type: "hotel" | "attraction" | "restaurant") => {
        const title = place?.title || place?.name || "Unknown";
        const address = place?.address || place?.location || searchQuery;
        const rating = typeof place?.rating === "number" ? place.rating : Number(place?.rating) || 0;
        const reviews = typeof place?.reviews === "number" ? place.reviews : Number(place?.reviews) || undefined;
        const image = await pickImage(title, searchQuery, place);

        const tags =
          type === "restaurant"
            ? ["food"]
            : type === "hotel"
              ? []
              : []; // attractions: keep empty, filters can rely on type/category

        // Parse price from SerpAPI
        let price = 0;
        if (place?.price) {
          // Try to parse price from SerpAPI price field
          price = parsePrice(String(place.price));
          if (price > 0) {
            console.log(`[mapPlace] 💰 Using SerpAPI price = ${price} VND`);
          }
        }
        
        // If no price from SerpAPI, estimate based on type and location
        if (price === 0) {
          const locationText = `${address} ${searchQuery}`.toLowerCase();
          
          // Base price by city
          let basePrice = 1000000;
          if (locationText.includes('nha trang') || locationText.includes('nhatrang')) {
            basePrice = 1500000;
          } else if (locationText.includes('phú quốc') || locationText.includes('phu quoc')) {
            basePrice = 2000000;
          } else if (locationText.includes('đà nẵng') || locationText.includes('da nang') || locationText.includes('danang') ||
                     searchQuery.toLowerCase().includes('đà nẵng') || searchQuery.toLowerCase().includes('da nang')) {
            basePrice = 1500000;
          } else if (locationText.includes('hạ long') || locationText.includes('ha long') || locationText.includes('halong')) {
            basePrice = 1200000;
          } else if (locationText.includes('hội an') || locationText.includes('hoi an') || locationText.includes('hoian')) {
            basePrice = 1200000;
          } else if (locationText.includes('sapa') || locationText.includes('sa pa')) {
            basePrice = 1000000;
          }
          
          if (type === 'hotel') {
            // Estimate hotel prices based on rating and city
            if (rating >= 4.5) {
              price = Math.round(basePrice * 2.5);
            } else if (rating >= 4.0) {
              price = Math.round(basePrice * 1.8);
            } else if (rating >= 3.5) {
              price = Math.round(basePrice * 1.3);
            } else {
              price = basePrice;
            }
          } else if (type === 'restaurant') {
            // Estimate restaurant prices
            if (rating >= 4.5) {
              price = 500000; // 500k VND per person for high-rated restaurants
            } else if (rating >= 4.0) {
              price = 300000; // 300k VND per person
            } else {
              price = 200000; // 200k VND per person default
            }
          } else if (type === 'attraction') {
            // Estimate attraction prices
            price = 200000; // 200k VND per person default
          }
        }

        // Get description from SerpAPI
        let description = place?.description || "";
        if (!description && title && address) {
          description = `${title}${address ? ` tại ${address}` : ""}`;
        }
        
        // Get photos from SerpAPI
        const allPhotos = place?.photos || [];
        const photoUrls = Array.isArray(allPhotos) ? allPhotos.map((photo: any) => {
          if (typeof photo === 'object') {
            return photo?.image || photo?.url || null;
          }
          return typeof photo === 'string' && photo.startsWith('http') ? photo : null;
        }).filter(Boolean) : [];
        
        console.log(`[mapPlace] ✅ Final data: image=${!!image}, price=${price} VND, description=${description.length} chars`);
        
        return {
          id: place?.place_id || place?.cid || makeId(type, title, address),
          name: title,
          type,
          location: address,
          price: price,
          currency: "VND",
          rating,
          reviews,
          image,
          photos: photoUrls,
          description: description,
          category: type,
          tags,
          metadata: {
            place_id: place?.place_id,
            cid: place?.cid,
            gps_coordinates: place?.gps_coordinates || place?.coordinates,
            website: place?.website,
            phone: place?.phone,
            hours: place?.hours,
            type: place?.type,
            price: place?.price,
            ...place,
          },
        };
      };

      // Hotels and Attractions: Use cache if available
      if (cacheResult.cached && cacheResult.results) {
        console.log("[unifiedSearch] 📦 Using cached non-flight results");
        allResults.push(...cacheResult.results);
      } else {
        // Hotels: Hybrid approach - Goong API (images/ratings) + Amadeus (prices)
        // Skip if flight-only search
        let amadeusHotels: any[] = [];
        if (!isFlightOnlySearch && searchQuery) {
        // Step 1: Skip Amadeus hotels (deprecated)
        console.log("[unifiedSearch] ✈️ Skipping Amadeus hotels search (deprecated)");
      } else if (isFlightOnlySearch) {
        console.log("[unifiedSearch] ✈️ Skipping hotels search (flight-only mode)");
      }

      // Step 2: Get hotels from SerpAPI for images/ratings (enrichment)
      let serpHotels: any[] = [];
      if (!isFlightOnlySearch && SERPAPI_KEY && searchQuery) {
        try {
          console.log(`[unifiedSearch] 🔍 Checking cache for hotels search: "hotels in ${searchQuery}"`);
          const serpHotelPlaces = await serpApiMapsSearch(`hotels in ${searchQuery}`, SERPAPI_KEY, ctx);
          serpHotels = serpHotelPlaces.slice(0, limit * 2); // Get more to match with Amadeus
          console.log(`[unifiedSearch] ✅ SerpAPI found ${serpHotels.length} hotels`);
        } catch (error: any) {
          console.log("[unifiedSearch] ⚠️ SerpAPI hotels error:", error?.message || error);
        }
      }

      // Step 3: Create a map of SerpAPI hotels by name for quick lookup
      const serpMap = new Map<string, any>();
      for (const serpPlace of serpHotels) {
        const title = serpPlace?.title || serpPlace?.name || "";
        const key = title.toLowerCase().trim();
        if (key) serpMap.set(key, serpPlace);
      }

      // Step 4: Process Amadeus hotels and enrich with SerpAPI data (Skipped)
      const processedHotelNames = new Set<string>();
      // Amadeus is deprecated, so we don't process amadeusHotels anymore.

      // Step 5: Add remaining SerpAPI hotels that weren't in Amadeus (without price)
      if (SERPAPI_KEY) {
        for (const serpPlace of serpHotels.slice(0, limit)) {
          const serpTitle = serpPlace?.title || serpPlace?.name || "";
          const serpTitleLower = serpTitle.toLowerCase().trim();
          if (processedHotelNames.has(serpTitleLower)) continue;

          const mappedHotel = await mapPlace(serpPlace, "hotel");
          // mapPlace already estimates price, so use it
          allResults.push({
            ...mappedHotel,
            currency: "VND",
            type: "hotel",
          });
        }
      }

      // Attractions/Restaurants (SerpAPI) - use SerpAPI for best results with images, prices, and details
      // Skip if flight-only search
      if (!isFlightOnlySearch && SERPAPI_KEY && searchQuery) {
        // Use SerpAPI Google Maps search for best results
        console.log(`[unifiedSearch] 🔍 Checking cache for 3 searches: hotels, attractions, restaurants in "${searchQuery}"`);
        const [hotelPlaces, attractionPlaces, restaurantPlaces] = await Promise.all([
          serpApiMapsSearch(`hotels in ${searchQuery}`, SERPAPI_KEY, ctx),
          serpApiMapsSearch(`tourist attractions in ${searchQuery}`, SERPAPI_KEY, ctx),
          serpApiMapsSearch(`restaurants in ${searchQuery}`, SERPAPI_KEY, ctx),
        ]);
        console.log(`[unifiedSearch] ✅ SerpAPI results: hotels=${hotelPlaces.length}, attractions=${attractionPlaces.length}, restaurants=${restaurantPlaces.length}`);

        // Process hotels from SerpAPI (if not already processed from Amadeus)
        for (const p of hotelPlaces.slice(0, limit)) {
          const hotelName = (p?.title || p?.name || "").toLowerCase().trim();
          const alreadyProcessed = Array.from(processedHotelNames).some(name => 
            name.includes(hotelName) || hotelName.includes(name)
          );
          if (!alreadyProcessed) {
            allResults.push(await mapPlace(p, "hotel"));
          }
        }
        
        for (const p of attractionPlaces.slice(0, limit)) allResults.push(await mapPlace(p, "attraction"));
        for (const p of restaurantPlaces.slice(0, limit)) allResults.push(await mapPlace(p, "restaurant"));
        
        // --- FALLBACK MOCK DATA FOR HOTELS, ATTRACTIONS & RESTAURANTS ---
        // If SerpAPI failed (quota exceeded) and returned 0 results, generate generic ones
        if (hotelPlaces.length === 0 && serpHotels.length === 0) {
          console.log(`[unifiedSearch] ⚠️ SerpAPI returned 0 hotels, using mock hotels for ${searchQuery}`);
          try {
            const mockHotels = await ctx.runAction(api.api.getMockHotels, { city: searchQuery });
            allResults.push(...mockHotels.slice(0, limit));
          } catch (e) {
            console.log("Failed to load mock hotels");
          }
        }
        // If SerpAPI failed (quota exceeded) and returned 0 attractions/restaurants, generate generic ones
        const cityCap = searchQuery.replace(/(^\w|\s\w)/g, m => m.toUpperCase()); // capitalize
        
        if (attractionPlaces.length === 0) {
          console.log(`[unifiedSearch] ⚠️ SerpAPI returned 0 attractions, using mock attractions for ${cityCap}`);
          allResults.push({
            id: `mock_attr_1_${searchQuery}`,
            name: `Trung tâm Văn hóa & Lịch sử ${cityCap}`,
            type: "attraction",
            location: `Trung tâm ${cityCap}`,
            price: 50000,
            currency: "VND",
            rating: 4.5,
            image: "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=800",
            description: `Điểm tham quan nổi tiếng bậc nhất tại ${cityCap} với nhiều di tích lịch sử và văn hóa độc đáo.`,
            category: "attraction",
            tags: ["culture", "history"],
            metadata: { fallback: true },
          });
          allResults.push({
            id: `mock_attr_2_${searchQuery}`,
            name: `Khu du lịch sinh thái ${cityCap}`,
            type: "attraction",
            location: `Ngoại ô ${cityCap}`,
            price: 150000,
            currency: "VND",
            rating: 4.7,
            image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800",
            description: `Nơi lý tưởng để hòa mình vào thiên nhiên, ngắm cảnh đẹp đặc trưng của ${cityCap}.`,
            category: "attraction",
            tags: ["nature", "eco"],
            metadata: { fallback: true },
          });
        }
        
        if (restaurantPlaces.length === 0) {
          console.log(`[unifiedSearch] ⚠️ SerpAPI returned 0 restaurants, using mock restaurants for ${cityCap}`);
          allResults.push({
            id: `mock_rest_1_${searchQuery}`,
            name: `Đặc sản địa phương ${cityCap} Quán`,
            type: "restaurant",
            location: `Khu ẩm thực ${cityCap}`,
            price: 200000,
            currency: "VND",
            rating: 4.6,
            image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
            description: `Nhà hàng chuyên phục vụ các món ăn truyền thống và đặc sản nổi tiếng nhất của ${cityCap}.`,
            category: "restaurant",
            tags: ["local food", "traditional"],
            metadata: { fallback: true },
          });
          allResults.push({
            id: `mock_rest_2_${searchQuery}`,
            name: `Nhà hàng hải sản/đồ nướng ${cityCap}`,
            type: "restaurant",
            location: `Trung tâm ${cityCap}`,
            price: 450000,
            currency: "VND",
            rating: 4.4,
            image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
            description: `Không gian sang trọng, phục vụ các món tươi sống và đồ nướng hảo hạng tại ${cityCap}.`,
            category: "restaurant",
            tags: ["seafood", "bbq", "dinner"],
            metadata: { fallback: true },
          });
        }
        
        console.log(`[unifiedSearch] ✅ SerpAPI results: hotels=${hotelPlaces.length}, attractions=${attractionPlaces.length}, restaurants=${restaurantPlaces.length}`);
      } else if (isFlightOnlySearch) {
        console.log("[unifiedSearch] ✈️ Skipping attractions/restaurants search (flight-only mode)");
      } else if (!SERPAPI_KEY) {
        console.log("[unifiedSearch] ⚠️ SERPAPI_KEY missing - skipping attractions/restaurants search");
      }
      
      // End of cache bypass block
      }
      
      // Flights (Amadeus) - only when origin/destination/date provided
      const originRaw = (args.origin || "").trim();
      const destinationRaw = (args.destination || "").trim();
      const departureDate = (args.departureDate || "").trim();
      const adults = args.adults || 1;
      
      const origin = getCityCode(originRaw) || originRaw;
      const destinationCode = getCityCode(destinationRaw) || destinationRaw;

      // Cities without commercial airports - route via nearest hub
      const noAirportCities: Record<string, { hub: string; hubName: string; transport: string }> = {
        "vũng tàu": { hub: "SGN", hubName: "TP Hồ Chí Minh", transport: "tàu cao tốc (1h30) hoặc xe khách (2h)" },
        "hội an": { hub: "DAD", hubName: "Đà Nẵng", transport: "taxi/xe khách (30 phút)" },
        "sapa": { hub: "HAN", hubName: "Hà Nội", transport: "xe khách/tàu hỏa (5-6h)" },
        "ninh bình": { hub: "HAN", hubName: "Hà Nội", transport: "xe khách (2h)" },
        "mũi né": { hub: "SGN", hubName: "TP Hồ Chí Minh", transport: "xe khách (4-5h)" },
        "phan thiết": { hub: "SGN", hubName: "TP Hồ Chí Minh", transport: "xe khách (3-4h)" },
        "hà giang": { hub: "HAN", hubName: "Hà Nội", transport: "xe khách (7-8h)" },
      };

      const destNormalized = destinationRaw.toLowerCase().trim();
      const gatewayInfo = noAirportCities[destNormalized];
      
      // If destination has no airport, reroute via hub and add transport card
      let effectiveDestCode = destinationCode;
      let groundTransportCard: any = null;
      if (gatewayInfo && destinationCode.length !== 3) {
        effectiveDestCode = gatewayInfo.hub;
        console.log(`[unifiedSearch] ✈️ ${destinationRaw} has no airport, routing via ${gatewayInfo.hubName} (${gatewayInfo.hub})`);
        const flightImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=95&auto=format&fit=crop";
        groundTransportCard = {
          id: `transport_${gatewayInfo.hub}_${destNormalized.replace(/\s/g, '_')}`,
          name: `${gatewayInfo.hubName} → ${destinationRaw}`,
          type: "transport",
          location: `${gatewayInfo.hubName} → ${destinationRaw}`,
          price: 150000,
          currency: "VND",
          rating: 4.3,
          image: flightImage,
          description: `Di chuyển bằng ${gatewayInfo.transport} từ ${gatewayInfo.hubName} đến ${destinationRaw}.`,
          category: "transport",
          tags: ["transport", "ground"],
          metadata: { gateway: true },
        };
      }

      console.log(`[unifiedSearch] ✈️ Flight search params: origin="${origin}", destination="${effectiveDestCode}", departureDate="${departureDate}", adults=${adults}`);

      if (origin && effectiveDestCode && departureDate && origin.length === 3 && effectiveDestCode.length === 3) {
        try {
          console.log(`[unifiedSearch] ✈️ Calling Amadeus searchFlights...`);
          const flightData: any = await ctx.runAction(api.api.searchFlights, {
            origin: origin,
            destination: effectiveDestCode,
            departureDate,
            returnDate: args.returnDate,
            adults,
            max: limit || 10,
          });

          const offers = flightData?.data || [];
          const carriers = flightData?.dictionaries?.carriers || {};
          const flightImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=95&auto=format&fit=crop";

          console.log(`[unifiedSearch] ✈️ Amadeus returned ${offers.length} flight offers`);
          
          // If no offers from API, create estimated flights
          if (offers.length === 0) {
            console.log(`[unifiedSearch] ⚠️ No flights from API, creating estimated flights`);
            // Create at least one estimated flight
            const routeKey = `${origin}-${effectiveDestCode}`.toLowerCase();
            // Use gateway hub display name if routing via hub
            const displayDest = gatewayInfo ? gatewayInfo.hubName : destinationRaw;
            const routeEstimates: Record<string, number> = {
              'han-sgn': 150, // Hanoi to Ho Chi Minh
              'han-dad': 80,   // Hanoi to Da Nang
              'sgn-dad': 100, // HCMC to Da Nang
              'han-cxr': 120, // Hanoi to Nha Trang
              'sgn-cxr': 50,  // HCMC to Nha Trang
              'han-pqc': 200, // Hanoi to Phu Quoc
              'sgn-pqc': 80,  // HCMC to Phu Quoc
            };
            
            let estimatedPrice = 100; // Default $100 USD
            for (const [route, price] of Object.entries(routeEstimates)) {
              if (routeKey.includes(route.split('-')[0]) && routeKey.includes(route.split('-')[1])) {
                estimatedPrice = price;
                break;
              }
            }
            
            const priceInVND = Math.round(estimatedPrice * 25000);
            const isRoundTripFallback = !!args.returnDate;
            const itemPrice = isRoundTripFallback ? Math.round(priceInVND / 2) : priceInVND;
            
            allResults.unshift({
              id: `flight_estimated_${origin}_${effectiveDestCode}_outbound`,
              name: `${isRoundTripFallback ? '[Chiều đi] ' : ''}Vietnam Airlines • ${originRaw} → ${displayDest}`,
              type: "flight",
              location: `${originRaw} → ${displayDest}`,
              price: itemPrice,
              currency: "VND",
              rating: 4.5,
              image: flightImage,
              description: `Khởi hành: 08:00 ${departureDate.split('-').reverse().slice(0,2).join('/')} • Thời gian bay: 2h 10m • Dừng: 0 trạm`,
              category: "flight",
              tags: [],
              metadata: { estimated: true },
            });
            
            if (isRoundTripFallback) {
              allResults.unshift({
                id: `flight_estimated_${effectiveDestCode}_${origin}_return`,
                name: `[Chiều về] Vietnam Airlines • ${displayDest} → ${originRaw}`,
                type: "flight",
                location: `${displayDest} → ${originRaw}`,
                price: itemPrice,
                currency: "VND",
                rating: 4.5,
                image: flightImage,
                description: `Khởi hành: 14:00 ${args.returnDate?.split('-').reverse().slice(0,2).join('/')} • Thời gian bay: 2h 10m • Dừng: 0 trạm`,
                category: "flight",
                tags: [],
                metadata: { estimated: true },
              });
            }
            
            // Add ground transport card if routing via gateway
            if (groundTransportCard) {
              allResults.unshift(groundTransportCard);
            }
          }

          const maxFlights = isFlightOnlySearch ? limit : 3;
          for (const offer of offers.slice(0, maxFlights)) {
            const itin = offer?.itineraries?.[0];
            const segments = itin?.segments || [];
            const firstSeg = segments?.[0];
            const lastSeg = segments?.[segments.length - 1];
            const carrierCode = firstSeg?.carrierCode || firstSeg?.operating?.carrierCode || "XX";
            const airlineName = carriers[carrierCode] || carrierCode;
            let totalPrice = Number(offer?.price?.total || 0);
            const currency = offer?.price?.currency || "USD";
            const duration = itin?.duration || "";
            const stops = Math.max(0, segments.length - 1);
            
            // If no price from API, estimate based on route distance
            if (totalPrice === 0) {
              // Estimate flight price based on route (in USD)
              const routeKey = `${origin}-${destinationCode}`.toLowerCase();
              const routeEstimates: Record<string, number> = {
                'han-sgn': 150, // Hanoi to Ho Chi Minh
                'han-dad': 80,   // Hanoi to Da Nang
                'sgn-dad': 100, // HCMC to Da Nang
                'han-cxr': 120, // Hanoi to Nha Trang
                'sgn-cxr': 50,  // HCMC to Nha Trang
                'han-pqc': 200, // Hanoi to Phu Quoc
                'sgn-pqc': 80,  // HCMC to Phu Quoc
              };
              
              // Try to find matching route
              for (const [route, price] of Object.entries(routeEstimates)) {
                if (routeKey.includes(route.split('-')[0]) && routeKey.includes(route.split('-')[1])) {
                  totalPrice = price;
                  break;
                }
              }
              
              // If still no match, use default estimate
              if (totalPrice === 0) {
                totalPrice = 100; // Default $100 USD
              }
              
              console.log(`[unifiedSearch] ✈️ Flight "${airlineName}": Estimated price = ${totalPrice} ${currency}`);
            }
            
            // Convert to VND if currency is USD or EUR
            let priceInVND = totalPrice;
            if (currency === 'USD') {
              priceInVND = Math.round(totalPrice * 25400); // USD to VND
            } else if (currency === 'EUR') {
              priceInVND = Math.round(totalPrice * 27500); // EUR to VND
            }
            
            console.log(`[unifiedSearch] ✈️ Flight: ${airlineName} ${origin}→${destinationCode}, Price: ${totalPrice} ${currency} (${priceInVND} VND), Duration: ${duration}, Stops: ${stops}`);
            
            // Helper to format ISO duration like PT2H10M to 2h 10m
            const formatDuration = (pt: string) => {
              if (!pt) return '';
              const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
              if (!match) return pt;
              const h = match[1] ? `${match[1]}h` : '';
              const m = match[2] ? ` ${match[2]}m` : '';
              return `${h}${m}`.trim();
            };
            
            // Helper to format ISO time like 2026-10-06T10:00:00 to 10:00 06/10
            const formatTime = (iso: string) => {
              if (!iso) return '';
              try {
                const parts = iso.split('T');
                if (parts.length !== 2) return iso;
                const time = parts[1].substring(0, 5); // 10:00
                const dateParts = parts[0].split('-');
                return `${time} ${dateParts[2]}/${dateParts[1]}`;
              } catch {
                return iso;
              }
            };
            
            const isRoundTrip = offer.itineraries && offer.itineraries.length > 1;
            const itemPrice = isRoundTrip ? Math.round(priceInVND / 2) : priceInVND;

            // Outbound flight
            allResults.unshift({
              id: String(offer.id || `flight_${carrierCode}_${totalPrice}`) + "_outbound",
              name: `${isRoundTrip ? '[Chiều đi] ' : ''}${airlineName} • ${originRaw} → ${destinationRaw}`,
              type: "flight",
              location: `${originRaw} → ${destinationRaw}`,
              price: itemPrice, 
              currency: "VND",
              rating: 0,
              image: flightImage,
              description: `Khởi hành: ${formatTime(firstSeg?.departure?.at || "")} • Đến: ${formatTime(lastSeg?.arrival?.at || "")} • Thời gian bay: ${formatDuration(duration)} • Dừng: ${stops} trạm`,
              category: "flight",
              tags: [],
              metadata: { offer },
            });
            
            // Return flight (if round trip)
            if (isRoundTrip) {
              const returnItin = offer.itineraries[1];
              const returnSegments = returnItin.segments || [];
              const retFirstSeg = returnSegments[0];
              const retLastSeg = returnSegments[returnSegments.length - 1];
              const retDuration = returnItin.duration || "";
              const retStops = returnSegments.length > 1 ? returnSegments.length - 1 : 0;
              
              allResults.unshift({
                id: String(offer.id || `flight_${carrierCode}_${totalPrice}`) + "_return",
                name: `[Chiều về] ${airlineName} • ${destinationRaw} → ${originRaw}`,
                type: "flight",
                location: `${destinationRaw} → ${originRaw}`,
                price: itemPrice, 
                currency: "VND",
                rating: 0,
                image: flightImage,
                description: `Khởi hành: ${formatTime(retFirstSeg?.departure?.at || "")} • Đến: ${formatTime(retLastSeg?.arrival?.at || "")} • Thời gian bay: ${formatDuration(retDuration)} • Dừng: ${retStops} trạm`,
                category: "flight",
                tags: [],
                metadata: { offer },
              });
            }
          }
        } catch (error: any) {
          console.log("[unifiedSearch] ⚠️ Flights (Amadeus) error:", error?.message || error);
          // Even on error, create estimated flight if flight info was provided
          if (allResults.filter((r: any) => r.type === 'flight').length === 0) {
            console.log("[unifiedSearch] ✈️ Creating fallback estimated flight due to API error");
            let estimatedPrice = 100;
            const routeKey = `${origin}-${effectiveDestCode}`.toLowerCase();
            const displayDest = gatewayInfo ? gatewayInfo.hubName : destinationRaw;
            const routeEstimates: Record<string, number> = {
              'han-sgn': 150, 'han-dad': 80, 'sgn-dad': 100,
              'han-cxr': 120, 'sgn-cxr': 50, 'han-pqc': 200, 'sgn-pqc': 80,
            };
            
            for (const [route, price] of Object.entries(routeEstimates)) {
              if (routeKey.includes(route.split('-')[0]) && routeKey.includes(route.split('-')[1])) {
                estimatedPrice = price;
                break;
              }
            }
            const priceInVND = Math.round(estimatedPrice * 25000);
            const flightImage = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=95&auto=format&fit=crop";
            
            const isRoundTripError = !!args.returnDate;
            const itemPrice = isRoundTripError ? Math.round(priceInVND / 2) : priceInVND;

            allResults.unshift({
              id: `flight_fallback_${origin}_${effectiveDestCode}_outbound`,
              name: `${isRoundTripError ? '[Chiều đi] ' : ''}Vietnam Airlines • ${originRaw} → ${displayDest}`,
              type: "flight",
              location: `${originRaw} → ${displayDest}`,
              price: itemPrice,
              currency: "VND",
              rating: 4.5,
              image: flightImage,
              description: `Khởi hành: 08:00 ${departureDate.split('-').reverse().slice(0,2).join('/')} • Thời gian bay: 2h 10m • Dừng: 0 trạm`,
              category: "flight",
              tags: [],
              metadata: { estimated: true, fallback: true },
            });
            
            if (isRoundTripError) {
              allResults.unshift({
                id: `flight_fallback_${effectiveDestCode}_${origin}_return`,
                name: `[Chiều về] Vietnam Airlines • ${displayDest} → ${originRaw}`,
                type: "flight",
                location: `${displayDest} → ${originRaw}`,
                price: itemPrice,
                currency: "VND",
                rating: 4.5,
                image: flightImage,
                description: `Khởi hành: 14:00 ${args.returnDate?.split('-').reverse().slice(0,2).join('/')} • Thời gian bay: 2h 10m • Dừng: 0 trạm`,
                category: "flight",
                tags: [],
                metadata: { estimated: true, fallback: true },
              });
            }
            
            // Add ground transport card if routing via gateway
            if (groundTransportCard) {
              allResults.unshift(groundTransportCard);
            }
          }
        }
      } else {
        console.log(`[unifiedSearch] ⚠️ Flight search skipped: missing required params (origin="${origin}", destination="${effectiveDestCode}", departureDate="${departureDate}")`);
        // Still add ground transport card if available
        if (groundTransportCard) {
          allResults.unshift(groundTransportCard);
          console.log(`[unifiedSearch] 🚌 Added ground transport card: ${groundTransportCard.name}`);
        }
      }

        // Step 2.5: Filter results based on interests/category
        let filteredResults = allResults;
        
        console.log(`\n[unifiedSearch] 📊 TOTAL RESULTS BEFORE FILTERING: ${allResults.length}`);
        console.log(`[unifiedSearch] Results breakdown:`);
        const resultsByType = allResults.reduce((acc: any, r: any) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {});
        console.log(`[unifiedSearch]`, resultsByType);
        console.log(`[unifiedSearch] Sample results (first 3):`);
        allResults.slice(0, 3).forEach((r: any, i: number) => {
          console.log(`[unifiedSearch]   ${i + 1}. ${r.name} (${r.type}) - Image: ${r.image?.substring(0, 80) || 'NO IMAGE'}`);
        });
        console.log(`[unifiedSearch] Filters applied:`, filters);
        
        if (filters.interests && filters.interests.length > 0) {
          console.log(`Filtering by interests:`, filters.interests);
          // Map interests to categories/tags
          const interestCategoryMap: Record<string, string[]> = {
            beach: ["beach", "seaside", "coastal", "ocean", "biển", "đảo", "cát", "vịnh", "resort"],
            culture: ["temple", "museum", "cultural", "historical", "heritage", "chùa", "bảo tàng", "di tích", "lịch sử", "văn hóa", "đền", "cổ", "tháp", "nhà thờ"],
            adventure: ["adventure", "hiking", "climbing", "outdoor", "extreme", "phiêu lưu", "leo núi", "khám phá", "cáp treo", "hang động", "thác", "dã ngoại"],
            food: ["restaurant", "food", "cuisine", "dining", "seafood", "nhà hàng", "quán ăn", "ẩm thực", "hải sản", "bún", "phở", "cơm", "đặc sản", "quán bia", "nhậu"],
            nature: ["nature", "park", "garden", "forest", "mountain", "wildlife", "thiên nhiên", "công viên", "vườn", "rừng", "núi", "sinh thái", "hồ", "suối"],
            city: ["city", "urban", "downtown", "metropolitan", "thành phố", "trung tâm", "chợ", "phố", "cầu", "biểu tượng"],
          };

          filteredResults = allResults.filter((item: any) => {
            // Check if item matches any selected interest
            return filters.interests!.some((interest: string) => {
              const categories = interestCategoryMap[interest] || [];
              const itemCategory = (item.category || "").toLowerCase();
              const itemTags = (item.tags || []);
              const description = (item.description || "").toLowerCase();
              const itemType = (item.type || "").toLowerCase();
              
              // Special handling for "food" - match all restaurants
              if (interest === "food" && itemType === "restaurant") {
                return true;
              }
              
              // Check category exact or partial match
              if (itemCategory && categories.some(cat => {
                const catLower = cat.toLowerCase();
                return itemCategory === catLower || 
                       itemCategory.includes(catLower) || 
                       catLower.includes(itemCategory);
              })) {
                return true;
              }
              
              // Check tags match
              if (Array.isArray(itemTags) && itemTags.length > 0) {
                const tagsMatch = itemTags.some((tag: string) => {
                  const tagLower = (tag || "").toLowerCase();
                  return categories.some(cat => {
                    const catLower = cat.toLowerCase();
                    return tagLower === catLower || 
                           tagLower.includes(catLower) || 
                           catLower.includes(tagLower);
                  });
                });
                if (tagsMatch) {
                  return true;
                }
              }
              
              // Check description match for specific interests
              if (interest === "beach" && (
                description.includes("biển") || 
                description.includes("beach") || 
                description.includes("seaside") ||
                description.includes("coastal") ||
                itemCategory.includes("beach")
              )) {
                return true;
              }
              
              if (interest === "culture" && (
                description.includes("chùa") || 
                description.includes("temple") || 
                description.includes("văn hóa") || 
                description.includes("cultural") ||
                description.includes("historical") ||
                itemCategory.includes("temple") ||
                itemCategory.includes("museum")
              )) {
                return true;
              }
              
              if (interest === "adventure" && (
                description.includes("phiêu lưu") || 
                description.includes("adventure") || 
                description.includes("hiking") ||
                description.includes("climbing") ||
                itemCategory.includes("adventure")
              )) {
                return true;
              }
              
              if (interest === "nature" && (
                description.includes("thiên nhiên") || 
                description.includes("nature") || 
                description.includes("park") ||
                description.includes("garden") ||
                itemCategory.includes("nature") ||
                itemCategory.includes("park")
              )) {
                return true;
              }
              
              if (interest === "city" && (
                description.includes("thành phố") ||
                description.includes("city") ||
                description.includes("urban") ||
                itemCategory.includes("city") ||
                itemCategory.includes("urban")
              )) {
                return true;
              }
              
              return false;
            });
          });
          
          console.log(`Filtered ${allResults.length} results to ${filteredResults.length} based on interests:`, filters.interests);
          
          // Fallback: If filtering is too strict and returns 0 results, ignore the filter
          if (filteredResults.length === 0 && allResults.length > 0) {
            console.log(`Fallback: Filtering returned 0 results, ignoring interests filter.`);
            filteredResults = allResults;
          }
        }



      // Weather is fetched separately in item details, not in search results
      // But we could include weather summary if needed

      // Step 3: Ensure all items have price > 0 before pagination
      const resultsWithPrices = filteredResults.map((item: any) => {
        let price = Number(item.price || 0);
        
        // If price is 0, estimate based on type
        if (price === 0) {
          const itemType = item.type || 'attraction';
          const rating = Number(item.rating || 0);
          
          if (itemType === 'hotel') {
            // Estimate hotel prices
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
            // Estimate restaurant prices
            if (rating >= 4.5) {
              price = 500000;
            } else if (rating >= 4.0) {
              price = 300000;
            } else {
              price = 200000;
            }
          } else if (itemType === 'attraction') {
            // Estimate attraction prices
            price = 200000;
          } else if (itemType === 'flight') {
            // Estimate flight prices (in VND)
            price = 2500000; // ~$100 USD
          } else {
            // Default
            price = 200000;
          }
          
          console.log(`[unifiedSearch] 💰 Estimated price for ${item.name} (${itemType}): ${price} VND`);
        }
        
        return {
          ...item,
          price: price,
        };
      });

      // Step 3.5: Filter by budget if specified (AFTER price estimation)
      let finalResults = resultsWithPrices;
      if (filters.budget !== undefined && filters.budget > 0) {
        finalResults = finalResults.filter((item: any) => {
          if (item.type === 'flight') return true; // Do not apply budget filter to flights
          return item.price <= filters.budget!;
        });
      }

      // Step 4: Apply pagination to filtered results
      const totalFiltered = finalResults.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = finalResults.slice(startIndex, endIndex);
      
      console.log(`\n[unifiedSearch] 📄 PAGINATION:`);
      console.log(`[unifiedSearch] Filtered results: ${filteredResults.length}`);
      console.log(`[unifiedSearch] Page ${page}, Limit ${limit}`);
      console.log(`[unifiedSearch] Returning ${paginatedResults.length} results`);
      console.log(`[unifiedSearch] Has more: ${filteredResults.length > page * limit}`);
      console.log(`[unifiedSearch] Final results with images:`);
      paginatedResults.forEach((r: any, i: number) => {
        console.log(`[unifiedSearch]   ${i + 1}. ${r.name} (${r.type})`);
        console.log(`[unifiedSearch]      Location: ${r.location}`);
        console.log(`[unifiedSearch]      Image: ${r.image?.substring(0, 100) || 'NO IMAGE'}`);
        console.log(`[unifiedSearch]      Image valid: ${r.image && r.image.startsWith('http') && !r.image.includes('example.com')}`);
      });
      console.log(`[unifiedSearch] ==========================================\n`);
      
      console.log(`[unifiedSearch] Pagination: page=${page}, limit=${limit}, total=${totalFiltered}, showing ${paginatedResults.length} items`);

      // Step 5: Save to cache (strip to schema) - include currency for flights/hotels
      const resultsToCache = resultsWithPrices.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        type: String(item.type),
        location: String(item.location || ""),
        price: Number(item.price || 0),
        currency: item.currency || "VND", // Include currency for proper display
        rating: Number(item.rating || 0),
        reviews: typeof item.reviews === "number" ? item.reviews : undefined,
        image: String(item.image || ""),
        description: String(item.description || ""),
        category: item.category ? String(item.category) : undefined,
        tags: Array.isArray(item.tags) ? item.tags : undefined,
        metadata: item.metadata,
      }));

      // Only save if no obvious mock images
      const hasMockImages = resultsToCache.some((item: any) =>
        item.image && typeof item.image === "string" && item.image.includes("example.com")
      );
      if (resultsToCache.length > 0 && !hasMockImages) {
        try {
          await ctx.runMutation(api.searchCache.saveSearchCache, {
            query: searchQuery,
            filters,
            results: resultsToCache,
          });
          console.log(`[unifiedSearch] 💾 Saved ${resultsToCache.length} results to cache`);
        } catch (error: any) {
          console.error("[unifiedSearch] ❌ Error saving to cache:", error.message || error);
        }
      }

      return {
        results: paginatedResults,
        fromCache: false,
        page: page,
        limit: limit,
        total: totalFiltered,
        hasMore: endIndex < totalFiltered,
      };
  },
});
