
export interface Hotel {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  amenities: string[];
  checkIn: string;
  checkOut: string;
}

export interface Attraction {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  category: string;
  duration: string;
  openingHours: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  category: string;
  cuisine: string;
  openingHours: string;
}

export interface Flight {
  id: string;
  airline: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: string;
  stops: number;
}

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

class ApiService {
  // Search hotels by city
  async searchHotels(city: string): Promise<Hotel[]> {
    try {
      // In a real app, you would call the Convex action here
      // const hotels = await convex.mutation(api.api.searchHotels, { cityCode: city });
      
      // For now, return mock data
      return this.getMockHotels(city);
    } catch (error) {
      console.error('Error searching hotels:', error);
      return [];
    }
  }

  // Search attractions by city
  // NOTE: This service uses mock data. For real Foursquare API integration,
  // use Convex actions directly: useAction(api.api.searchAttractions) in components
  async searchAttractions(city: string): Promise<Attraction[]> {
    try {
      // In a real app, you would call the Convex action here
      // const attractions = await convex.action(api.api.searchAttractions, { location: city });
      // return attractions.results || [];
      
      // For now, return mock data as fallback
      // Components should use useAction(api.api.searchAttractions) directly for Foursquare API
      return this.getMockAttractions(city);
    } catch (error) {
      console.error('Error searching attractions:', error);
      return [];
    }
  }

  // Search restaurants by city
  // NOTE: This service uses mock data. For real Foursquare API integration,
  // use Convex actions directly: useAction(api.api.searchRestaurants) in components
  async searchRestaurants(city: string): Promise<Restaurant[]> {
    try {
      // In a real app, you would call the Convex action here
      // const restaurants = await convex.action(api.api.searchRestaurants, { location: city });
      // return restaurants.results || [];
      
      // For now, return mock data as fallback
      // Components should use useAction(api.api.searchRestaurants) directly for Foursquare API
      return this.getMockRestaurants(city);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }
  }

  // Search flights
  async searchFlights(origin: string, destination: string, date: string): Promise<Flight[]> {
    try {
      // In a real app, you would call the Convex action here
      // const flights = await convex.mutation(api.api.searchFlights, { origin, destination, departureDate: date });
      
      // For now, return mock data
      return this.getMockFlights(origin, destination);
    } catch (error) {
      console.error('Error searching flights:', error);
      return [];
    }
  }

  // Get weather data
  async getWeather(city: string): Promise<WeatherData | null> {
    try {
      // In a real app, you would call the Convex action here
      // const weather = await convex.mutation(api.api.getWeather, { city, date: new Date().toISOString() });
      
      // For now, return mock data
      return this.getMockWeather(city);
    } catch (error) {
      console.error('Error getting weather:', error);
      return null;
    }
  }

  // Mock data methods
  private getMockHotels(city: string): Hotel[] {
    const allHotels: Hotel[] = [
      {
        id: "1",
        name: "InterContinental Đà Nẵng",
        location: "Đà Nẵng",
        price: 2500000,
        rating: 4.5,
        image: "https://example.com/hotel1.jpg",
        description: "Khách sạn 5 sao với view biển tuyệt đẹp",
        amenities: ["WiFi", "Pool", "Spa", "Restaurant"],
        checkIn: "14:00",
        checkOut: "12:00",
      },
      {
        id: "2",
        name: "Novotel Đà Nẵng",
        location: "Đà Nẵng",
        price: 1800000,
        rating: 4.3,
        image: "https://example.com/hotel2.jpg",
        description: "Khách sạn 4 sao gần trung tâm thành phố",
        amenities: ["WiFi", "Pool", "Gym", "Restaurant"],
        checkIn: "14:00",
        checkOut: "12:00",
      },
      {
        id: "3",
        name: "Hyatt Regency Đà Nẵng",
        location: "Đà Nẵng",
        price: 3200000,
        rating: 4.7,
        image: "https://example.com/hotel3.jpg",
        description: "Khách sạn 5 sao sang trọng với dịch vụ cao cấp",
        amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar"],
        checkIn: "15:00",
        checkOut: "11:00",
      },
      {
        id: "4",
        name: "JW Marriott Phú Quốc",
        location: "Phú Quốc",
        price: 4500000,
        rating: 4.8,
        image: "https://example.com/hotel4.jpg",
        description: "Resort 5 sao với bãi biển riêng",
        amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Beach"],
        checkIn: "15:00",
        checkOut: "11:00",
      },
    ];

    return allHotels.filter(hotel => 
      hotel.location.toLowerCase().includes(city.toLowerCase())
    );
  }

  private getMockAttractions(city: string): Attraction[] {
    const allAttractions: Attraction[] = [
      {
        id: "1",
        name: "Bà Nà Hills",
        location: "Đà Nẵng",
        price: 800000,
        rating: 4.8,
        image: "https://example.com/banahills.jpg",
        description: "Khu du lịch trên núi với cầu Vàng nổi tiếng",
        category: "attraction",
        duration: "4-6 giờ",
        openingHours: "07:00 - 22:00",
      },
      {
        id: "2",
        name: "Chùa Linh Ứng",
        location: "Đà Nẵng",
        price: 0,
        rating: 4.4,
        image: "https://example.com/chualinhung.jpg",
        description: "Chùa cổ với tượng Phật Quan Âm cao nhất Việt Nam",
        category: "temple",
        duration: "1-2 giờ",
        openingHours: "06:00 - 18:00",
      },
      {
        id: "3",
        name: "Bãi biển Mỹ Khê",
        location: "Đà Nẵng",
        price: 0,
        rating: 4.6,
        image: "https://example.com/mykhebeach.jpg",
        description: "Bãi biển đẹp nhất thế giới với cát trắng mịn",
        category: "beach",
        duration: "2-4 giờ",
        openingHours: "24/7",
      },
      {
        id: "4",
        name: "VinWonders Phú Quốc",
        location: "Phú Quốc",
        price: 1200000,
        rating: 4.5,
        image: "https://example.com/vinwonders.jpg",
        description: "Công viên giải trí lớn nhất Việt Nam",
        category: "theme-park",
        duration: "6-8 giờ",
        openingHours: "09:00 - 21:00",
      },
    ];

    return allAttractions.filter(attraction => 
      attraction.location.toLowerCase().includes(city.toLowerCase())
    );
  }

  private getMockRestaurants(city: string): Restaurant[] {
    const allRestaurants: Restaurant[] = [
      {
        id: "1",
        name: "Nhà hàng Hải Sản Mỹ Khê",
        location: "Đà Nẵng",
        price: 500000,
        rating: 4.3,
        image: "https://example.com/seafood.jpg",
        description: "Hải sản tươi ngon với view biển",
        category: "seafood",
        cuisine: "Hải sản",
        openingHours: "10:00 - 22:00",
      },
      {
        id: "2",
        name: "Quán Bún Bò Huế",
        location: "Đà Nẵng",
        price: 80000,
        rating: 4.5,
        image: "https://example.com/bunbo.jpg",
        description: "Bún bò Huế đặc sản miền Trung",
        category: "vietnamese",
        cuisine: "Việt Nam",
        openingHours: "06:00 - 14:00",
      },
      {
        id: "3",
        name: "Nhà hàng Sky36",
        location: "Đà Nẵng",
        price: 1200000,
        rating: 4.7,
        image: "https://example.com/sky36.jpg",
        description: "Nhà hàng trên cao với view toàn thành phố",
        category: "fine-dining",
        cuisine: "Quốc tế",
        openingHours: "18:00 - 23:00",
      },
    ];

    return allRestaurants.filter(restaurant => 
      restaurant.location.toLowerCase().includes(city.toLowerCase())
    );
  }

  private getMockFlights(origin: string, destination: string): Flight[] {
    return [
      {
        id: "1",
        airline: "VietJet Air",
        departure: origin,
        arrival: destination,
        departureTime: "08:00",
        arrivalTime: "10:30",
        price: 1200000,
        duration: "2h 30m",
        stops: 0,
      },
      {
        id: "2",
        airline: "Vietnam Airlines",
        departure: origin,
        arrival: destination,
        departureTime: "14:00",
        arrivalTime: "16:30",
        price: 1500000,
        duration: "2h 30m",
        stops: 0,
      },
      {
        id: "3",
        airline: "Bamboo Airways",
        departure: origin,
        arrival: destination,
        departureTime: "20:00",
        arrivalTime: "22:30",
        price: 1100000,
        duration: "2h 30m",
        stops: 0,
      },
    ];
  }

  private getMockWeather(city: string): WeatherData {
    return {
      temperature: 28,
      description: "Nắng đẹp",
      humidity: 75,
      windSpeed: 12,
      icon: "☀️",
    };
  }
}

export const apiService = new ApiService();
