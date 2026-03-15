# Travel Tour App

Ứng dụng du lịch thông minh với AI, được xây dựng bằng React Native + Expo và Convex backend.

## 🚀 Tính năng chính

### ✅ Đã hoàn thành
- **Authentication**: Đăng nhập Google/Facebook với Clerk
- **Home Dashboard**: Hiển thị chuyến đi sắp tới, gợi ý nhanh
- **Search & Discovery**: Tìm kiếm điểm đến với filters thông minh
- **Trip Planning**: Lập kế hoạch hành trình chi tiết
- **Booking System**: Đặt chỗ với thanh toán VNPAY/MoMo
- **Profile Management**: Quản lý hồ sơ và sở thích
- **Real-time Sync**: Đồng bộ dữ liệu realtime với Convex

### 🔄 Đang phát triển
- **AI Chatbot**: Hỗ trợ tư vấn du lịch thông minh
- **3D Visualization**: Tour ảo 360° cho các điểm đến
- **Push Notifications**: Thông báo chuyến bay, thời tiết
- **Offline Mode**: Xem itinerary khi không có mạng

## 🛠️ Tech Stack

### Frontend
- **React Native** + **Expo** - Cross-platform mobile app
- **Expo Router** - File-based routing
- **Zustand** - State management
- **TypeScript** - Type safety
- **Ionicons** - Icon library

### Backend
- **Convex** - Real-time backend với TypeScript
- **Clerk** - Authentication & user management
- **Google Gemini** - AI chat & recommendations
- **External APIs**: Amadeus, Foursquare Places, OpenWeatherMap

### Payment
- **VNPAY** - Thanh toán chính
- **MoMo** - Ví điện tử
- **Bank Transfer** - Chuyển khoản ngân hàng

## 📱 Screenshots

```
🏠 Home          🔍 Search         📅 Planning       👤 Profile
┌─────────────┐  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Dashboard   │  │ Tìm kiếm    │   │ Lập kế hoạch│   │ Hồ sơ       │
│ Trip cards  │  │ Filters     │   │ Itinerary   │   │ Settings    │
│ Quick actions│  │ Results     │   │ Activities  │   │ Stats       │
└─────────────┘  └─────────────┘   └─────────────┘   └─────────────┘
```

## 🚀 Quick Start

### 1. Clone repository
```bash
git clone <repository-url>
cd travel-tour
```

### 2. Install dependencies
```bash
npm install
npm install @google/generative-ai
```

### 3. Setup environment variables

#### Frontend (.env.local)
Tạo file `.env.local` trong root directory:
```env
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Convex Backend
EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
```

#### Backend (Convex Dashboard) ⚠️ QUAN TRỌNG
**Các API keys phải được set trong Convex Dashboard**, không phải trong `.env.local`:

1. Truy cập: https://dashboard.convex.dev → Chọn project → Settings → Environment Variables
2. Set các variables sau:
   - `GEMINI_API_KEY` - Lấy từ https://aistudio.google.com/apikey
   - `AMADEUS_API_KEY` - (Optional) Cho hotel/flight search
   - `AMADEUS_API_SECRET` - (Optional) Cho hotel/flight search
   - `FOURSQUARE_API_KEY` - (Optional) Cho attractions/restaurants
   - `OPENWEATHER_API_KEY` - (Optional) Cho weather info
   - `VNPAY_TMN_CODE` - (Optional) Cho payment
   - `VNPAY_HASH_SECRET` - (Optional) Cho payment

**Xem chi tiết**: [CONVEX_ENV_SETUP.md](./CONVEX_ENV_SETUP.md)

### 4. Start development servers
```bash
# Terminal 1: Start Convex backend
npm run dev:be

# Terminal 2: Start Expo frontend
npm run dev:fe
```

### 5. Run on device
- **iOS**: Scan QR code với Camera app
- **Android**: Scan QR code với Expo Go app
- **Web**: Press `w` trong terminal

## 📁 Project Structure

```
travel-tour/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── booking.tsx        # Booking flow
├── convex/                # Backend functions & schemas
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User management
│   ├── trips.ts           # Trip operations
│   ├── bookings.ts        # Booking management
│   ├── payments.ts        # Payment processing
│   └── api.ts             # External API integrations
├── store/                 # Zustand state management
│   ├── useAuthStore.ts    # Authentication state
│   └── useTripStore.ts    # Trip state
├── services/              # External services
│   ├── apiService.ts      # API integrations
│   └── paymentService.ts  # Payment processing
├── components/            # Reusable components
├── constants/             # Theme & configuration
└── styles/               # Styling files
```

## 🗄️ Database Schema

### Users
- Profile information
- Preferences (interests, budget, currency)
- Search history

### Trips
- Trip details (title, destination, dates, budget)
- Itinerary with activities
- Sharing & collaboration

### Bookings
- Hotel, flight, attraction bookings
- Payment status tracking
- Affiliate commission

### Payments
- Transaction records
- Payment method tracking
- Refund management

## 🔌 API Integrations

### Amadeus Travel API
- **Hotels**: Search & booking
- **Flights**: Search & pricing
- **Location**: City codes & coordinates

### Foursquare Places API
- **Attractions**: Points of interest & tourist attractions
- **Restaurants**: Dining options & cuisine types
- **Free Tier**: 1,000 requests/day (KHÔNG CẦN THẺ TÍN DỤNG)

### OpenWeatherMap API
- **Current Weather**: Real-time conditions
- **Forecast**: 5-day weather prediction
- **Alerts**: Weather warnings

## 💳 Payment Integration

### VNPAY
- Secure payment gateway
- Hash signature verification
- Webhook handling

### MoMo
- Mobile wallet integration
- QR code payments
- Instant confirmation

### Bank Transfer
- Traditional banking
- Manual verification
- 24-hour processing

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark mode design
- **Responsive**: Optimized for all screen sizes
- **Animations**: Smooth transitions & micro-interactions
- **Accessibility**: Screen reader support
- **Internationalization**: Vietnamese & English support

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Linting
npm run lint
```

## 📦 Build & Deploy

### Development Build
```bash
expo build:android
expo build:ios
```

### Production Build
```bash
eas build --platform all
```

### Deploy to Stores
```bash
eas submit --platform all
```

## 🔧 Development Commands

```bash
# Start development
npm run dev

# Reset project
npm run reset-project

# Type checking
npm run type-check

# Format code
npm run format
```

## 📈 Performance

- **Bundle Size**: ~15MB (optimized)
- **Startup Time**: <3 seconds
- **Memory Usage**: <100MB
- **Battery**: Optimized for travel usage

## 🔒 Security

- **Authentication**: JWT tokens with Clerk
- **Data Encryption**: End-to-end encryption
- **API Security**: Rate limiting & validation
- **Payment Security**: PCI DSS compliance

## 🌍 Internationalization

- **Languages**: Vietnamese (primary), English
- **Currency**: VND (primary), USD
- **Date Format**: DD/MM/YYYY
- **Number Format**: Vietnamese locale

## 📞 Support

- **Email**: support@traveltour.app
- **Documentation**: [docs.traveltour.app](https://docs.traveltour.app)
- **Issues**: [GitHub Issues](https://github.com/traveltour/issues)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for Vietnamese travelers**
## Deployment
Deployed on Vercel. See vercel.json for output config.

