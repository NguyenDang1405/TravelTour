import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";

// Get item details by ID and type
// This will fetch from API or return cached data
export const getItemDetails = action({
  args: {
    itemId: v.string(),
    itemType: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
    location: v.optional(v.string()), // For weather and context
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      console.log(`[getItemDetails] 🔍 Fetching ${args.itemType} with ID: ${args.itemId}, location: ${args.location}`);
      let itemData: any = null;

      // Fetch based on type
      if (args.itemType === "hotel") {
        // Try to get from API API or unifiedSearch first, then fallback to mock
        try {
          // Step 1: Try to find from unifiedSearch results (includes API hotels)
          console.log(`[getItemDetails] 🔍 Step 1: Searching unifiedSearch for hotel ID: ${args.itemId}`);
          const searchResult = await ctx.runAction(api.api.unifiedSearch, {
            query: args.location || "Đà Nẵng",
            filters: {},
            limit: 50, // Get more results to find the matching hotel
          });
          const hotels = (searchResult.results || []).filter((r: any) => r.type === "hotel");
          console.log(`[getItemDetails] 🏨 Found ${hotels.length} hotels from unifiedSearch, searching for ID: ${args.itemId}`);
          
          // Find exact item by ID - check both id and metadata.api.hotelId
          itemData = hotels.find((h: any) => {
            const idMatch = String(h.id) === String(args.itemId);
            const apiIdMatch = h.metadata?.api?.hotelId === args.itemId || 
                                  h.metadata?.api?.id === args.itemId ||
                                  h.externalId === args.itemId;
            return idMatch || apiIdMatch;
          });
          
          if (itemData) {
            console.log(`[getItemDetails] ✅ Found hotel from unifiedSearch:`, {
              name: itemData.name,
              price: itemData.price,
              id: itemData.id,
              provider: itemData.provider,
            });
          } else {
            // Log all available IDs for debugging
            console.log(`[getItemDetails] ⚠️ Hotel not found in unifiedSearch. Searching for ID: "${args.itemId}"`);
            console.log(`[getItemDetails] Available hotels in unifiedSearch:`, hotels.map((h: any) => ({
              id: h.id,
              name: h.name,
              apiHotelId: h.metadata?.api?.hotelId,
              apiId: h.metadata?.api?.id,
              externalId: h.externalId,
            })));
            
            // Step 2: Try to get hotel directly from API by hotelId
            console.log(`[getItemDetails] 🔍 Step 2: Trying API API getHotelById for hotel ID: ${args.itemId}`);
            try {
              itemData = await ctx.runAction(api.api.getHotelById, {
                hotelId: args.itemId,
                cityName: args.location || "Đà Nẵng",
              });
              
              if (itemData) {
                console.log(`[getItemDetails] ✅ Found hotel from API getHotelById: ${itemData.name}`);
              } else {
                console.log(`[getItemDetails] ⚠️ Hotel not found via getHotelById, trying searchHotels...`);
                // Fallback: Try searchHotels if getHotelById doesn't work
                const apiHotels = await ctx.runAction(api.api.searchHotels, {
                  cityName: args.location || "Đà Nẵng",
                });
                console.log(`[getItemDetails] API searchHotels returned ${apiHotels.length} hotels`);
                itemData = apiHotels.find((h: any) => {
                  const idMatch = String(h.id) === String(args.itemId);
                  const hotelIdMatch = String(h.hotelId) === String(args.itemId);
                  const externalIdMatch = String(h.externalId) === String(args.itemId);
                  return idMatch || hotelIdMatch || externalIdMatch;
                });
                
                if (itemData) {
                  console.log(`[getItemDetails] ✅ Found hotel from API searchHotels: ${itemData.name}`);
                } else {
                  console.log(`[getItemDetails] Available API hotel IDs:`, apiHotels.map((h: any) => ({
                    id: h.id,
                    hotelId: h.hotelId,
                    externalId: h.externalId,
                    name: h.name,
                  })));
                }
              }
            } catch (apiError) {
              console.log(`[getItemDetails] ⚠️ API API error:`, apiError);
            }
            
            // Step 3: Fallback to mock hotels
            if (!itemData) {
              console.log(`[getItemDetails] 🔍 Step 3: Trying mock hotels for ID: ${args.itemId}`);
              const mockHotels = await ctx.runAction(api.api.getMockHotels, {
                city: args.location || "Đà Nẵng",
              });
              itemData = mockHotels.find((h: any) => String(h.id) === String(args.itemId));
              
              if (itemData) {
                console.log(`[getItemDetails] ✅ Found hotel from mock: ${itemData.name}`);
              } else {
                console.log(`[getItemDetails] ❌ Hotel not found in any source. Available mock IDs: ${mockHotels.map((h: any) => h.id).join(', ')}`);
                
                // Step 4: Create a fallback hotel with basic info if not found
                // This handles cases where the hotel ID exists but isn't in current search results
                console.log(`[getItemDetails] 🔄 Step 4: Creating fallback hotel for ID: ${args.itemId}`);
                const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=95&auto=format&fit=crop";
                itemData = {
                  id: args.itemId,
                  name: `Hotel ${args.itemId}`,
                  location: args.location || "Đà Nẵng",
                  price: 2000000, // Default price
                  rating: 4.0,
                  image: fallbackImage,
                  images: [fallbackImage], // Ensure images array exists
                  description: `Khách sạn tại ${args.location || "Đà Nẵng"}`,
                  amenities: ["WiFi", "Pool", "Restaurant"],
                  checkIn: "14:00",
                  checkOut: "12:00",
                  provider: "api",
                  externalId: args.itemId,
                };
                console.log(`[getItemDetails] ⚠️ Created fallback hotel: ${itemData.name} with image: ${itemData.image?.substring(0, 50)}...`);
              }
            }
          }
        } catch (error) {
          console.error(`[getItemDetails] ❌ Error fetching hotel:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[getItemDetails] Error details:`, { itemId: args.itemId, itemType: args.itemType, location: args.location, errorMessage });
          throw new Error(`Failed to fetch hotel details: ${errorMessage}`);
        }
      } else if (args.itemType === "flight") {
        // Try to get flight from unifiedSearch results
        try {
          // Search for flights to find the matching one
          const searchResult = await ctx.runAction(api.api.unifiedSearch, {
            query: args.location || "Đà Nẵng",
            filters: {},
            limit: 50, // Get more results to find the matching flight
          });
          const flights = (searchResult.results || []).filter((r: any) => r.type === "flight");
          console.log(`[getItemDetails] ✈️ Found ${flights.length} flights, searching for ID: ${args.itemId}`);
          // Find exact flight by ID - don't fallback to first item
          itemData = flights.find((f: any) => String(f.id) === String(args.itemId));
          
          if (!itemData) {
            console.log(`[getItemDetails] ⚠️ Flight not found. Creating fallback flight...`);
            // Create a fallback flight instead of crashing
            itemData = {
              id: args.itemId,
              name: `Chuyến bay ${args.itemId}`,
              type: "flight",
              location: args.location || "Đà Nẵng",
              price: 2500000,
              rating: 4.5,
              image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=95&auto=format&fit=crop",
              description: `Chuyến bay đến ${args.location || "Đà Nẵng"}`,
              provider: "ai_recommendation",
              externalId: args.itemId,
            };
          }
          console.log(`[getItemDetails] ✅ Found flight: ${itemData.name || itemData.airline || "Fallback"}`);
        } catch (error) {
          console.error(`[getItemDetails] ❌ Error fetching flight:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[getItemDetails] Error details:`, { itemId: args.itemId, itemType: args.itemType, location: args.location, errorMessage });
          throw new Error(`Failed to fetch flight details: ${errorMessage}`);
        }
      } else if (args.itemType === "attraction") {
        // Use unifiedSearch with Goong API (consistent with search results)
        try {
          const searchResult = await ctx.runAction(api.api.unifiedSearch, {
            query: args.location || "Đà Nẵng",
            filters: {},
            limit: 50, // Get more results to find the matching item
          });
          const attractions = (searchResult.results || []).filter((r: any) => r.type === "attraction");
          console.log(`[getItemDetails] 🏰 Found ${attractions.length} attractions, searching for ID: ${args.itemId}`);
          // Find exact item by ID - don't fallback to first item
          itemData = attractions.find((a: any) => String(a.id) === String(args.itemId));
          
          // If not found in search results, try mock data
          if (!itemData) {
            console.log(`[getItemDetails] 🔄 Not found in search, trying mock attractions...`);
            const mockAttractions = await ctx.runAction(api.api.getMockAttractions, {
              city: args.location || "Đà Nẵng",
            });
            itemData = mockAttractions.find((a: any) => String(a.id) === String(args.itemId));
            if (!itemData) {
              console.log(`[getItemDetails] ❌ Attraction not found. Available IDs: ${attractions.map((a: any) => a.id).join(', ')}, Mock IDs: ${mockAttractions.map((a: any) => a.id).join(', ')}`);
              throw new Error(`Attraction with ID ${args.itemId} not found in ${attractions.length} search results and ${mockAttractions.length} mock attractions`);
            }
          }
          console.log(`[getItemDetails] ✅ Found attraction: ${itemData.name}`);
        } catch (error) {
          console.error(`[getItemDetails] ❌ Error fetching attraction:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[getItemDetails] Error details:`, { itemId: args.itemId, itemType: args.itemType, location: args.location, errorMessage });
          throw new Error(`Failed to fetch attraction details: ${errorMessage}`);
        }
      } else if (args.itemType === "restaurant") {
        // Try to get restaurant from unifiedSearch first (where it was originally found)
        try {
          console.log(`[getItemDetails] 🔍 Step 1: Searching unifiedSearch for restaurant ID: ${args.itemId}`);
          const searchResult = await ctx.runAction(api.api.unifiedSearch, {
            query: args.location || "Đà Nẵng",
            filters: {},
            limit: 50,
          });
          const restaurants = (searchResult.results || []).filter((r: any) => r.type === "restaurant");
          console.log(`[getItemDetails] 🍽️ Found ${restaurants.length} restaurants from unifiedSearch, searching for ID: ${args.itemId}`);
          
          itemData = restaurants.find((r: any) => {
            const idMatch = String(r.id) === String(args.itemId);
            const placeIdMatch = r.metadata?.place_id === args.itemId || 
                                r.metadata?.cid === args.itemId ||
                                r.externalId === args.itemId;
            return idMatch || placeIdMatch;
          });
          
          if (itemData) {
            console.log(`[getItemDetails] ✅ Found restaurant from unifiedSearch: ${itemData.name}`);
          } else {
            console.log(`[getItemDetails] ⚠️ Restaurant not found in unifiedSearch. Available IDs:`, restaurants.map((r: any) => ({
              id: r.id, name: r.name, place_id: r.metadata?.place_id, cid: r.metadata?.cid,
            })));
            
            // Step 2: Try searchRestaurants
            console.log(`[getItemDetails] 🔍 Step 2: Trying searchRestaurants for restaurant ID: ${args.itemId}`);
            const restaurantsResult = await ctx.runAction(api.api.searchRestaurants, {
              location: args.location || "Đà Nẵng",
            });
            const searchRestaurants = restaurantsResult.results || [];
            console.log(`[getItemDetails] 🍽️ Found ${searchRestaurants.length} restaurants from searchRestaurants`);
            itemData = searchRestaurants.find((r: any) => String(r.id) === String(args.itemId));
            
            if (itemData) {
              console.log(`[getItemDetails] ✅ Found restaurant from searchRestaurants: ${itemData.name}`);
            } else {
              // Step 3: Try mock data
              console.log(`[getItemDetails] 🔍 Step 3: Trying mock restaurants for ID: ${args.itemId}`);
              const mockRestaurants = await ctx.runAction(api.api.getMockRestaurants, {
                city: args.location || "Đà Nẵng",
              });
              itemData = mockRestaurants.find((r: any) => String(r.id) === String(args.itemId));
              
              if (itemData) {
                console.log(`[getItemDetails] ✅ Found restaurant from mock: ${itemData.name}`);
              } else {
                console.log(`[getItemDetails] ❌ Restaurant not found in any source. Available IDs: ${searchRestaurants.map((r: any) => r.id).join(', ')}, Mock IDs: ${mockRestaurants.map((r: any) => r.id).join(', ')}`);
                
                // Step 4: Create a fallback restaurant with basic info if not found
                console.log(`[getItemDetails] 🔄 Step 4: Creating fallback restaurant for ID: ${args.itemId}`);
                itemData = {
                  id: args.itemId,
                  name: `Restaurant ${args.itemId}`,
                  location: args.location || "Đà Nẵng",
                  price: 500000,
                  rating: 4.5,
                  image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=95&auto=format&fit=crop",
                  description: `Nhà hàng tại ${args.location || "Đà Nẵng"}`,
                  amenities: ["WiFi", "Parking"],
                  openingHours: "10:00 - 22:00",
                  provider: "api",
                  externalId: args.itemId,
                };
                console.log(`[getItemDetails] ⚠️ Created fallback restaurant: ${itemData.name}`);
              }
            }
          }
        } catch (error) {
          console.error(`[getItemDetails] ❌ Error fetching restaurant:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[getItemDetails] Error details:`, { itemId: args.itemId, itemType: args.itemType, location: args.location, errorMessage });
          throw new Error(`Failed to fetch restaurant details: ${errorMessage}`);
        }
      } else {
        // Transport or other types
        itemData = {
          id: args.itemId,
          name: `${args.itemType} Service`,
          location: args.location || "N/A",
          price: 500000,
          rating: 4.0,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          description: `Dịch vụ ${args.itemType}`,
        };
      }

      // CRITICAL: Preserve price from API - DO NOT estimate if price exists and is valid
      // Only estimate if price is truly missing (null, undefined, empty string, or 0)
      const rawPrice = itemData.price;
      const parsedPrice = rawPrice !== null && rawPrice !== undefined && rawPrice !== '' 
        ? Number(rawPrice) 
        : null;
      
      const hasValidPrice = parsedPrice !== null && !isNaN(parsedPrice) && parsedPrice > 0;
      
      console.log(`[getItemDetails] 💰 Price check:`, {
        raw: rawPrice,
        parsed: parsedPrice,
        hasValidPrice,
        willEstimate: !hasValidPrice,
      });
      
      // ONLY estimate if price is truly missing or invalid
      if (!hasValidPrice) {
        const itemType = args.itemType;
        const rating = itemData.rating || 0;
        
        console.log(`[getItemDetails] ⚠️ Price is missing/invalid, estimating based on rating (${rating})...`);
        
        if (itemType === 'hotel') {
          if (rating >= 4.5) {
            itemData.price = 5000000;
          } else if (rating >= 4.0) {
            itemData.price = 3000000;
          } else if (rating >= 3.5) {
            itemData.price = 1500000;
          } else {
            itemData.price = 1000000;
          }
        } else if (itemType === 'restaurant') {
          if (rating >= 4.5) {
            itemData.price = 500000;
          } else if (rating >= 4.0) {
            itemData.price = 300000;
          } else {
            itemData.price = 200000;
          }
        } else if (itemType === 'attraction') {
          itemData.price = 200000;
        } else if (itemType === 'flight') {
          itemData.price = 2500000;
        } else {
          itemData.price = 200000;
        }
        
        console.log(`[getItemDetails] 💰 Estimated price for ${itemData.name} (${itemType}): ${itemData.price} VND`);
      } else {
        // PRESERVE original price from API - convert to number but keep the value
        itemData.price = parsedPrice;
        console.log(`[getItemDetails] ✅ PRESERVING price from API: ${itemData.price} VND (original: ${rawPrice})`);
      }
      
      // CRITICAL: Preserve name from API - DO NOT change it
      if (!itemData.name || itemData.name.trim() === '') {
        console.warn(`[getItemDetails] ⚠️ WARNING: Name is empty, using fallback`);
        itemData.name = itemData.name || `${args.itemType} Service`;
      } else {
        console.log(`[getItemDetails] ✅ PRESERVING name from API: "${itemData.name}"`);
      }

      if (!itemData) {
        throw new Error(`Item data is null after fetching ${args.itemType} with ID ${args.itemId}`);
      }

      console.log(`[getItemDetails] ✅ Successfully fetched ${args.itemType}:`, {
        id: itemData.id,
        name: itemData.name,
        price: itemData.price,
        priceType: typeof itemData.price,
        location: itemData.location,
        provider: itemData.provider,
        externalId: itemData.externalId,
      });
      
      // Verify name and price are preserved (not overridden)
      if (!itemData.name || itemData.name === 'Dịch vụ' || itemData.name.startsWith('Hotel ')) {
        console.warn(`[getItemDetails] ⚠️ WARNING: Hotel name might be fallback: "${itemData.name}"`);
      }
      if (!itemData.price || itemData.price === 0) {
        console.warn(`[getItemDetails] ⚠️ WARNING: Hotel price is 0 or missing: ${itemData.price}`);
      }

      // Ensure images array exists for ImageGallery component
      // Priority: Goong API photos > itemData.images > itemData.image > metadata photos
      if (!itemData.images || !Array.isArray(itemData.images) || itemData.images.length === 0) {
        const imageSources: string[] = [];
        
        // Source 1: itemData.photos (from Goong API) - HIGHEST PRIORITY
        if (itemData.photos && Array.isArray(itemData.photos) && itemData.photos.length > 0) {
          console.log(`[getItemDetails] 📸 Found ${itemData.photos.length} photos from Goong API`);
          itemData.photos.forEach((photo: any, index: number) => {
            if (typeof photo === 'string' && photo.startsWith('http')) {
              imageSources.push(photo);
            } else if (typeof photo === 'object') {
              // Check for url field
              if (photo.url && typeof photo.url === 'string' && photo.url.startsWith('http')) {
                imageSources.push(photo.url);
              }
              // Check for photo_reference (need to build URL)
              else if (photo.photo_reference) {
                const GOONG_API_KEY = process.env.GOONG_API_KEY;
                if (GOONG_API_KEY) {
                  const photoUrl = `https://rsapi.goong.io/Place/Photo?photo_reference=${photo.photo_reference}&maxwidth=1920&api_key=${GOONG_API_KEY}`;
                  imageSources.push(photoUrl);
                  console.log(`[getItemDetails] 📸 Generated photo URL ${index + 1} from photo_reference`);
                }
              }
            }
          });
        }
        
        // Source 2: itemData.metadata.photos or metadata.all_photos (from Goong API)
        if (imageSources.length === 0 && itemData.metadata) {
          const metadataPhotos = itemData.metadata.photos || itemData.metadata.all_photos || [];
          if (Array.isArray(metadataPhotos) && metadataPhotos.length > 0) {
            console.log(`[getItemDetails] 📸 Found ${metadataPhotos.length} photos in metadata`);
            metadataPhotos.forEach((photo: any) => {
              if (typeof photo === 'string' && photo.startsWith('http')) {
                imageSources.push(photo);
              } else if (typeof photo === 'object' && photo.url) {
                imageSources.push(photo.url);
              } else if (typeof photo === 'object' && photo.photo_reference) {
                const GOONG_API_KEY = process.env.GOONG_API_KEY;
                if (GOONG_API_KEY) {
                  const photoUrl = `https://rsapi.goong.io/Place/Photo?photo_reference=${photo.photo_reference}&maxwidth=1920&api_key=${GOONG_API_KEY}`;
                  imageSources.push(photoUrl);
                }
              }
            });
          }
        }
        
        // Source 3: itemData.images array
        if (imageSources.length === 0 && Array.isArray(itemData.images)) {
          imageSources.push(...itemData.images.filter((img: any) => 
            img && typeof img === 'string' && img.startsWith('http')
          ));
        }
        
        // Source 4: itemData.image (single image)
        if (imageSources.length === 0 && itemData.image && typeof itemData.image === 'string' && itemData.image.startsWith('http')) {
          imageSources.push(itemData.image);
        }
        
        // Remove duplicates and set images array
        itemData.images = [...new Set(imageSources)];
        
        console.log(`[getItemDetails] 📸 Final images array: ${itemData.images.length} images`);
        if (itemData.images.length > 0) {
          console.log(`[getItemDetails] 📸 First image: ${itemData.images[0].substring(0, 100)}...`);
        }
      } else {
        console.log(`[getItemDetails] 📸 Using existing images array: ${itemData.images.length} images`);
      }

      return itemData;
    } catch (error) {
      console.error(`[getItemDetails] ❌ Error getting item details:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[getItemDetails] Full error details:`, {
        itemId: args.itemId,
        itemType: args.itemType,
        location: args.location,
        errorMessage,
        errorStack,
      });
      throw new Error(`Failed to fetch item details: ${errorMessage}`);
    }
  },
});

// Get weather for item location
export const getItemWeather = action({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Try to get real weather data
      try {
        const weatherData = await ctx.runAction(api.api.getWeather, {
          city: args.location,
          date: new Date().toISOString(),
        });

        // Transform OpenWeatherMap response to our format
        if (weatherData && weatherData.main) {
          return {
            temperature: Math.round(weatherData.main.temp),
            description: weatherData.weather[0]?.description || "N/A",
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind?.speed || 0,
            icon: weatherData.weather[0]?.icon || "01d",
            city: weatherData.name,
          };
        }
      } catch (error) {
        console.error("Error fetching weather:", error);
        // Fallback to mock weather
      }

      // Mock weather data as fallback
      return {
        temperature: 28,
        description: "Nắng đẹp",
        humidity: 75,
        windSpeed: 15,
        icon: "01d",
        city: args.location,
      };
    } catch (error) {
      console.error("Error getting weather:", error);
      return null;
    }
  },
});

// Get reviews for item (mock for now, can integrate TripAdvisor later)
export const getItemReviews = query({
  args: {
    itemId: v.string(),
    itemType: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    // Mock reviews - in real app, this would come from database or TripAdvisor API
    return [
      {
        id: "1",
        userName: "Nguyễn Văn A",
        rating: 5,
        date: "2 tuần trước",
        comment: "Tuyệt vời! Dịch vụ tốt, giá cả hợp lý. Sẽ quay lại!",
        helpful: 12,
      },
      {
        id: "2",
        userName: "Trần Thị B",
        rating: 4,
        date: "1 tháng trước",
        comment: "Khá tốt, nhưng có một số điểm cần cải thiện.",
        helpful: 8,
      },
      {
        id: "3",
        userName: "Lê Văn C",
        rating: 5,
        date: "3 tuần trước",
        comment: "Trải nghiệm tuyệt vời! Đáng giá từng đồng.",
        helpful: 15,
      },
    ];
  },
});

