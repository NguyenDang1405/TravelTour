/**
 * AI Service - Handles Hugging Face API integration
 * Uses Hugging Face for AI chat and recommendations
 */

import { HfInference } from '@huggingface/inference';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIRecommendation {
  id: string;
  name: string;
  type: 'hotel' | 'attraction' | 'restaurant' | 'flight' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
}

interface AIResponse {
  message: string;
  recommendations?: AIRecommendation[];
  itinerary?: any;
}

// Initialize Hugging Face AI
function getHfClient() {
  const apiKey = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn('HUGGINGFACE_API_KEY is not set in environment variables. Using fallback mode.');
    return null;
  }
  return new HfInference(apiKey);
}

/**
 * Send message to AI and get response using Hugging Face
 */
export async function sendMessageToAI(
  messages: AIMessage[],
  userContext?: {
    budget?: number;
    interests?: string[];
    currency?: string;
    pastTrips?: Array<{
      destination: string;
      status: string;
      startDate: string;
      endDate: string;
    }>;
    cachedData?: string;
    liveData?: any[];
  }
): Promise<AIResponse> {
  try {
    const hf = getHfClient();
    
    // Fallback mode trigger if we really want to bypass without API key
    // But let's try the API even without key for small models
    if (!hf) {
      console.log('HF client not available, using fallback mode');
      const lastMessageContent = messages[messages.length - 1]?.content.toLowerCase() || '';
      return getFallbackResponse(lastMessageContent, userContext);
    }
    


    // Build system prompt with user context
    let contextInfo = '';
    if (userContext) {
      if (userContext.budget) {
        contextInfo += `Ngân sách: ${userContext.budget.toLocaleString('vi-VN')} ${userContext.currency || 'VND'}\n`;
      }
      if (userContext.interests && userContext.interests.length > 0) {
        contextInfo += `Sở thích: ${userContext.interests.join(', ')}\n`;
      }
      if (userContext.pastTrips && userContext.pastTrips.length > 0) {
        contextInfo += `\nCác chuyến đi trước đây:\n`;
        userContext.pastTrips.forEach((trip, index) => {
          contextInfo += `${index + 1}. ${trip.destination} (${trip.startDate} - ${trip.endDate}) - ${trip.status}\n`;
        });
      }
      if (userContext.cachedData) {
        contextInfo += `\n\nCƠ SỞ DỮ LIỆU ĐỊA PHƯƠNG (HÃY ƯU TIÊN SỬ DỤNG CÁC ĐỊA ĐIỂM NÀY KHI GỢI Ý DỰA TRÊN NGỮ CẢNH):\n${userContext.cachedData}\n`;
      }
    }

    const systemPrompt = `Bạn là một trợ lý AI du lịch chuyên nghiệp, giúp người dùng lập kế hoạch chuyến đi và tìm kiếm các dịch vụ du lịch tại Việt Nam.

Nhiệm vụ của bạn:
1. Trả lời câu hỏi về du lịch một cách thân thiện và hữu ích
2. Đề xuất khách sạn, điểm tham quan, nhà hàng phù hợp dựa trên yêu cầu của người dùng, ĐẶC BIỆT LÀ CÁC DỮ LIỆU TỪ CƠ SỞ DỮ LIỆU ĐỊA PHƯƠNG NẾU CÓ.
3. Giúp lập kế hoạch lịch trình chuyến đi CHI TIẾT theo từng ngày, bao gồm:
   - Thời gian cụ thể cho mỗi hoạt động
   - Địa điểm rõ ràng
   - Gợi ý khách sạn, nhà hàng, điểm tham quan
   - Thứ tự hợp lý để tiết kiệm thời gian di chuyển
4. Tư vấn dựa trên ngân sách, sở thích và lịch sử du lịch của người dùng
5. Khi đề xuất, hãy cung cấp thông tin cụ thể: tên, địa điểm, giá (nếu có), đánh giá

${contextInfo}

QUAN TRỌNG:
- Khi người dùng yêu cầu tạo lộ trình/lịch trình, bạn PHẢI tạo một lộ trình CHI TIẾT theo từng ngày
- Mỗi ngày nên có: buổi sáng, buổi trưa, buổi chiều, buổi tối với các hoạt động cụ thể
- Đề xuất khách sạn phù hợp với ngân sách
- Đề xuất nhà hàng địa phương ngon
- Đề xuất điểm tham quan nổi tiếng và phù hợp
- Sắp xếp lịch trình hợp lý để không phải di chuyển quá nhiều

Khi đề xuất các địa điểm, khách sạn, nhà hàng, hãy giải thích CỰC KỲ CHI TIẾT lý do tại sao lại chọn (có gì thú vị, đặc trưng gì, v.v).
      
YÊU CẦU BẮT BUỘC:
1. Bạn CHỈ ĐƯỢC PHÉP sử dụng các địa điểm có trong KẾT QUẢ TÌM KIẾM THỰC TẾ (nếu có). TUYỆT ĐỐI KHÔNG tự bịa ra tên địa điểm, nhà hàng hay khách sạn nào khác ngoài danh sách được cung cấp.
2. Trả lời BẰNG TIẾNG VIỆT, chi tiết, đầy đủ bằng text thông thường (markdown). Nếu lập lịch trình thì PHẢI trả lời TOÀN BỘ từng ngày, KHÔNG được tóm tắt hay cắt ngắn.
3. Ở DÒNG CUỐI CÙNG của câu trả lời (SAU tất cả nội dung), thêm đúng một dòng theo định dạng này để hệ thống trích xuất gợi ý:
RECOMMENDATIONS_JSON: {"names": ["Tên địa điểm 1", "Tên địa điểm 2"]}
Nếu không có gợi ý cụ thể, để mảng rỗng: RECOMMENDATIONS_JSON: {"names": []}`;

    // Convert messages to HF format
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Hugging Face inference API
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-72B-Instruct", // Good model for Vietnamese
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    let text = response.choices[0]?.message?.content || "";
    
    let aiMessage = "Xin lỗi, tôi không thể xử lý dữ liệu lúc này.";
    let finalRecommendations: AIRecommendation[] = [];
    
    try {
      // AI now returns free-form markdown text with RECOMMENDATIONS_JSON tag at the end
      const recTagMatch = text.match(/RECOMMENDATIONS_JSON:\s*.*?(\{.*?\})/);
      let recNames: string[] = [];
      
      if (recTagMatch) {
        try {
          const recData = JSON.parse(recTagMatch[1]);
          recNames = Array.isArray(recData.names) ? recData.names : [];
        } catch (_) { /* ignore */ }
        // Strip the tag line from message
        aiMessage = text.replace(/RECOMMENDATIONS_JSON:\s*\{[^\n]+\}\s*$/, '').trim();
      } else {
        aiMessage = text.trim();
      }
      
      // Clean up any stray code blocks the model might add
      aiMessage = aiMessage.replace(/\x60\x60\x60json[\s\S]*?\x60\x60\x60/g, '').replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g, '').trim();
      
      if (!aiMessage) aiMessage = "Xin lỗi, tôi không thể xử lý dữ liệu lúc này.";
      
      // Match recommendations from available items
      let availableItems: any[] = [];
      if (userContext?.liveData && Array.isArray(userContext.liveData) && userContext.liveData.length > 0) {
        availableItems = userContext.liveData;
      } else if (userContext?.cachedData && typeof userContext.cachedData === 'string') {
        const lines = userContext.cachedData.split('\n');
        for (const line of lines) {
          const match = line.match(/- \[([A-Z]+)\] (.*?) \((.*?)\)\. Giá:/);
          if (match) {
            availableItems.push({
              id: `rec-cache-${availableItems.length}`,
              type: match[1].toLowerCase(),
              name: match[2].trim(),
              location: match[3].trim(),
              price: 1000000,
              rating: 4.5,
              image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
            });
          }
        }
        console.log(`[aiService] Parsed ${availableItems.length} items from cacheText`);
      }

      if (availableItems.length > 0) {
        if (recNames.length > 0) {
          // Primary: use names from tag
          console.log(`[aiService] Matching against tag names: ${recNames}`);
          const matched = availableItems.filter((item: any) =>
            recNames.some((name: string) =>
              item.name?.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(item.name?.toLowerCase() || '')
            )
          );
          finalRecommendations = matched.length > 0 ? matched : availableItems.filter((item: any) =>
            item.name && aiMessage.toLowerCase().includes(item.name.toLowerCase())
          );
        } else if (aiMessage.length > 100) {
          // Long response (itinerary) - scan message for mentioned item names
          const lowerMsg = aiMessage.toLowerCase();
          const mentioned = availableItems.filter((item: any) =>
            item.name && lowerMsg.includes(item.name.toLowerCase())
          );
          console.log(`[aiService] No tags, scanned for mentions. Found:`, mentioned.map(i => i.name));
          finalRecommendations = mentioned.length > 0 ? mentioned : availableItems.slice(0, 4);
        }
      }
      
      // Fallback: If AI suggested names but they weren't in cache, create dummy cards
      if (finalRecommendations.length === 0 && recNames.length > 0) {
        console.log(`[aiService] No matching cache items found. Creating dummy items for:`, recNames);
        finalRecommendations = recNames.map((name: string, idx: number) => ({
          id: `rec-ai-${idx}`,
          type: 'attraction',
          name: name,
          location: 'Việt Nam',
          price: 50000,
          rating: 4.8,
          image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
          description: 'Gợi ý từ AI'
        }));
      }
      
      console.log(`[aiService] Final recommendations count: ${finalRecommendations.length}`);
    } catch (e) {
      console.log("Failed entirely to process AI response:", text);
      aiMessage = text || "Xin lỗi, tôi không thể xử lý dữ liệu lúc này.";
    }

    return {
      message: aiMessage,
      recommendations: finalRecommendations,
    };
  } catch (error: any) {
    console.error('Hugging Face API error:', error);
    
    // Handle quota exceeded error (429) - retry with delay or use fallback
    if (error.status === 429) {
      console.warn('Quota exceeded, using fallback response');
      const lastMessageContent = messages[messages.length - 1]?.content.toLowerCase() || '';
      return getFallbackResponse(lastMessageContent);
    }
    
    // Enhanced fallback recommendations based on user message
    const lastMessageContent = messages[messages.length - 1]?.content.toLowerCase() || '';
    return getFallbackResponse(lastMessageContent);
  }
}

/**
 * Get fallback response when AI service is unavailable
 */
function getFallbackResponse(lastMessageContent: string, userContext?: any): AIResponse {
  // Try to use live data first
  if (userContext && userContext.liveData && userContext.liveData.length > 0) {
    return {
      message: `Dựa trên yêu cầu của bạn, tôi đã tìm kiếm trực tiếp và đề xuất các địa điểm nổi bật sau đây. Hãy xem chi tiết các gợi ý bên dưới nhé!`,
      recommendations: userContext.liveData.slice(0, 5),
    };
  }

  // Hardcoded fallbacks
  if (lastMessageContent.includes('đà nẵng') || lastMessageContent.includes('da nang')) {
      return {
        message: 'Đà Nẵng là một điểm đến tuyệt vời! Dựa trên sở thích của bạn, tôi đề xuất các địa điểm sau:',
        recommendations: [
          {
            id: 'rec-1',
            name: 'InterContinental Đà Nẵng',
            type: 'hotel',
            location: 'Đà Nẵng, Việt Nam',
            price: 2500000,
            rating: 4.8,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            description: 'Khách sạn 5 sao với view biển tuyệt đẹp',
          },
          {
            id: 'rec-2',
            name: 'Cầu Rồng Đà Nẵng',
            type: 'attraction',
            location: 'Đà Nẵng, Việt Nam',
            rating: 4.7,
            image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
            description: 'Biểu tượng của thành phố Đà Nẵng',
          },
          {
            id: 'rec-3',
            name: 'Bà Nà Hills',
            type: 'attraction',
            location: 'Đà Nẵng, Việt Nam',
            price: 800000,
            rating: 4.9,
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            description: 'Khu du lịch trên núi với cáp treo dài nhất thế giới',
          },
        ],
      };
    }
    
    if (lastMessageContent.includes('hà nội') || lastMessageContent.includes('ha noi') || lastMessageContent.includes('hanoi')) {
      return {
        message: 'Hà Nội - thủ đô nghìn năm văn hiến! Tôi đề xuất các địa điểm sau:',
        recommendations: [
          {
            id: 'rec-4',
            name: 'Lotte Center Hanoi',
            type: 'hotel',
            location: 'Hà Nội, Việt Nam',
            price: 2000000,
            rating: 4.6,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            description: 'Khách sạn 5 sao tại trung tâm Hà Nội',
          },
          {
            id: 'rec-5',
            name: 'Văn Miếu - Quốc Tử Giám',
            type: 'attraction',
            location: 'Hà Nội, Việt Nam',
            price: 30000,
            rating: 4.8,
            image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
            description: 'Di tích lịch sử văn hóa nổi tiếng',
          },
        ],
      };
    }
    
    if (lastMessageContent.includes('phú quốc') || lastMessageContent.includes('phu quoc')) {
      return {
        message: 'Phú Quốc - đảo ngọc xinh đẹp! Tôi đề xuất các địa điểm sau:',
        recommendations: [
          {
            id: 'rec-6',
            name: 'JW Marriott Phú Quốc',
            type: 'hotel',
            location: 'Phú Quốc, Việt Nam',
            price: 5000000,
            rating: 4.9,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            description: 'Resort 5 sao sang trọng bên bờ biển',
          },
          {
            id: 'rec-7',
            name: 'Bãi Sao',
            type: 'attraction',
            location: 'Phú Quốc, Việt Nam',
            rating: 4.7,
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            description: 'Bãi biển đẹp với cát trắng mịn',
          },
        ],
      };
    }

    return {
      message: 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn:\n\n• Tìm khách sạn phù hợp\n• Lập kế hoạch chuyến đi\n• Gợi ý điểm tham quan\n• Tìm nhà hàng ngon\n\nHãy cho tôi biết bạn muốn đi đâu hoặc cần tư vấn gì nhé!',
      recommendations: [],
    };
}

/**
 * Extract recommendations from AI text response
 * This is a simple parser - can be improved with better NLP
 */
function extractRecommendationsFromText(text: string): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  
  // Improved pattern matching for recommendations
  const lowerText = text.toLowerCase();
  
  // Extract destination from text
  const destinationPattern = /(?:ở|tại|đến|tới)\s+([A-Za-zÀ-ỹ\s]+?)(?:\s|,|\.|$)/gi;
  const destinationMatch = destinationPattern.exec(text);
  const location = destinationMatch ? destinationMatch[1].trim() : 'Việt Nam';
  
  // Look for hotel mentions with better patterns
  const hotelPatterns = [
    /(?:khách sạn|hotel|resort)\s+([A-Za-zÀ-ỹ0-9\s&]+?)(?:\s|,|\.|$)/gi,
    /([A-Za-zÀ-ỹ\s]+)\s+(?:là|khách sạn|hotel|resort)/gi,
  ];
  
  for (const pattern of hotelPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 50) {
        recommendations.push({
          id: `rec-${Date.now()}-${recommendations.length}`,
          name: name,
          type: 'hotel',
          location: location,
          rating: 4.5,
          price: undefined,
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        });
      }
    }
  }
  
  // Look for attraction mentions
  const attractionPatterns = [
    /(?:điểm tham quan|attraction|thắng cảnh|di tích|bảo tàng|chùa|nhà thờ)\s+([A-Za-zÀ-ỹ\s]+?)(?:\s|,|\.|$)/gi,
    /([A-Za-zÀ-ỹ\s]+)\s+(?:là|điểm tham quan|thắng cảnh)/gi,
  ];
  
  for (const pattern of attractionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 50) {
        recommendations.push({
          id: `rec-${Date.now()}-${recommendations.length}`,
          name: name,
          type: 'attraction',
          location: location,
          rating: 4.5,
          image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
        });
      }
    }
  }
  
  // Look for restaurant mentions
  const restaurantPatterns = [
    /(?:nhà hàng|restaurant|quán|cửa hàng)\s+([A-Za-zÀ-ỹ\s]+?)(?:\s|,|\.|$)/gi,
    /([A-Za-zÀ-ỹ\s]+)\s+(?:là|nhà hàng|restaurant)/gi,
  ];
  
  for (const pattern of restaurantPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 50) {
        recommendations.push({
          id: `rec-${Date.now()}-${recommendations.length}`,
          name: name,
          type: 'restaurant',
          location: location,
          rating: 4.5,
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        });
      }
    }
  }
  
  // Remove duplicates based on name
  const uniqueRecommendations = recommendations.filter((rec, index, self) =>
    index === self.findIndex((r) => r.name.toLowerCase() === rec.name.toLowerCase())
  );
  
  return uniqueRecommendations.slice(0, 6); // Limit to 6 recommendations
}

/**
 * Generate itinerary from AI conversation using Gemini
 */
export async function generateItinerary(
  conversationId: string,
  preferences?: {
    destination?: string;
    duration?: number;
    budget?: number;
  }
): Promise<any> {
  try {
    // Attempt to use global Gemini client if it exists, otherwise it will fallback
    const genAI = (global as any).getGeminiClient?.();
    if (!genAI) throw new Error("Gemini API not available");
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Tạo một lịch trình du lịch chi tiết cho chuyến đi với thông tin sau:
- Điểm đến: ${preferences?.destination || 'Đà Nẵng'}
- Thời gian: ${preferences?.duration || 3} ngày
- Ngân sách: ${preferences?.budget ? preferences.budget.toLocaleString('vi-VN') + ' VND' : 'Không giới hạn'}

Hãy tạo lịch trình theo format JSON:
{
  "destination": "...",
  "duration": ...,
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "id": "act-1",
          "name": "...",
          "type": "hotel|attraction|restaurant|transport",
          "time": "HH:MM",
          "duration": ... (minutes),
          "location": "...",
          "description": "..."
        }
      ]
    }
  ]
}

Chỉ trả về JSON, không có text thêm.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse itinerary JSON:', e);
    }

    // Fallback to default itinerary
    return {
      destination: preferences?.destination || 'Đà Nẵng',
      duration: preferences?.duration || 3,
      days: [
        {
          day: 1,
          date: new Date().toISOString().split('T')[0],
          activities: [
            {
              id: 'act-1',
              name: 'Check-in khách sạn',
              type: 'hotel',
              time: '14:00',
              duration: 60,
            },
          ],
        },
      ],
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    // Fallback to default itinerary
    return {
      destination: preferences?.destination || 'Đà Nẵng',
      duration: preferences?.duration || 3,
      days: [
        {
          day: 1,
          date: new Date().toISOString().split('T')[0],
          activities: [
            {
              id: 'act-1',
              name: 'Check-in khách sạn',
              type: 'hotel',
              time: '14:00',
              duration: 60,
            },
          ],
        },
      ],
    };
  }
}

/**
 * Extract recommendations from AI response
 */
export function extractRecommendations(response: string): AIRecommendation[] {
  // TODO: Implement actual recommendation extraction from AI response
  // For now, return empty array
  return [];
}

