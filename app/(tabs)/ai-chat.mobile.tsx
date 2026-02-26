import ChatMessage from '@/components/ai/chat-message';
import QuickActions from '@/components/ai/quick-actions';
import QuickSuggestions from '@/components/ai/quick-suggestions';
import RecommendationsList from '@/components/ai/recommendations-list';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AIChatMobileProps {
  user: any;
  convexUser: any;
  isSignedIn: boolean;
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

export default function AIChatMobile({ user, convexUser }: AIChatMobileProps) {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<Id<'aiConversations'> | null>(null);
  const [selectedRecForTrip, setSelectedRecForTrip] = useState<Recommendation | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Convex hooks
  const sendMessage = useAction(api.aiActions.sendMessage);
  const createConversation = useMutation(api.ai.createConversation);
  const updateItinerary = useMutation(api.trips.updateItinerary);
  const createTrip = useMutation(api.trips.createTrip);
  const createBooking = useMutation(api.bookings.createBooking);
  const generateItinerary = useAction(api.aiActions.generateItineraryFromConversation);
  
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

  // Load messages from current conversation
  useEffect(() => {
    if (currentConversation) {
      const transformedMessages: Message[] = currentConversation.messages.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }));
      setMessages(transformedMessages);
    } else if (!currentConversationId && messages.length === 0) {
      // Initial welcome message
      setMessages([
        {
          id: 'welcome',
          text: 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn lập kế hoạch chuyến đi, tìm khách sạn, điểm tham quan và nhiều hơn nữa. Bạn muốn tìm hiểu điều gì?',
          isUser: false,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentConversation, currentConversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      return;
    }

    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để sử dụng AI chat');
      return;
    }

    if (!convexUser?._id) {
      if (convexUser === null) {
        // User đang được tạo tự động
        Alert.alert('Đang xử lý...', 'Đang tạo tài khoản của bạn. Vui lòng đợi vài giây rồi thử lại.');
        return;
      } else if (convexUser === undefined) {
        // Đang loading
        Alert.alert('Đang tải...', 'Đang tải thông tin tài khoản. Vui lòng đợi...');
        return;
      } else {
        Alert.alert('Lỗi', 'Không thể tìm thấy tài khoản. Vui lòng đăng nhập lại.');
        return;
      }
    }

    const messageText = inputText.trim();
    const messageId = `msg-${Date.now()}`;
    
    // Clear input immediately
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
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createConversation({
          userId: convexUser._id as Id<'users'>,
          title: messageText.substring(0, 50),
        });
        setCurrentConversationId(conversationId);
      }

      // Send message to AI
      const response = await sendMessage({
        conversationId,
        message: messageText,
        userId: convexUser._id as Id<'users'>,
      });

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

      setMessages((prev) => [...prev, aiMessage]);
      
      // Scroll to show AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `${messageId}-error`,
        text: `Xin lỗi, đã xảy ra lỗi: ${error.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Scroll to show error message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      Alert.alert('Lỗi', error.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsTyping(false);
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

  const handleNewChat = () => {
    setShowConversations(false);
    setCurrentConversationId(null);
    setMessages([
      {
        id: 'welcome',
        text: 'Xin chào! Tôi là trợ lý AI du lịch của bạn. Tôi có thể giúp bạn lập kế hoạch chuyến đi, tìm khách sạn, điểm tham quan và nhiều hơn nữa. Bạn muốn tìm hiểu điều gì?',
        isUser: false,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId as Id<'aiConversations'>);
    setShowConversations(false);
  };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowConversations(true)}
        >
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Ionicons name="sparkles" size={24} color={COLORS.primary} />
          <Text style={styles.headerTitleText}>AI Travel Assistant</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <View style={styles.chatArea}>
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
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View key={message.id}>
              <ChatMessage
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
              {message.recommendations && message.recommendations.length > 0 && (
                <RecommendationsList
                  recommendations={message.recommendations}
                  onPress={(rec) => router.push(`/item-details?id=${rec.id}&type=${rec.type}`)}
                  onAddToTrip={(rec) => handleAddToTrip(rec)}
                />
              )}
              {message.isUser === false && (
                <QuickActions actions={getQuickActions(message.recommendations)} />
              )}
            </View>
          ))}
          {isTyping && (
            <View style={styles.typingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.typingText}>AI đang suy nghĩ...</Text>
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
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* Conversations Modal */}
      <Modal
        visible={showConversations}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConversations(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cuộc trò chuyện</Text>
            <TouchableOpacity
              onPress={() => setShowConversations(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.newChatButton}
            onPress={handleNewChat}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.white} />
            <Text style={styles.newChatText}>Cuộc trò chuyện mới</Text>
          </TouchableOpacity>

          <ScrollView style={styles.conversationsList}>
            {conversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
              </View>
            ) : (
              conversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={styles.conversationItem}
                  onPress={() => handleSelectConversation(conversation.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.conversationContent}>
                    <Text style={styles.conversationTitle} numberOfLines={1}>
                      {conversation.title}
                    </Text>
                    <Text style={styles.conversationMessage} numberOfLines={1}>
                      {conversation.lastMessage}
                    </Text>
                    <Text style={styles.conversationTime}>{conversation.timestamp}</Text>
                  </View>
                  {conversation.unread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Trip Selection Modal */}
      <Modal
        visible={!!selectedRecForTrip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRecForTrip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitleContent}>Thêm lịch trình</Text>
              <TouchableOpacity onPress={() => setSelectedRecForTrip(null)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Chọn chuyến đi để thêm "{selectedRecForTrip?.name}"
            </Text>
            
            <ScrollView style={styles.modalScroll}>
              {userTrips?.map((trip) => (
                <TouchableOpacity 
                  key={trip._id} 
                  style={styles.modalTripItem}
                  onPress={async () => {
                    if (!selectedRecForTrip) return;
                    try {
                      setSelectedRecForTrip(null);
                      await addRecommendationToTrip(selectedRecForTrip, trip._id);
                      Alert.alert('Thành công', `Đã thêm "${selectedRecForTrip.name}" vào chuyến đi "${trip.title}"`);
                    } catch (error: any) {
                      console.error('Error adding to trip:', error);
                      Alert.alert('Lỗi', error.message || 'Không thể thêm vào chuyến đi. Vui lòng thử lại.');
                    }
                  }}
                >
                  <Ionicons name="map-outline" size={20} color={COLORS.primary} style={styles.modalTripIcon} />
                  <View style={styles.modalTripInfo}>
                    <Text style={styles.modalTripTitle}>{trip.title}</Text>
                    <Text style={styles.modalTripDest}>{trip.destination}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.modalCreateButton}
              onPress={() => {
                setSelectedRecForTrip(null);
                router.push('/(tabs)/planning');
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
              <Text style={styles.modalCreateText}>Tạo chuyến đi mới</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  chatArea: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  conversationsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    position: 'relative',
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 12,
    right: 16,
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
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleContent: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
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

