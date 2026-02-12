import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newChatButton} onPress={onNewChat} activeOpacity={0.7}>
        <Ionicons name="add-circle" size={20} color={COLORS.white} />
        <Text style={styles.newChatText}>Cuộc trò chuyện mới</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={[
                styles.conversationItem,
                selectedId === conversation.id && styles.selectedConversation,
              ]}
              onPress={() => onSelect(conversation.id)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.surfaceLight,
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
  scrollView: {
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
  selectedConversation: {
    backgroundColor: COLORS.surfaceLight,
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
});

