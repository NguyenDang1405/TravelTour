import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { showToast, showConfirm } from '@/utils/toast';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface BlogDetailWebProps {
  slug: string;
}

export default function BlogDetailWeb({ slug }: BlogDetailWebProps) {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'blog';
  const { user } = useUser();
  const params = useLocalSearchParams();
  
  // Edit modal state - define early
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
  
  // Extract slug from multiple sources if not provided
  const actualSlug = useMemo(() => {
    if (slug) return slug;
    
    // Try to get from params
    const slugFromParams = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    if (slugFromParams) return slugFromParams;
    
    // Try to get from URL pathname
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const pathParts = window.location.pathname.split('/').filter(p => p);
        const blogIndex = pathParts.indexOf('blog');
        if (blogIndex >= 0 && pathParts[blogIndex + 1]) {
          return pathParts[blogIndex + 1];
        }
      } catch (e) {
        console.error('Error extracting from pathname:', e);
      }
    }
    
    return '';
  }, [slug, params]);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get blog post by slug (getPostBySlug handles both slug and ID)
  const post = useQuery(
    api.blog.getPostBySlug,
    actualSlug ? { slug: actualSlug } : "skip"
  );
  
  // Mutation to increment views
  const incrementViews = useMutation(api.blog.incrementViews);
  
  // Increment views when post is loaded
  useEffect(() => {
    if (post?._id) {
      incrementViews({ postId: post._id }).catch(err => {
        console.error('Failed to increment views:', err);
      });
    }
  }, [post?._id]);
  
  // Mutations
  const deletePost = useMutation(api.blog.deletePost);
  const toggleLike = useMutation(api.blog.toggleLike);
  const updatePost = useMutation(api.blog.updatePost);
  
  // Actions
  const uploadImageAction = useAction(api.upload.uploadImageToCloudinary);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        img {
          max-width: 100%;
          height: auto;
        }
      `;
      document.head.appendChild(style);
      
      // Hide breadcrumb elements that contain "blog/[slug]" or "blog/"
      const hideBreadcrumbs = () => {
        // Find all elements and check their text content
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const elementsToHide = new Set<HTMLElement>();
        let node;
        
        while (node = walker.nextNode()) {
          const text = node.textContent || '';
          if (text.includes('blog/[slug]') || (text.includes('blog/') && text.trim().length < 30)) {
            let parent = node.parentElement;
            // Go up to find the container element (usually a div or nav)
            while (parent && parent !== document.body) {
              const parentText = parent.textContent || '';
              if (parentText.includes('blog/[slug]') || (parentText.includes('blog/') && parentText.trim().length < 50)) {
                elementsToHide.add(parent);
                break;
              }
              parent = parent.parentElement;
            }
          }
        }
        
        // Hide found elements
        elementsToHide.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      };
      
      // Run immediately and after delays to catch dynamically added elements
      hideBreadcrumbs();
      const timeouts = [
        setTimeout(hideBreadcrumbs, 100),
        setTimeout(hideBreadcrumbs, 500),
        setTimeout(hideBreadcrumbs, 1000),
      ];
      
      // Also use MutationObserver to catch dynamically added breadcrumbs
      const observer = new MutationObserver(hideBreadcrumbs);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      return () => {
        document.head.removeChild(style);
        timeouts.forEach(clearTimeout);
        observer.disconnect();
      };
    }
  }, []);

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
        size={20}
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

  // Initialize form data when post is loaded
  useEffect(() => {
    if (post && showEditModal) {
      setFormData({
        title: post.title,
        content: post.content,
        rating: post.rating || 0,
        location: post.location || '',
        category: post.category,
        tags: post.tags || [],
        tagInput: '',
        selectedItem: post.itemId ? {
          id: post.itemId,
          type: post.itemType,
          name: post.itemName,
          image: post.itemImage,
          location: post.itemLocation,
        } : null,
        images: post.images || [],
      });
    }
  }, [post, showEditModal]);

  // Define all handlers before early return
  const handleOpenEdit = () => {
    if (post) {
      setShowEditModal(true);
    }
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: '',
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const handleRemoveItem = () => {
    setFormData({
      ...formData,
      selectedItem: null,
    });
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.style.display = 'none';
        input.onchange = async (event: Event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            setIsUploadingImage(true);
            try {
              const uploadedImages: string[] = [];
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = error => reject(error);
                  reader.readAsDataURL(file);
                });
                const uploadResult = await uploadImageAction({
                  imageData: base64,
                  folder: 'travel-tour/blog',
                  transformation: 'w_1200,h_800,c_fill,q_auto',
                });
                uploadedImages.push(uploadResult.url);
              }
              setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...uploadedImages],
              }));
              showToast.success(`Đã upload ${uploadedImages.length} hình ảnh`);
            } catch (error: any) {
              showToast.error(error.message || 'Không thể upload hình ảnh');
            } finally {
              setIsUploadingImage(false);
            }
          }
        };
        document.body.appendChild(input);
        input.click();
        input.remove();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast.warning('Cần quyền truy cập thư viện ảnh để upload hình ảnh', 'Quyền truy cập');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets) {
          setIsUploadingImage(true);
          try {
            const uploadedImages: string[] = [];
            for (const asset of result.assets) {
              if (asset.uri) {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve(base64String);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                const uploadResult = await uploadImageAction({
                  imageData: base64,
                  folder: 'travel-tour/blog',
                  transformation: 'w_1200,h_800,c_fill,q_auto',
                });
                uploadedImages.push(uploadResult.url);
              }
            }
            setFormData(prev => ({
              ...prev,
              images: [...prev.images, ...uploadedImages],
            }));
            window.alert('Thành công: Đã upload ' + uploadedImages.length + ' hình ảnh');
          } catch (error: any) {
            window.alert('Lỗi: ' + (error.message || 'Không thể upload hình ảnh'));
          } finally {
            setIsUploadingImage(false);
          }
        }
      }
    } catch (error: any) {
      showToast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmitEdit = async () => {
    if (!convexUser || !post) return;

    if (!formData.title.trim()) {
      showToast.warning('Vui lòng nhập tiêu đề');
      return;
    }

    if (!formData.content.trim()) {
      showToast.warning('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData = formData.selectedItem ? {
        itemId: formData.selectedItem.id,
        itemType: formData.selectedItem.type,
        itemName: formData.selectedItem.name,
        itemImage: formData.selectedItem.image,
        itemLocation: formData.selectedItem.location,
      } : {};

      await updatePost({
        postId: post._id,
        title: formData.title,
        content: formData.content,
        rating: formData.rating > 0 ? formData.rating : undefined,
        location: formData.location || undefined,
        category: formData.category,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        ...itemData,
      });
      showToast.success('Đã cập nhật bài đánh giá');
      setShowEditModal(false);
    } catch (error: any) {
      showToast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      </View>
    );
  }

  const isOwner = convexUser && post.userId === convexUser._id;

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity 
            style={styles.logo}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="airplane" size={28} color={COLORS.primary} />
            <Text style={styles.logoText}>TravelTour</Text>
          </TouchableOpacity>
          <View style={styles.navLinks}>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[
                styles.navLinkText,
                (currentRoute as any) === 'index' && styles.navLinkTextActive
              ]}>Trang chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'explore' && styles.navLinkTextActive
              ]}>Khám phá</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/planning')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'planning' && styles.navLinkTextActive
              ]}>Lịch trình</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/ai-chat')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'ai-chat' && styles.navLinkTextActive
              ]}>Travel Assistant</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navLink}
              onPress={() => router.push('/(tabs)/blog')}
            >
              <Text style={[
                styles.navLinkText,
                currentRoute === 'blog' && styles.navLinkTextActive
              ]}>Blog</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity 
            style={styles.profileIconButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {(() => {
              const avatarUrl = convexUser?.avatar || user?.imageUrl;
              return avatarUrl ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={[
                      styles.profileAvatar,
                      currentRoute === 'profile' && { borderColor: COLORS.primary }
                    ]}
                  />
                  {currentRoute === 'profile' && <View style={styles.avatarActiveIndicator} />}
                </View>
              ) : (
                <View style={[
                  styles.profileAvatarPlaceholder,
                  currentRoute === 'profile' && styles.profileAvatarActive
                ]}>
                  <Ionicons 
                    name="person" 
                    size={22} 
                    color={currentRoute === 'profile' ? COLORS.white : COLORS.text} 
                  />
                </View>
              );
            })()}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>

          {/* Post Header */}
          <View style={styles.postHeader}>
            <View style={styles.authorSection}>
              <Image
                source={{
                  uri: post.author?.avatar || 'https://i.pravatar.cc/150',
                }}
                style={styles.authorAvatar}
              />
              <View>
                <Text style={styles.authorName}>{post.author?.name || 'Anonymous'}</Text>
                <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
              </View>
            </View>
            {isOwner && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOpenEdit}
                >
                  <Ionicons name="pencil" size={20} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, isDeleting && styles.actionButtonDisabled]}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={COLORS.error} />
                  ) : (
                    <>
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
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

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa đánh giá</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tiêu đề *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tiêu đề đánh giá"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Danh mục</Text>
                <View style={styles.categorySelect}>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryOption,
                        formData.category === key && styles.categoryOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category: key as any })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === key && styles.categoryOptionTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.selectedItem && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Địa điểm đã chọn</Text>
                  <View style={styles.selectedItemCard}>
                    {formData.selectedItem.image && (
                      <Image
                        source={{ uri: formData.selectedItem.image }}
                        style={styles.selectedItemImage}
                      />
                    )}
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemName}>{formData.selectedItem.name}</Text>
                      <Text style={styles.selectedItemLocation}>{formData.selectedItem.location}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveItem}
                      style={styles.removeItemButton}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Địa điểm (tự do)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Đà Nẵng, Phú Quốc..."
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Đánh giá (sao)</Text>
                <View style={styles.ratingInput}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setFormData({ ...formData, rating: star })}
                    >
                      <Ionicons
                        name={star <= formData.rating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= formData.rating ? '#FFB800' : COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Hình ảnh</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>Chọn hình ảnh</Text>
                    </>
                  )}
                </TouchableOpacity>
                {formData.images.length > 0 && (
                  <View style={styles.imagesPreview}>
                    {formData.images.map((imageUrl: string, index: number) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nội dung đánh giá *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  value={formData.content}
                  onChangeText={(text) => setFormData({ ...formData, content: text })}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tags</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Nhập tag và nhấn Enter"
                    value={formData.tagInput}
                    onChangeText={(text) => setFormData({ ...formData, tagInput: text })}
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity
                    style={styles.addTagButton}
                    onPress={handleAddTag}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                {formData.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {formData.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveTag(tag)}
                          style={styles.removeTagButton}
                        >
                          <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                ) : (
                  <Text style={styles.submitButtonText}>Cập nhật</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
    flex: 1,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: '800',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  navLinkText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    ...Platform.select({
      web: {
        transition: 'color 0.2s ease',
        ':hover': {
          color: COLORS.primary,
        },
      },
    }),
  },
  navLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  profileIconButton: {
    padding: SPACING.xs,
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  avatarActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  profileAvatarActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    padding: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: SPACING.sm,
  },
  backButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  authorAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
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
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  deleteButton: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.error,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  deleteButtonText: {
    color: COLORS.error,
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
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemCardImage: {
    width: 100,
    height: 100,
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
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
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
    width: 300,
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
    lineHeight: 28,
    fontSize: 18,
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
    gap: SPACING.xl,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    width: '100%',
    maxWidth: 800,
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
    maxHeight: 600,
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
    minHeight: 150,
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
    width: 100,
    height: 100,
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
    width: 60,
    height: 60,
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

