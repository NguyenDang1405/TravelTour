import ChatMessage from '@/components/ai/chat-message';
import ConversationList from '@/components/ai/conversation-list';
import QuickActions from '@/components/ai/quick-actions';
import QuickSuggestions from '@/components/ai/quick-suggestions';
import RecommendationsList from '@/components/ai/recommendations-list';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import TripSelectorModal from '@/components/trip/trip-selector-modal';

interface AIChatWebProps {
  user: any; // Clerk user object
  convexUser: any;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  recommendations?: Recommendation[];
}

interface Recommendation {
  id: string;
  name: string;
  type: 'hotel' | 'attraction' | 'restaurant' | 'flight' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
}

import { useUser } from '@clerk/clerk-expo';

export default function AIChatWeb({ user: userProp, convexUser: convexUserProp }: AIChatWebProps) {
  const { user: clerkUser } = useUser();
  const finalUser = userProp || clerkUser;

  const convexUserFromQuery = useQuery(
    api.users.getUser,
    finalUser?.id ? { clerkId: finalUser.id } : 'skip'
  );

  const user = finalUser;
  const convexUser = convexUserFromQuery || convexUserProp;

  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<Id<'aiConversations'> | null>(null);
  const [selectedRecForTrip, setSelectedRecForTrip] = useState<Recommendation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Debug logging for props
  useEffect(() => {
    console.log('🔍 AIChatWeb - Props received:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.emailAddresses?.[0]?.emailAddress,
      hasConvexUser: !!convexUser,
      convexUserId: convexUser?._id,
      convexUserState: convexUser === null ? 'null' : convexUser === undefined ? 'undefined' : 'exists',
    });
  }, [user, convexUser]);
  
  // Initialize welcome message when user logs in (only once, when component first mounts)
  useEffect(() => {
    if (convexUser?._id && messages.length === 0 && !currentConversationId) {
      console.log('🎉 User logged in, showing welcome message');
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          text: 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn:\n\n• Lập kế hoạch chuyến đi\n• Tìm khách sạn phù hợp\n• Gợi ý điểm tham quan\n• Tìm nhà hàng ngon\n• Tư vấn dựa trên ngân sách và sở thích\n\nBạn muốn tìm hiểu điều gì?',
          isUser: false,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [convexUser?._id, currentConversationId, messages.length]);

  // Check if user is authenticated
  useEffect(() => {
    if (user && !convexUser?._id) {
      if (convexUser === null) {
        // User đang được tạo tự động
        console.log('🔄 Đang tạo Convex user tự động...');
      } else if (convexUser === undefined) {
        // Đang loading
        console.log('⏳ Đang tải thông tin user...');
      } else {
        console.warn('⚠️ Convex user not found. User may need to log in.');
      }
    } else if (convexUser?._id) {
      console.log('✅ Convex user authenticated:', convexUser._id);
    }
    
    // Log warning if user is null but we're in tabs (should be signed in)
    if (!user && typeof window !== 'undefined') {
      console.warn('⚠️ User is null but in tabs. This might indicate a Clerk loading issue.');
    }
  }, [convexUser, user]);

  // Convex hooks
  const sendMessage = useAction(api.aiActions.sendMessage);
  const sendMessageWithoutAuth = useAction(api.aiActions.sendMessageWithoutAuth);
  const createConversation = useMutation(api.ai.createConversation);
  const updateItinerary = useMutation(api.trips.updateItinerary);
  const createBooking = useMutation(api.bookings.createBooking);
  
  // Get user trips for adding recommendations
  const userTrips = useQuery(api.trips.getUserTrips, 
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );
  const getUserConversations = useQuery(
    api.ai.getUserConversations,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );
  const currentConversation = useQuery(
    api.ai.getConversation,
    currentConversationId ? { conversationId: currentConversationId } : 'skip'
  );
  
  // Get quick suggestions from API
  const quickSuggestionsData = useQuery(
    api.ai.getQuickSuggestions,
    convexUser?._id ? { userId: convexUser._id } : { userId: undefined }
  );

  // Transform conversations for UI
  const conversations: Conversation[] = (getUserConversations || []).map((conv: any) => ({
    id: conv._id,
    title: conv.title || conv.messages[0]?.text?.substring(0, 30) || 'Cuộc trò chuyện mới',
    lastMessage: conv.messages[conv.messages.length - 1]?.text || '',
    timestamp: new Date(conv.updatedAt).toLocaleDateString('vi-VN'),
    unread: false,
  }));

  // Use quick suggestions from API, fallback to default if loading
  const quickSuggestions = quickSuggestionsData || [
    'Gợi ý điểm đến cho kỳ nghỉ 3 ngày ở Đà Nẵng',
    'Lập kế hoạch du lịch Phú Quốc',
    'Khách sạn tốt ở Hà Nội giá dưới 2 triệu',
    'Điểm tham quan nổi tiếng ở Sài Gòn',
  ];

  // Load messages from current conversation (real-time updates)
  useEffect(() => {
    if (currentConversation && currentConversation.messages) {
      console.log('📥 Loading conversation messages:', currentConversation._id);
      const transformedMessages: Message[] = currentConversation.messages.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        recommendations: (msg.recommendations || []).map((rec: any) => ({
          id: rec.id || rec._id || `rec-${Date.now()}-${Math.random()}`,
          name: rec.name,
          type: rec.type,
          location: rec.location || '',
          price: rec.price,
          rating: rec.rating,
          image: rec.image,
          description: rec.description,
        })),
      }));
      setMessages(transformedMessages);
      console.log('✅ Loaded', transformedMessages.length, 'messages with recommendations');
    } else if (!currentConversationId) {
      // Show welcome message only if no conversation and no messages exist yet
      // Use functional update to check current state
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) {
          const welcomeText = convexUser?._id 
            ? 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn:\n\n• Lập kế hoạch chuyến đi\n• Tìm khách sạn phù hợp\n• Gợi ý điểm tham quan\n• Tìm nhà hàng ngon\n• Tư vấn dựa trên ngân sách và sở thích\n\nBạn muốn tìm hiểu điều gì?'
            : 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn:\n\n• Lập kế hoạch chuyến đi\n• Tìm khách sạn phù hợp\n• Gợi ý điểm tham quan\n• Tìm nhà hàng ngon\n\nBạn có thể chat với tôi ngay bây giờ! Đăng nhập để lưu lịch sử trò chuyện.';
          
          return [
            {
              id: `welcome-${Date.now()}`,
              text: welcomeText,
              isUser: false,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        }
        return prevMessages; // Don't change if messages already exist
      });
    }
    // Don't reset messages if user already has messages
    // This allows chat without login to work properly
  }, [currentConversation, currentConversationId, convexUser?._id]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  // Remove input focus outline on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.primary} !important;
          box-shadow: 0 0 0 2px ${COLORS.primary}20 !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const handleSendMessage = async () => {
    console.log('🔵 handleSendMessage called');
    console.log('🔵 inputText:', inputText);
    console.log('🔵 user:', user ? `exists (${user.id}, ${user.emailAddresses?.[0]?.emailAddress})` : 'null');
    console.log('🔵 convexUser:', convexUser ? (convexUser._id ? `exists (${convexUser._id})` : 'no _id') : convexUser === null ? 'null (not found)' : 'undefined (loading)');
    
    if (!inputText.trim()) {
      console.log('⚠️ Empty input, ignoring send');
      return;
    }

    // Check if user is logged in but convexUser is still loading or being created
    if (user && user.id && !convexUser?._id) {
      if (convexUser === null) {
        // User đang được tạo tự động - đợi một chút rồi thử lại
        console.log('⏳ Convex user is being created...');
        Alert.alert(
          'Đang xử lý...', 
          'Đang tạo tài khoản của bạn. Vui lòng đợi vài giây rồi thử lại.',
          [{ text: 'OK' }]
        );
        return;
      } else if (convexUser === undefined) {
        // Đang loading - đợi một chút
        console.log('⏳ Convex user is loading...');
        Alert.alert(
          'Đang tải...', 
          'Đang tải thông tin tài khoản. Vui lòng đợi...',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const messageText = inputText.trim();
    const messageId = `msg-${Date.now()}`;
    
    // Clear input immediately for better UX
    setInputText('');
    
    // Add user message to UI immediately (before API call)
    const userMessage: Message = {
      id: `${messageId}-user`,
      text: messageText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Scroll to show user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Show typing indicator
    setIsTyping(true);

    try {
      // If user is not logged in, use sendMessageWithoutAuth
      if (!user || !user.id || !convexUser?._id) {
        console.log('⚠️ User not logged in, using sendMessageWithoutAuth');
        
        // Build conversation history from current messages
        // Filter out welcome messages (those starting with "welcome-")
        const conversationHistory = messages
          .filter(msg => !msg.id.startsWith('welcome-')) // Exclude welcome messages
          .slice(-10) // Last 10 messages for context
          .map(msg => ({
            role: msg.isUser ? ("user" as const) : ("assistant" as const),
            content: msg.text,
          }));
        
        console.log('📝 Conversation history for AI:', conversationHistory.length, 'messages');

        // Call AI service without authentication
        const response = await sendMessageWithoutAuth({
          message: messageText,
          conversationHistory,
        });

        console.log('AI response received (without auth):', response);

        // Add AI response to local state
        const aiMessage: Message = {
          id: `${messageId}-ai`,
          text: response.message.text,
          isUser: false,
          timestamp: new Date(response.message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          recommendations: response.recommendations?.map((rec: any) => ({
            id: rec.id || `rec-${Date.now()}-${Math.random()}`,
            name: rec.name,
            type: rec.type,
            location: rec.location || '',
            price: rec.price,
            rating: rec.rating,
            image: rec.image,
            description: rec.description,
          })),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return;
      }

      console.log('Creating/getting conversation...');
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        console.log('Creating new conversation...');
        conversationId = await createConversation({
          userId: convexUser._id as Id<'users'>,
          title: messageText.substring(0, 50),
        });
        console.log('Conversation created:', conversationId);
        setCurrentConversationId(conversationId);
      } else {
        console.log('Using existing conversation:', conversationId);
      }

      console.log('Sending message to AI...');
      const response = await sendMessage({
        conversationId,
        message: messageText,
        userId: convexUser._id as Id<'users'>,
      });

      console.log('AI response received:', response);

      // Add AI response to local state
      const aiMessage: Message = {
        id: `${messageId}-ai`,
        text: response.message.text,
        isUser: false,
        timestamp: new Date(response.message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        recommendations: response.recommendations?.map((rec: any) => ({
          id: rec.id,
          name: rec.name,
          type: rec.type,
          location: rec.location || '',
          price: rec.price,
          rating: rec.rating,
          image: rec.image,
          description: rec.description,
        })),
      };

      // Add AI response after user message
      setMessages((prev) => [...prev, aiMessage]);
      
      // Scroll to show AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        fullError: error,
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `${messageId}-error`,
        text: `Xin lỗi, đã xảy ra lỗi: ${error?.message || error?.toString() || 'Không thể gửi tin nhắn. Vui lòng thử lại.'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Scroll to show error message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      Alert.alert('Lỗi', error?.message || error?.toString() || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsTyping(false);
      console.log('🏁 handleSendMessage finished');
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handleAddToTrip = async (recommendation: Recommendation) => {
    if (!convexUser?._id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm vào chuyến đi');
      return;
    }

    setSelectedRecForTrip(recommendation);
  };

  const addRecommendationToTrip = async (recommendation: Recommendation, tripId: Id<'trips'>) => {
    if (!convexUser?._id) throw new Error('Vui lòng đăng nhập');

    // Get current trip
    const trip = userTrips?.find(t => t._id === tripId);
    if (!trip) {
      throw new Error('Không tìm thấy chuyến đi');
    }

    // Map item type
    const itemTypeMap: Record<string, 'hotel' | 'flight' | 'attraction' | 'restaurant' | 'transport'> = {
      'hotel': 'hotel',
      'flight': 'flight',
      'attraction': 'attraction',
      'restaurant': 'restaurant',
    };
    const bookingType = itemTypeMap[recommendation.type] || 'attraction';

    const locationStr = recommendation.location || 'N/A';
    const locationParts = locationStr.split(',');
    const locationName = locationParts[0]?.trim() || locationStr;

    const bookingData: any = {
      tripId,
      userId: convexUser._id,
      type: bookingType,
      provider: 'ai',
      externalId: String(recommendation.id || Date.now()),
      name: recommendation.name || 'Unnamed',
      description: recommendation.description || undefined,
      location: {
        name: locationName,
        address: locationStr,
        coordinates: { lat: 0, lng: 0 },
      },
      price: recommendation.price || 0,
      currency: 'VND',
      image: recommendation.image || undefined,
    };

    await createBooking(bookingData);
  };

  const handleBook = (recommendation: Recommendation) => {
    // Navigate to booking screen with recommendation data
    const params = new URLSearchParams({
      name: recommendation.name,
      type: recommendation.type,
      location: recommendation.location,
      price: recommendation.price?.toString() || '',
      rating: recommendation.rating?.toString() || '',
      image: recommendation.image || '',
      description: recommendation.description || '',
    });
    
    router.push(`/booking?${params.toString()}`);
  };

  const handleSelectConversation = (conversationId: string) => {
    console.log('📂 Selecting conversation:', conversationId);
    setCurrentConversationId(conversationId as Id<'aiConversations'>);
    // Messages will be loaded from currentConversation query via useEffect
  };

  const handleNewChat = async () => {
    console.log('🆕 Creating new conversation...');
    
    if (!convexUser?._id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tạo cuộc trò chuyện mới');
      return;
    }

    try {
      // Tạo conversation mới trong Convex
      const newConversationId = await createConversation({
        userId: convexUser._id as Id<'users'>,
        title: 'Cuộc trò chuyện mới',
      });
      
      console.log('✅ New conversation created:', newConversationId);
      
      // Reset state
      setCurrentConversationId(newConversationId);
      setInputText('');
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          text: 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn:\n\n• Lập kế hoạch chuyến đi\n• Tìm khách sạn phù hợp\n• Gợi ý điểm tham quan\n• Tìm nhà hàng ngon\n• Tư vấn dựa trên ngân sách và sở thích\n\nBạn muốn tìm hiểu điều gì?',
          isUser: false,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      
      // Scroll to top
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error creating new conversation:', error);
      Alert.alert('Lỗi', 'Không thể tạo cuộc trò chuyện mới. Vui lòng thử lại.');
    }
  };

  // Hook for generating itinerary
  const generateItinerary = useAction(api.aiActions.generateItineraryFromConversation);
  
  // Generate quick actions based on message recommendations
  const getQuickActions = (recommendations?: Recommendation[]) => {
    const actions = [];
    
    if (currentConversationId && convexUser?._id) {
      actions.push({
        id: '2',
        label: 'Tạo lịch trình',
        icon: 'calendar-outline' as const,
        onPress: async () => {
          try {
            await generateItinerary({
              conversationId: currentConversationId,
            });
            Alert.alert('Thành công', 'Lịch trình đã được tạo. Kiểm tra trong tab Planning.');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể tạo lịch trình.');
          }
        },
      });
    }
    
    // Default actions if no recommendations
    if (actions.length === 0) {
      actions.push(
        {
          id: '1',
          label: 'Gợi ý điểm đến',
          icon: 'location-outline' as const,
          onPress: () => setInputText('Gợi ý điểm đến du lịch phù hợp với tôi'),
        },
        {
          id: '2',
          label: 'Tìm khách sạn',
          icon: 'bed-outline' as const,
          onPress: () => setInputText('Tìm khách sạn tốt giá rẻ'),
        },
        {
          id: '3',
          label: 'Lập kế hoạch',
          icon: 'calendar-outline' as const,
          onPress: () => setInputText('Lập kế hoạch chuyến đi cho tôi'),
        }
      );
    }
    
    return actions;
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <View style={styles.topNavContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topNavTitle}>
            <Ionicons name="sparkles" size={24} color={COLORS.primary} />
            <Text style={styles.topNavTitleText}>AI Travel Assistant</Text>
          </View>
          <View style={styles.topNavActions}>
            <TouchableOpacity 
              style={styles.topNavButton}
              onPress={handleNewChat}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.topNavButton}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Conversation List Sidebar */}
        {convexUser?._id && showHistory && (
          <View style={Platform.OS === 'web' ? { position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10, backgroundColor: COLORS.surface, elevation: 5, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10 } : {}}>
            <ConversationList
              conversations={conversations}
              selectedId={currentConversationId || undefined}
              onSelect={(id) => {
                handleSelectConversation(id);
                if (Platform.OS !== 'web' || window.innerWidth < 768) setShowHistory(false);
              }}
              onNewChat={() => {
                handleNewChat();
                if (Platform.OS !== 'web' || window.innerWidth < 768) setShowHistory(false);
              }}
            />
          </View>
        )}

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {/* Banner removed per user request */}
          {messages.length === 1 && messages[0].isUser === false && (
            <QuickSuggestions
              suggestions={quickSuggestions}
              onSelect={handleSelectSuggestion}
            />
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={true}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateText}>Chưa có tin nhắn nào</Text>
                <Text style={styles.emptyStateSubtext}>Bắt đầu cuộc trò chuyện với AI bằng cách gửi tin nhắn</Text>
              </View>
            ) : (
              messages.map((message) => (
                <View key={message.id} style={styles.messageWrapper}>
                  <ChatMessage
                    message={message.text}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                  />
                  {message.recommendations && message.recommendations.length > 0 && (
                    <RecommendationsList
                      recommendations={message.recommendations}
                      onPress={(rec) => {
                        const params = new URLSearchParams({
                          id: rec.id,
                          type: rec.type,
                          name: rec.name || '',
                          location: rec.location || '',
                          price: rec.price?.toString() || '',
                          rating: rec.rating?.toString() || '',
                          image: rec.image || '',
                          description: rec.description || '',
                          isAi: 'true',
                        });
                        router.push(`/item-details?${params.toString()}`);
                      }}
                      onAddToTrip={(rec) => handleAddToTrip(rec)}
                    />
                  )}
                  {message.isUser === false && (
                    <QuickActions actions={getQuickActions(message.recommendations)} />
                  )}
                </View>
              ))
            )}
            {isTyping && (
              <View style={styles.typingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>AI đang tìm kiếm và xử lý yêu cầu của bạn...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập câu hỏi của bạn..."
              placeholderTextColor={COLORS.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
              editable={!isTyping}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
              onPress={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 Send button clicked!');
                console.log('🟢 inputText:', inputText);
                console.log('🟢 isTyping:', isTyping);
                console.log('🟢 inputText.trim():', inputText.trim());
                if (!inputText.trim()) {
                  console.warn('⚠️ Button clicked but input is empty');
                  return;
                }
                if (isTyping) {
                  console.warn('⚠️ Button clicked but already typing');
                  return;
                }
                handleSendMessage();
              }}
              disabled={!inputText.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? COLORS.white : COLORS.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Trip Selector Modal */}
      <TripSelectorModal
        visible={!!selectedRecForTrip}
        onClose={() => setSelectedRecForTrip(null)}
        onSelectTrip={async (tripId) => {
          if (!selectedRecForTrip) return;
          try {
            await addRecommendationToTrip(selectedRecForTrip, tripId);
            Alert.alert('Thành công', `Đã thêm "${selectedRecForTrip.name}" vào chuyến đi`);
            setSelectedRecForTrip(null);
          } catch (error: any) {
            console.error('Error adding to trip:', error);
            Alert.alert('Lỗi', error.message || 'Không thể thêm vào chuyến đi. Vui lòng thử lại.');
          }
        }}
        title="Chọn chuyến đi để thêm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  topNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
  },
  topNavTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  topNavActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topNavButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  chatArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
    minHeight: '100%',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 24,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loginBanner: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loginBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  loginBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalTripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  modalTripIcon: {
    marginRight: 12,
  },
  modalTripInfo: {
    flex: 1,
  },
  modalTripTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalTripDest: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  modalCreateText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

