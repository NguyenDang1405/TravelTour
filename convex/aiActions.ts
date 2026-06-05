"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { sendMessageToAI, generateItinerary } from "../services/aiService";

// Send message to AI (action with Node.js support)
export const sendMessage = action({
  args: {
    conversationId: v.id("aiConversations"),
    message: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log('sendMessage action called with:', { conversationId: args.conversationId, userId: args.userId, messageLength: args.message.length });
    
    // Get conversation
    const conversation = await ctx.runQuery(api.ai.getConversation, {
      conversationId: args.conversationId,
    });

    if (!conversation) {
      console.error('Conversation not found:', args.conversationId);
      throw new Error("Conversation not found");
    }

    console.log('Conversation found:', conversation._id);

    // Get user preferences and past trips
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      console.error('User not found:', args.userId);
      throw new Error("User not found");
    }

    console.log('User found:', user._id);

    // Get user's past trips for context
    const userTrips = await ctx.runQuery(api.trips.getUserTrips, {
      userId: args.userId,
    });

    console.log('User trips count:', userTrips?.length || 0);

    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}-user`,
      text: args.message,
      isUser: true,
      timestamp: Date.now(),
    };

    const updatedMessages = [...conversation.messages, userMessage];

    // Update conversation with user message
    await ctx.runMutation(api.ai.patchConversation, {
      conversationId: args.conversationId,
      messages: updatedMessages,
      updatedAt: Date.now(),
    });

    // Call AI service
    const aiMessages = updatedMessages.map((msg) => ({
      role: msg.isUser ? ("user" as const) : ("assistant" as const),
      content: msg.text,
    }));

    // Build context from user data
    const userContext: any = {
      budget: user?.preferences?.budget,
      interests: user?.preferences?.interests || [],
      currency: user?.preferences?.currency || 'VND',
      pastTrips: userTrips?.slice(0, 5).map((trip: any) => ({
        destination: trip.destination,
        status: trip.status,
        startDate: trip.startDate,
        endDate: trip.endDate,
      })) || [],
      cachedData: "",
      liveData: [],
    };

    // Fetch real-time data based on user query
    try {
      // Try to extract destination from message to improve search
      const popularLocations = [
        "Hà Nội", "Hồ Chí Minh", "Sài Gòn", "Đà Nẵng", "Huế", "Hội An", 
        "Nha Trang", "Đà Lạt", "Phú Quốc", "Sapa", "Hạ Long", "Vũng Tàu", 
        "Cần Thơ", "Quy Nhơn", "Phan Thiết", "Ninh Bình", "Hải Phòng", 
        "Quảng Bình", "Quảng Nam", "Ninh Thuận", "Bình Thuận"
      ];
      
      let searchQuery = args.message;
      let originQuery = "";
      const foundLocations = popularLocations.filter(loc => args.message.toLowerCase().includes(loc.toLowerCase()));
      
      if (foundLocations.length > 0) {
        let dest = foundLocations[0];
        if (foundLocations.length > 1) {
          // Look for destination prepositions
          const destMatch = args.message.match(new RegExp(`(?:đi|đến|tới|ở|tại|du lịch|về)\\s+(${foundLocations.join('|')})`, 'i'));
          const originMatch = args.message.match(new RegExp(`(?:từ|khởi hành|xuất phát từ)\\s+(${foundLocations.join('|')})`, 'i'));
          
          if (destMatch) {
            dest = popularLocations.find(l => l.toLowerCase() === destMatch[1].toLowerCase()) || destMatch[1];
          } else if (originMatch) {
            dest = foundLocations.find(l => l.toLowerCase() !== originMatch[1].toLowerCase()) || dest;
          }
          if (originMatch) {
            originQuery = popularLocations.find(l => l.toLowerCase() === originMatch[1].toLowerCase()) || originMatch[1];
          }
        }
        searchQuery = dest;
      }
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departureDate = tomorrow.toISOString().split('T')[0];
      
      let returnDate = undefined;
      const durationMatch = args.message.match(/(\d+)\s*ngày/i);
      if (durationMatch) {
        const duration = parseInt(durationMatch[1]);
        const returnD = new Date(tomorrow);
        returnD.setDate(tomorrow.getDate() + duration - 1);
        returnDate = returnD.toISOString().split('T')[0];
      }
      
      console.log('Fetching live data for AI using query:', searchQuery, '(Original:', args.message, ')', 'origin:', originQuery);
      const searchParams: any = { 
        query: searchQuery,
        limit: 200, // Very high limit to bypass hotels filling the array, ensuring we get attractions and restaurants
      };
      
      if (originQuery) {
        searchParams.origin = originQuery;
        searchParams.destination = searchQuery;
        searchParams.departureDate = departureDate;
        if (returnDate) searchParams.returnDate = returnDate;
      }
      
      const searchResult = await ctx.runAction(api.api.unifiedSearch, searchParams);
      
      let cacheText = "";
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        // Ensure a mix of types in liveData instead of just hotels
        const hotels = searchResult.results.filter((i: any) => i.type === 'hotel').slice(0, 5);
        const attractions = searchResult.results.filter((i: any) => i.type === 'attraction').slice(0, 7);
        const restaurants = searchResult.results.filter((i: any) => i.type === 'restaurant').slice(0, 7);
        const flights = searchResult.results.filter((i: any) => i.type === 'flight').slice(0, 4); // 4 flights to get both outbound and return options
        userContext.liveData = [...flights, ...hotels, ...attractions, ...restaurants];
        
        cacheText = "KẾT QUẢ TÌM KIẾM THỰC TẾ (Sắp xếp Lịch trình dựa trên các địa điểm này):\n";
        for (const item of userContext.liveData) {
          cacheText += `- [${item.type.toUpperCase()}] ${item.name} (${item.location}). Giá: ${item.price} VND. Rating: ${item.rating} sao.\n`;
        }
      }
      userContext.cachedData = cacheText;
    } catch (e) {
      console.log("Error fetching live data for AI:", e);
    }

    // (Removed old recent caches logic to prioritize live data)

    console.log('Calling AI service with', aiMessages.length, 'messages');
    
    let aiResponse;
    try {
      aiResponse = await sendMessageToAI(aiMessages, userContext);
      console.log('AI response received, message length:', aiResponse.message.length);
    } catch (error: any) {
      console.error('Error calling AI service:', error);
      // Return fallback response
      aiResponse = {
        message: 'Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        recommendations: [],
      };
    }

    // Create recommendations if any
    const recommendationIds: any[] = [];
    if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
      for (const rec of aiResponse.recommendations) {
        const recId = await ctx.runMutation(api.ai.insertRecommendation, {
          conversationId: args.conversationId,
          type: rec.type,
          name: rec.name,
          location: rec.location,
          price: rec.price,
          rating: rec.rating,
          image: rec.image,
          description: rec.description,
          data: rec,
          createdAt: Date.now(),
        });
        recommendationIds.push(recId);
      }
    }

    // Add AI response message with recommendation IDs in metadata
    const aiMessage = {
      id: `msg-${Date.now()}-ai`,
      text: aiResponse.message,
      isUser: false,
      timestamp: Date.now(),
      metadata: {
        recommendationIds: recommendationIds,
      },
    };

    const finalMessages = [...updatedMessages, aiMessage];

    // Update conversation with AI response and recommendations
    await ctx.runMutation(api.ai.patchConversation, {
      conversationId: args.conversationId,
      messages: finalMessages,
      recommendations: [...conversation.recommendations, ...recommendationIds],
      updatedAt: Date.now(),
    });

    return {
      message: aiMessage,
      recommendations: aiResponse.recommendations || [],
    };
  },
});

// Send message to AI without saving (for non-logged-in users)
export const sendMessageWithoutAuth = action({
  args: {
    message: v.string(),
    conversationHistory: v.optional(v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    console.log('sendMessageWithoutAuth called with message length:', args.message.length);
    
    // Convert conversation history to AI format
    const aiMessages = (args.conversationHistory || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Add current message
    aiMessages.push({
      role: "user" as const,
      content: args.message,
    });
    
    const userContext: any = { cachedData: "", liveData: [] };
    
    // Fetch real-time data based on user query
    try {
      // Try to extract destination from message to improve search
      const popularLocations = [
        "Hà Nội", "Hồ Chí Minh", "Sài Gòn", "Đà Nẵng", "Huế", "Hội An", 
        "Nha Trang", "Đà Lạt", "Phú Quốc", "Sapa", "Hạ Long", "Vũng Tàu", 
        "Cần Thơ", "Quy Nhơn", "Phan Thiết", "Ninh Bình", "Hải Phòng", 
        "Quảng Bình", "Quảng Nam", "Ninh Thuận", "Bình Thuận"
      ];
      
      let searchQuery = args.message;
      let originQuery = "";
      const foundLocations = popularLocations.filter(loc => args.message.toLowerCase().includes(loc.toLowerCase()));
      
      if (foundLocations.length > 0) {
        let dest = foundLocations[0];
        if (foundLocations.length > 1) {
          // Look for destination prepositions
          const destMatch = args.message.match(new RegExp(`(?:đi|đến|tới|ở|tại|du lịch|về)\\s+(${foundLocations.join('|')})`, 'i'));
          const originMatch = args.message.match(new RegExp(`(?:từ|khởi hành|xuất phát từ)\\s+(${foundLocations.join('|')})`, 'i'));
          
          if (destMatch) {
            dest = popularLocations.find(l => l.toLowerCase() === destMatch[1].toLowerCase()) || destMatch[1];
          } else if (originMatch) {
            dest = foundLocations.find(l => l.toLowerCase() !== originMatch[1].toLowerCase()) || dest;
          }
          if (originMatch) {
            originQuery = popularLocations.find(l => l.toLowerCase() === originMatch[1].toLowerCase()) || originMatch[1];
          }
        }
        searchQuery = dest;
      }
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departureDate = tomorrow.toISOString().split('T')[0];
      
      let returnDate = undefined;
      const durationMatch = args.message.match(/(\d+)\s*ngày/i);
      if (durationMatch) {
        const duration = parseInt(durationMatch[1]);
        const returnD = new Date(tomorrow);
        returnD.setDate(tomorrow.getDate() + duration - 1);
        returnDate = returnD.toISOString().split('T')[0];
      }
      
      console.log('Fetching live data for AI (without auth) using query:', searchQuery, 'origin:', originQuery);
      const searchParams: any = { 
        query: searchQuery,
        limit: 200, // Very high limit to bypass hotels filling the array, ensuring we get attractions and restaurants
      };
      
      if (originQuery) {
        searchParams.origin = originQuery;
        searchParams.destination = searchQuery;
        searchParams.departureDate = departureDate;
        if (returnDate) searchParams.returnDate = returnDate;
      }
      
      const searchResult = await ctx.runAction(api.api.unifiedSearch, searchParams);
      
      let cacheText = "";
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        // Ensure a mix of types in liveData instead of just hotels
        const hotels = searchResult.results.filter((i: any) => i.type === 'hotel').slice(0, 5);
        const attractions = searchResult.results.filter((i: any) => i.type === 'attraction').slice(0, 7);
        const restaurants = searchResult.results.filter((i: any) => i.type === 'restaurant').slice(0, 7);
        const flights = searchResult.results.filter((i: any) => i.type === 'flight').slice(0, 4);
        userContext.liveData = [...flights, ...hotels, ...attractions, ...restaurants];
        
        cacheText = "KẾT QUẢ TÌM KIẾM THỰC TẾ (Sắp xếp Lịch trình dựa trên các địa điểm này):\n";
        for (const item of userContext.liveData) {
          cacheText += `- [${item.type.toUpperCase()}] ${item.name} (${item.location}). Giá: ${item.price} VND. Rating: ${item.rating} sao.\n`;
        }
      }
      userContext.cachedData = cacheText;
    } catch (e) {
      console.log("Error fetching live data for AI (without auth):", e);
    }

    // Call AI service without user context but with cached data
    let aiResponse;
    try {
      aiResponse = await sendMessageToAI(aiMessages, userContext);
      console.log('AI response received, message length:', aiResponse.message.length);
    } catch (error: any) {
      console.error('Error calling AI service:', error);
      // Return fallback response
      aiResponse = {
        message: 'Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        recommendations: [],
      };
    }

    return {
      message: {
        id: `msg-${Date.now()}-ai`,
        text: aiResponse.message,
        isUser: false,
        timestamp: Date.now(),
      },
      recommendations: aiResponse.recommendations || [],
    };
  },
});

// Generate itinerary from conversation
export const generateItineraryFromConversation = action({
  args: {
    conversationId: v.id("aiConversations"),
    preferences: v.optional(
      v.object({
        destination: v.optional(v.string()),
        duration: v.optional(v.number()),
        budget: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const itinerary = await generateItinerary(args.conversationId, args.preferences);
    return itinerary;
  },
});

