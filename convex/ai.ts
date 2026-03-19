import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user conversations
export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get conversation by ID
export const getConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Load recommendations for messages that have recommendation IDs in metadata
    const messagesWithRecommendations = await Promise.all(
      conversation.messages.map(async (msg) => {
        if (msg.metadata?.recommendationIds && Array.isArray(msg.metadata.recommendationIds)) {
          const recommendations = await Promise.all(
            msg.metadata.recommendationIds.map(async (recId: any) => {
              const rec = await ctx.db.get(recId) as any;
              if (!rec) return null;
              return {
                id: rec._id,
                name: rec.name,
                type: rec.type,
                location: rec.location || '',
                price: rec.price,
                rating: rec.rating,
                image: rec.image,
                description: rec.description,
              };
            })
          );
          return {
            ...msg,
            recommendations: recommendations.filter((r) => r !== null),
          };
        }
        return { ...msg, recommendations: [] };
      })
    );

    return {
      ...conversation,
      messages: messagesWithRecommendations,
    };
  },
});

// Create new conversation
export const createConversation = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("aiConversations", {
      userId: args.userId,
      title: args.title,
      messages: [],
      recommendations: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});


// Patch conversation (internal mutation)
export const patchConversation = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    messages: v.optional(
      v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          isUser: v.boolean(),
          timestamp: v.number(),
          metadata: v.optional(v.any()),
        })
      )
    ),
    recommendations: v.optional(v.array(v.id("aiRecommendations"))),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.messages !== undefined) updates.messages = args.messages;
    if (args.recommendations !== undefined) updates.recommendations = args.recommendations;
    if (args.updatedAt !== undefined) updates.updatedAt = args.updatedAt;

    await ctx.db.patch(args.conversationId, updates);
  },
});

// Insert recommendation (internal mutation)
export const insertRecommendation = mutation({
  args: {
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
    data: v.any(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiRecommendations", {
      conversationId: args.conversationId,
      type: args.type,
      name: args.name,
      location: args.location,
      price: args.price,
      rating: args.rating,
      image: args.image,
      description: args.description,
      data: args.data,
      createdAt: args.createdAt,
    });
  },
});

// Get quick suggestions based on user data
export const getQuickSuggestions = query({
  args: { 
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const suggestions: string[] = [];
    
    // If user is logged in, get personalized suggestions
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      
      if (user) {
        // Get user's past trips
        const userTrips = await ctx.db
          .query("trips")
          .withIndex("by_user", (q) => q.eq("userId", args.userId!))
          .order("desc")
          .take(5);
        
        // Get unique destinations from past trips
        const destinations = [...new Set(userTrips.map(trip => trip.destination))];
        
        // Generate suggestions based on user interests
        const interests = user.preferences?.interests || [];
        const budget = user.preferences?.budget;
        
        // Add suggestions based on past destinations
        if (destinations.length > 0) {
          destinations.slice(0, 2).forEach(dest => {
            suggestions.push(`Lập kế hoạch du lịch ${dest}`);
            suggestions.push(`Gợi ý điểm đến cho kỳ nghỉ ở ${dest}`);
          });
        }
        
        // Add suggestions based on interests
        if (interests.length > 0) {
          const interestMap: Record<string, string> = {
            'beach': 'Biển',
            'culture': 'Văn hóa',
            'adventure': 'Phiêu lưu',
            'food': 'Ẩm thực',
            'nature': 'Thiên nhiên',
            'history': 'Lịch sử',
            'shopping': 'Mua sắm',
          };
          
          interests.slice(0, 2).forEach(interest => {
            const interestName = interestMap[interest.toLowerCase()] || interest;
            suggestions.push(`Tìm điểm đến ${interestName.toLowerCase()} phù hợp`);
          });
        }
        
        // Add budget-based suggestions
        if (budget) {
          const budgetInMillion = Math.floor(budget / 1000000);
          suggestions.push(`Khách sạn tốt giá dưới ${budgetInMillion} triệu`);
        }
      }
    }
    
    // Add popular/default suggestions if we don't have enough
    const popularSuggestions = [
      'Gợi ý điểm đến cho kỳ nghỉ 3 ngày ở Đà Nẵng',
      'Lập kế hoạch du lịch Phú Quốc',
      'Khách sạn tốt ở Hà Nội giá dưới 2 triệu',
      'Điểm tham quan nổi tiếng ở Sài Gòn',
      'Nhà hàng ngon ở Hội An',
      'Tour du lịch miền Bắc 5 ngày 4 đêm',
    ];
    
    // Fill up to 6 suggestions total
    const availableSuggestions = popularSuggestions.filter(s => !suggestions.includes(s));
    const needed = Math.min(6 - suggestions.length, availableSuggestions.length);
    
    // Add random suggestions from available ones
    for (let i = 0; i < needed; i++) {
      const randomIndex = Math.floor(Math.random() * availableSuggestions.length);
      suggestions.push(availableSuggestions[randomIndex]);
      availableSuggestions.splice(randomIndex, 1);
    }
    
    // If still not enough, just add from popularSuggestions in order
    if (suggestions.length < 6) {
      for (const suggestion of popularSuggestions) {
        if (suggestions.length >= 6) break;
        if (!suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }
    
    // Return up to 6 suggestions
    return suggestions.slice(0, 6);
  },
});

