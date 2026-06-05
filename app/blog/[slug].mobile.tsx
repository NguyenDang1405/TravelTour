import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { showToast, showConfirm } from '@/utils/toast';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface BlogDetailMobileProps {
  slug: string;
}

export default function BlogDetailMobile({ slug }: BlogDetailMobileProps) {
  const router = useRouter();
  const { user } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get blog post by slug (getPostBySlug handles both slug and ID)
  const post = useQuery(
    api.blog.getPostBySlug,
    slug ? { slug } : "skip"
  );

  // Mutations
  const deletePost = useMutation(api.blog.deletePost);
  const toggleLike = useMutation(api.blog.toggleLike);
  const incrementViews = useMutation(api.blog.incrementViews);
  const updatePost = useMutation(api.blog.updatePost);
  
  // Actions
  const uploadImageAction = useAction(api.upload.uploadImageToCloudinary);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 0,
    location: '',
    category: 'general' as const,
    tags: [] as string[],
    tagInput: '',
    selectedItem: null as any,
    images: [] as string[],
  });
  
  // Increment views when post is loaded
  useEffect(() => {
    if (post?._id) {
      incrementViews({ postId: post._id }).catch(err => {
        console.error('Failed to increment views:', err);
      });
    }
  }, [post?._id]);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    console.log('🗑️ handleDelete called - post:', post?._id, 'convexUser:', convexUser?._id);
    
    if (!convexUser || !post) {
      showToast.error('Vui lòng đăng nhập để xóa bài đánh giá');
      return;
    }
    
    // Check if user is the owner
    console.log('🔍 Checking ownership - post.userId:', post.userId, 'convexUser._id:', convexUser._id);
    if (post.userId !== convexUser._id) {
      showToast.error('Bạn không có quyền xóa bài đánh giá này');
      return;
    }
    
    // Show confirmation dialog
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa bài đánh giá "${post.title}"?\n\nHành động này không thể hoàn tác.`,
      'Xác nhận xóa'
    );
    
    if (!confirmed) {
      console.log('❌ Delete cancelled by user');
      return;
    }
    
    // User confirmed, proceed with delete
    try {
      console.log('🗑️ Starting delete - postId:', post._id, 'userId:', convexUser._id);
      setIsDeleting(true);
      
      const result = await deletePost({
        postId: post._id,
        userId: convexUser._id,
      });
      
      console.log('✅ Delete successful, result:', result);
      showToast.success('Đã xóa bài đánh giá thành công');
      setTimeout(() => {
        router.push('/(tabs)/blog');
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error deleting post:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      showToast.error(error.message || 'Không thể xóa bài đánh giá. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await toggleLike({ postId: post._id });
    } catch (error: any) {
      showToast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={18}
        color={index < rating ? '#FFB800' : COLORS.textSecondary}
      />
    ));
  };

  const categoryLabels: Record<string, string> = {
    hotel: 'Khách sạn',
    restaurant: 'Nhà hàng',
    attraction: 'Điểm tham quan',
    destination: 'Điểm đến',
    general: 'Chung',
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = convexUser && post.userId === convexUser._id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
        {isOwner ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {}}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Ionicons name="trash" size={20} color={COLORS.error} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Post Header */}
          <View style={styles.postHeader}>
            <View style={styles.authorSection}>
              <Image
                source={{
                  uri: post.author?.avatar || 'https://i.pravatar.cc/150',
                }}
                style={styles.authorAvatar}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author?.name || 'Anonymous'}</Text>
                <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {categoryLabels[post.category] || post.category}
            </Text>
          </View>

          {/* Item Card (if exists) */}
          {post.itemName && (
            <View style={styles.itemCard}>
              {post.itemImage && (
                <Image
                  source={{ uri: post.itemImage }}
                  style={styles.itemCardImage}
                />
              )}
              <View style={styles.itemCardInfo}>
                <Text style={styles.itemCardName}>{post.itemName}</Text>
                {post.itemLocation && (
                  <View style={styles.itemLocationRow}>
                    <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.itemCardLocation}>{post.itemLocation}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Location */}
          {post.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{post.location}</Text>
            </View>
          )}

          {/* Rating */}
          {post.rating && post.rating > 0 && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Đánh giá:</Text>
              <View style={styles.ratingRow}>
                {renderStars(post.rating)}
                <Text style={styles.ratingText}>{post.rating}/5</Text>
              </View>
            </View>
          )}

          {/* Images Gallery */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imagesSection}>
              <Text style={styles.sectionTitle}>Hình ảnh</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesContainer}
              >
                {post.images.map((imageUrl: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.postImage}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>{post.content}</Text>
          </View>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {post.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Footer Stats */}
          <View style={styles.footerStats}>
            <TouchableOpacity
              style={styles.statButton}
              onPress={handleLike}
            >
              <Ionicons
                name={post.likes > 0 ? 'heart' : 'heart-outline'}
                size={24}
                color={post.likes > 0 ? COLORS.error : COLORS.textSecondary}
              />
              <Text style={styles.statText}>{post.likes || 0}</Text>
            </TouchableOpacity>
            <View style={styles.statButton}>
              <Ionicons name="eye-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{post.views || 0}</Text>
            </View>
            <View style={styles.statButton}>
              <Ionicons name="time-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statText}>
                {Math.ceil(post.content.length / 200)} phút đọc
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  editButton: {
    padding: SPACING.xs,
    width: 40,
    alignItems: 'center',
  },
  deleteButton: {
    padding: SPACING.xs,
    width: 40,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  postHeader: {
    marginBottom: SPACING.md,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  authorAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  postDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  categoryBadgeText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primaryDark,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemCardImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  itemCardInfo: {
    flex: 1,
  },
  itemCardName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  itemLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  itemCardLocation: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
  },
  ratingLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ratingText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  imagesSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  imagesContainer: {
    gap: SPACING.md,
  },
  postImage: {
    width: 280,
    height: 200,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
  },
  contentSection: {
    marginBottom: SPACING.xl,
  },
  contentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 26,
    fontSize: 16,
  },
  tagsSection: {
    marginBottom: SPACING.xl,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  tagText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SPACING.xl,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    maxHeight: 500,
    padding: SPACING.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  categorySelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryOptionText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  categoryOptionTextActive: {
    color: COLORS.textInverse,
  },
  ratingInput: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  uploadButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  imagesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  imagePreviewItem: {
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
  },
  selectedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  selectedItemImage: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  selectedItemLocation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  removeItemButton: {
    padding: SPACING.xs,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tagInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
  },
  addTagButton: {
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeTagButton: {
    padding: SPACING.xs / 2,
  },
  cancelButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  submitButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
});

