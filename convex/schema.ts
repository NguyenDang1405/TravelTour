import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User Schema - Lưu trữ thông tin người dùng
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    preferences: v.object({
      budget: v.optional(v.number()),
      interests: v.array(v.string()), // ["beach", "culture", "adventure"]
      currency: v.optional(v.string()), // "VND", "USD"
      language: v.optional(v.string()), // "vi", "en"
    }),
    searchHistory: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Trip Schema - Quản lý dữ liệu chuyến đi
  trips: defineTable({
    userId: v.id("users"),
    title: v.string(),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    budget: v.number(),
    status: v.union(
      v.literal("planning"),
      v.literal("confirmed"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    itinerary: v.array(v.object({
      day: v.number(),
      date: v.string(),
      activities: v.array(v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(), // "attraction", "restaurant", "hotel", "transport"
        location: v.object({
          name: v.string(),
          address: v.string(),
          coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
          }),
        }),
        time: v.string(),
        duration: v.number(), // minutes
        cost: v.optional(v.number()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
        bookingId: v.optional(v.string()),
      })),
    })),
    participants: v.array(v.string()), // email addresses
    isShared: v.boolean(),
    shareLink: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_destination", ["destination"]),

  // Booking Schema - Quản lý đặt chỗ
  bookings: defineTable({
    tripId: v.optional(v.id("trips")), // Optional - có thể đặt chỗ không gắn với trip
    userId: v.id("users"),
    type: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
    provider: v.string(), // "Amadeus", "Booking.com", "VNPAY"
    externalId: v.string(), // ID từ provider
    name: v.string(),
    description: v.optional(v.string()),
    location: v.object({
      name: v.string(),
      address: v.string(),
      coordinates: v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    }),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    guests: v.optional(v.number()),
    price: v.number(),
    currency: v.string(),
    image: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    paymentMethod: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
    affiliateCommission: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  // Search Cache - Cache kết quả tìm kiếm
  searchCache: defineTable({
    query: v.string(),
    filters: v.object({
      budget: v.optional(v.number()),
      duration: v.optional(v.number()),
      interests: v.optional(v.array(v.string())),
      destination: v.optional(v.string()),
    }),
    results: v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      location: v.string(),
      price: v.number(),
      currency: v.optional(v.string()), // For flights (USD/EUR) vs hotels (VND)
      rating: v.number(),
      reviews: v.optional(v.number()),
      image: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      // Store any additional provider-specific fields (Goong API, etc.)
      metadata: v.optional(v.any()),
    })),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_query", ["query"])
    .index("by_expires", ["expiresAt"]),

  // SERPAPI Cache - Cache riêng cho các API calls của SERPAPI để tiết kiệm request
  serpApiCache: defineTable({
    cacheKey: v.string(), // Unique key: "engine:query" (e.g., "google_maps:hotels in Da Nang")
    engine: v.string(), // "google_maps" or "google_images"
    query: v.string(),
    data: v.any(), // Raw response data from SERPAPI
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_cacheKey", ["cacheKey"])
    .index("by_expires", ["expiresAt"]),

  // Payments - Quản lý thanh toán
  payments: defineTable({
    bookingId: v.id("bookings"),
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    externalTransactionId: v.optional(v.string()),
    paymentUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalTransactionId"]),

  // Analytics - Phân tích dữ liệu
  analytics: defineTable({
    userId: v.optional(v.id("users")),
    event: v.string(),
    data: v.any(),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["event"])
    .index("by_timestamp", ["timestamp"]),

  // Favorites - Quản lý items yêu thích
  favorites: defineTable({
    userId: v.id("users"),
    itemId: v.string(), // External item ID
    itemType: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
    name: v.string(),
    location: v.string(),
    price: v.optional(v.number()),
    rating: v.optional(v.number()),
    image: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional item data
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["itemType"])
    .index("by_user_type", ["userId", "itemType"]),

  // AI Conversations - Lịch sử chat với AI
  aiConversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()), // Auto-generated from first message
    messages: v.array(v.object({
      id: v.string(),
      text: v.string(),
      isUser: v.boolean(),
      timestamp: v.number(),
      metadata: v.optional(v.any()),
    })),
    recommendations: v.array(v.id("aiRecommendations")), // References to recommendations
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_updated", ["updatedAt"]),

  // AI Recommendations - Recommendations từ AI
  aiRecommendations: defineTable({
    conversationId: v.id("aiConversations"),
    type: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport"),
      v.literal("itinerary")
    ),
    name: v.string(),
    location: v.optional(v.string()),
    price: v.optional(v.number()),
    rating: v.optional(v.number()),
    image: v.optional(v.string()),
    description: v.optional(v.string()),
    data: v.any(), // Full recommendation data
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_type", ["type"]),

  // Blog Posts - Bài đánh giá du lịch
  blogPosts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    slug: v.optional(v.string()), // URL-friendly slug từ title (optional để backward compatible)
    content: v.string(),
    rating: v.optional(v.number()), // 1-5 sao
    location: v.optional(v.string()), // Địa điểm được đánh giá (text fallback)
    category: v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination"),
      v.literal("general")
    ),
    // Liên kết với item cụ thể
    itemId: v.optional(v.string()), // ID của item được đánh giá (hotel/restaurant/destination)
    itemType: v.optional(v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination")
    )),
    itemName: v.optional(v.string()), // Tên item để hiển thị
    itemImage: v.optional(v.string()), // Hình ảnh item
    itemLocation: v.optional(v.string()), // Địa chỉ item
    images: v.optional(v.array(v.string())), // URLs của hình ảnh
    tags: v.optional(v.array(v.string())),
    likes: v.number(), // Số lượt thích
    views: v.number(), // Số lượt xem
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_published", ["isPublished"])
    .index("by_created", ["createdAt"])
    .index("by_item", ["itemId", "itemType"])
    .index("by_slug", ["slug"]),

  // Reviews - Đánh giá của khách hàng
  reviews: defineTable({
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    rating: v.number(), // 1-5
    content: v.string(),
    featured: v.boolean(), // Đánh giá nổi bật để show trang chủ
    createdAt: v.number(),
  })
    .index("by_featured", ["featured"])
    .index("by_created", ["createdAt"]),
});

