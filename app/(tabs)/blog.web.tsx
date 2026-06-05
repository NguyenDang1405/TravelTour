import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { showToast, showConfirm } from '@/utils/toast';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function BlogWeb() {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1] || 'blog';
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const blogPosts = useQuery(
    api.blog.getPublishedPosts,
    { category: selectedCategory as any }
  );

  // Get user's posts
  const userPosts = useQuery(
    api.blog.getUserPosts,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Mutations
  const createPost = useMutation(api.blog.createPost);
  const updatePost = useMutation(api.blog.updatePost);
  const deletePost = useMutation(api.blog.deletePost);
  const toggleLike = useMutation(api.blog.toggleLike);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 0,
    location: '',
    category: 'general' as any,
    tags: [] as string[],
    tagInput: '',
    selectedItem: null as any, // { id, type, name, image, location }
    images: [] as string[], // Array of image URLs
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [itemSearchType, setItemSearchType] = useState<'hotel' | 'restaurant' | 'destination'>('hotel');

  // Actions for searching items
  const unifiedSearchAction = useAction(api.api.unifiedSearch);
  const searchHotelsAction = useAction(api.api.searchHotels);
  const searchRestaurantsAction = useAction(api.api.searchRestaurants);
  const uploadImageAction = useAction(api.upload.uploadImageToCloudinary);

  // Handle edit params from URL
  const params = useLocalSearchParams<{ edit?: string }>();
  
  useEffect(() => {
    // Check if there's an edit param from URL
    if (params.edit && blogPosts && !editingPost) {
      const postToEdit = blogPosts.find((p: any) => p._id === params.edit);
      if (postToEdit) {
        setFormData({
          title: postToEdit.title,
          content: postToEdit.content,
          rating: postToEdit.rating || 0,
          location: postToEdit.location || '',
          category: postToEdit.category,
          tags: postToEdit.tags || [],
          tagInput: '',
          selectedItem: postToEdit.itemId ? {
            id: postToEdit.itemId,
            type: postToEdit.itemType,
            name: postToEdit.itemName,
            image: postToEdit.itemImage,
            location: postToEdit.itemLocation,
          } : null,
          images: postToEdit.images || [],
        });
        setEditingPost(postToEdit);
        setShowCreateModal(true);
      }
    }
  }, [params.edit, blogPosts, editingPost]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus {
          outline: none !important;
          border-color: ${COLORS.primary} !important;
          box-shadow: 0 0 0 3px ${COLORS.primaryLight}33 !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      content: '',
      rating: 0,
      location: '',
      category: 'general',
      tags: [],
      tagInput: '',
      selectedItem: null,
      images: [],
    });
    setEditingPost(null);
    setShowCreateModal(true);
  };

  const handleEdit = (post: any) => {
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
    setEditingPost(post);
    setShowCreateModal(true);
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

  const handleSearchItems = async () => {
    if (!itemSearchQuery.trim()) {
      showToast.warning('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    setIsSearchingItems(true);
    try {
      let results: any[] = [];

      if (itemSearchType === 'hotel') {
        const searchResult = await searchHotelsAction({
          cityName: itemSearchQuery,
        });
        results = (searchResult || []).map((item: any) => ({
          id: item.id,
          type: 'hotel',
          name: item.name,
          image: item.image,
          location: item.location,
          rating: item.rating,
        }));
      } else if (itemSearchType === 'restaurant') {
        const searchResult = await searchRestaurantsAction({
          location: itemSearchQuery,
          page: 1,
          limit: 20,
        });
        results = (searchResult.results || []).map((item: any) => ({
          id: item.id,
          type: 'restaurant',
          name: item.name,
          image: item.image,
          location: item.location,
          rating: item.rating,
        }));
      } else if (itemSearchType === 'destination') {
        const searchResult = await unifiedSearchAction({
          query: itemSearchQuery,
          filters: {},
          page: 1,
          limit: 20,
        });
        results = (searchResult.results || [])
          .filter((item: any) => item.type === 'destination' || item.type === 'attraction')
          .map((item: any) => ({
            id: item.id,
            type: item.type === 'attraction' ? 'destination' : item.type,
            name: item.name,
            image: item.image,
            location: item.location,
            rating: item.rating,
          }));
      }

      setItemSearchResults(results);
    } catch (error: any) {
        showToast.error(error.message || 'Có lỗi xảy ra khi tìm kiếm');
    } finally {
      setIsSearchingItems(false);
    }
  };

  const handleSelectItem = (item: any) => {
    setFormData({
      ...formData,
      selectedItem: item,
      category: item.type === 'destination' ? 'destination' : item.type,
      location: item.location,
    });
    setShowItemSearch(false);
    setItemSearchQuery('');
    setItemSearchResults([]);
  };

  const handleRemoveItem = () => {
    setFormData({
      ...formData,
      selectedItem: null,
    });
  };

  const handlePickImage = async () => {
    try {
      // On web, use file input instead of ImagePicker
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.style.display = 'none';
        
        input.onchange = async (e: any) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          
          setIsUploadingImage(true);
          try {
            const uploadedImages: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              
              // Convert file to base64
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64String = reader.result as string;
                  resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              console.log('📤 Uploading image to Cloudinary...', file.name);
              
              // Upload to Cloudinary
              const uploadResult = await uploadImageAction({
                imageData: base64,
                folder: 'travel-tour/blog',
                transformation: 'w_1200,h_800,c_fill,q_auto',
              });

              console.log('✅ Image uploaded:', uploadResult.url);
              uploadedImages.push(uploadResult.url);
            }

            setFormData({
              ...formData,
              images: [...formData.images, ...uploadedImages],
            });
            showToast.success(`Đã upload ${uploadedImages.length} hình ảnh`);
          } catch (error: any) {
            console.error('❌ Upload error:', error);
            showToast.error(error.message || 'Không thể upload hình ảnh');
          } finally {
            setIsUploadingImage(false);
          }
        };
        
        document.body.appendChild(input);
        input.click();
        // Clean up after a delay
        setTimeout(() => {
          if (input.parentNode) {
            input.parentNode.removeChild(input);
          }
        }, 1000);
        return;
      }

      // Mobile: Use ImagePicker
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
              console.log('📤 Processing image:', asset.uri);
              
              // For mobile, use expo-file-system or convert directly
              // Read file as base64
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              
              // Convert blob to base64
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64String = reader.result as string;
                  resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              console.log('📤 Uploading image to Cloudinary...');
              
              // Upload to Cloudinary
              const uploadResult = await uploadImageAction({
                imageData: base64,
                folder: 'travel-tour/blog',
                transformation: 'w_1200,h_800,c_fill,q_auto',
              });

              console.log('✅ Image uploaded:', uploadResult.url);
              uploadedImages.push(uploadResult.url);
            }
          }

          setFormData({
            ...formData,
            images: [...formData.images, ...uploadedImages],
          });
          window.alert('Thành công: ' + `Đã upload ${uploadedImages.length} hình ảnh`);
        } catch (error: any) {
          console.error('❌ Upload error:', error);
          window.alert('Lỗi: ' + (error.message || 'Không thể upload hình ảnh'));
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error: any) {
      console.error('❌ Error in handlePickImage:', error);
      showToast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!convexUser) {
      showToast.error('Vui lòng đăng nhập để viết bài đánh giá');
      return;
    }

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

      if (editingPost) {
        await updatePost({
          postId: editingPost._id,
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
      } else {
        await createPost({
          userId: convexUser._id,
          title: formData.title,
          content: formData.content,
          rating: formData.rating > 0 ? formData.rating : undefined,
          location: formData.location || undefined,
          category: formData.category,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          images: formData.images.length > 0 ? formData.images : undefined,
          isPublished: true,
          ...itemData,
        });
        showToast.success('Đã đăng bài đánh giá');
      }
      setShowCreateModal(false);
      setFormData({
        title: '',
        content: '',
        rating: 0,
        location: '',
        category: 'general' as any,
        tags: [],
        tagInput: '',
        selectedItem: null,
        images: [],
      });
      setEditingPost(null);
    } catch (error: any) {
      showToast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const handleDelete = async (post: any) => {
    console.log('🗑️ handleDelete called with post:', post._id, 'convexUser:', convexUser?._id);
    
    if (!convexUser) {
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
      'Bạn có chắc chắn muốn xóa bài đánh giá này?\n\nHành động này không thể hoàn tác.',
      'Xác nhận xóa'
    );
    
    if (!confirmed) {
      console.log('❌ Delete cancelled by user');
      return;
    }
    
    // User confirmed, proceed with delete
    try {
      console.log('🗑️ Starting delete - postId:', post._id, 'userId:', convexUser._id);
      setDeletingPostId(post._id);
      
      const result = await deletePost({
        postId: post._id as Id<'blogPosts'>,
        userId: convexUser._id,
      });
      
      console.log('✅ Delete successful, result:', result);
      showToast.success('Đã xóa bài đánh giá thành công');
      // Post will be automatically removed from the list due to Convex reactivity
    } catch (error: any) {
      console.error('❌ Error deleting post:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      showToast.error(error.message || 'Không thể xóa bài đánh giá. Vui lòng thử lại.');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await toggleLike({ postId: postId as any });
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
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={16}
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

  const displayPosts = blogPosts || [];

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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.pageTitle}>Blog Đánh Giá</Text>
              <Text style={styles.pageSubtitle}>Chia sẻ trải nghiệm du lịch của bạn</Text>
            </View>
            {convexUser && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleOpenCreate}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.textInverse} />
                <Text style={styles.createButtonText}>Viết đánh giá</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Category Filter */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterTitle}>Danh mục</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(undefined)}
            >
              <Ionicons 
                name="apps" 
                size={16} 
                color={!selectedCategory ? COLORS.textInverse : COLORS.textSecondary} 
              />
              <Text
                style={[
                  styles.categoryText,
                  !selectedCategory && styles.categoryTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            {Object.entries(categoryLabels).map(([key, label]) => {
              const iconMap: Record<string, string> = {
                hotel: 'bed',
                restaurant: 'restaurant',
                destination: 'location',
                attraction: 'camera',
                general: 'document',
              };
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === key && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Ionicons 
                    name={iconMap[key] as any || 'document'} 
                    size={16} 
                    color={selectedCategory === key ? COLORS.textInverse : COLORS.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === key && styles.categoryTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Blog Posts */}
        <View style={styles.resultsSection}>
          {!blogPosts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : displayPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="document-text-outline" size={64} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyStateTitle}>Chưa có bài đánh giá nào</Text>
              <Text style={styles.emptyStateText}>
                Hãy là người đầu tiên chia sẻ trải nghiệm du lịch của bạn!
              </Text>
              {convexUser && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleOpenCreate}
                >
                  <Ionicons name="add-circle" size={20} color={COLORS.textInverse} />
                  <Text style={styles.emptyStateButtonText}>Viết đánh giá đầu tiên</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {displayPosts.map((post: any) => (
                <TouchableOpacity
                  key={post._id}
                  style={styles.postCard}
                  onPress={() => router.push(`/blog/${post.slug || post._id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postAuthor}>
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
                    {convexUser && post.userId === convexUser._id && (
                      <View style={styles.postActions}>
                        <TouchableOpacity
                          onPress={(e: any) => {
                            console.log('✏️ Edit icon clicked for post:', post._id);
                            if (e?.stopPropagation) e.stopPropagation();
                            handleEdit(post);
                          }}
                          style={styles.actionButton}
                        >
                          <Ionicons name="pencil" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={(e: any) => {
                            console.log('🗑️ Trash icon clicked for post:', post._id);
                            if (e?.stopPropagation) e.stopPropagation();
                            handleDelete(post);
                          }}
                          style={styles.actionButton}
                          disabled={deletingPostId === post._id}
                        >
                          {deletingPostId === post._id ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                          ) : (
                            <Ionicons name="trash" size={18} color={COLORS.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Post Image Preview */}
                  {post.images && post.images.length > 0 ? (
                    <View style={styles.postImageContainer}>
                      <Image
                        source={{ uri: post.images[0] }}
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                      {post.images.length > 1 && (
                        <View style={styles.imageCountBadge}>
                          <Ionicons name="images" size={14} color={COLORS.textInverse} />
                          <Text style={styles.imageCountText}>+{post.images.length - 1}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.postImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color={COLORS.textTertiary} />
                      <Text style={styles.postImagePlaceholderText}>Không có hình ảnh</Text>
                    </View>
                  )}

                  <View style={styles.postMetaRow}>
                    <View style={styles.categoryBadge}>
                      <Ionicons 
                        name={
                          post.category === 'hotel' ? 'bed' :
                          post.category === 'restaurant' ? 'restaurant' :
                          post.category === 'destination' ? 'location' :
                          post.category === 'attraction' ? 'camera' : 'document'
                        } 
                        size={12} 
                        color={COLORS.primaryDark} 
                      />
                      <Text style={styles.categoryBadgeText}>
                        {categoryLabels[post.category] || post.category}
                      </Text>
                    </View>
                    {post.rating && post.rating > 0 && (
                      <View style={styles.ratingBadge}>
                        {renderStars(post.rating)}
                        <Text style={styles.ratingText}>{post.rating}.0</Text>
                      </View>
                    )}
                  </View>

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
                          <Text style={styles.itemCardLocation}>{post.itemLocation}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  <Text style={styles.postTitle}>{post.title}</Text>
                  
                  {post.location && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <Text style={styles.locationText}>{post.location}</Text>
                    </View>
                  )}

                  <Text style={styles.postContent} numberOfLines={4}>
                    {post.content}
                  </Text>

                  {post.tags && post.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {post.tags.map((tag: string, index: number) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.postFooter}>
                    <TouchableOpacity
                      style={styles.likeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleLike(post._id);
                      }}
                    >
                      <Ionicons
                        name={post.likes > 0 ? 'heart' : 'heart-outline'}
                        size={18}
                        color={post.likes > 0 ? COLORS.error : COLORS.textSecondary}
                      />
                      <Text style={styles.likeText}>{post.likes || 0}</Text>
                    </TouchableOpacity>
                    <View style={styles.viewButton}>
                      <Ionicons name="eye-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.viewText}>{post.views || 0}</Text>
                    </View>
                    <View style={styles.readMoreButton}>
                      <Text style={styles.readMoreText}>Đọc thêm</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPost ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá mới'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
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

              {/* Item Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Chọn địa điểm/Nhà hàng/Khách sạn để đánh giá</Text>
                {formData.selectedItem ? (
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
                      <Text style={styles.selectedItemType}>
                        {formData.selectedItem.type === 'hotel' ? 'Khách sạn' :
                         formData.selectedItem.type === 'restaurant' ? 'Nhà hàng' :
                         'Điểm đến'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveItem}
                      style={styles.removeItemButton}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.itemSearchTypeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.itemTypeButton,
                          itemSearchType === 'hotel' && styles.itemTypeButtonActive,
                        ]}
                        onPress={() => setItemSearchType('hotel')}
                      >
                        <Text
                          style={[
                            styles.itemTypeButtonText,
                            itemSearchType === 'hotel' && styles.itemTypeButtonTextActive,
                          ]}
                        >
                          Khách sạn
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.itemTypeButton,
                          itemSearchType === 'restaurant' && styles.itemTypeButtonActive,
                        ]}
                        onPress={() => setItemSearchType('restaurant')}
                      >
                        <Text
                          style={[
                            styles.itemTypeButtonText,
                            itemSearchType === 'restaurant' && styles.itemTypeButtonTextActive,
                          ]}
                        >
                          Nhà hàng
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.itemTypeButton,
                          itemSearchType === 'destination' && styles.itemTypeButtonActive,
                        ]}
                        onPress={() => setItemSearchType('destination')}
                      >
                        <Text
                          style={[
                            styles.itemTypeButtonText,
                            itemSearchType === 'destination' && styles.itemTypeButtonTextActive,
                          ]}
                        >
                          Điểm đến
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemSearchContainer}>
                      <TextInput
                        style={styles.itemSearchInput}
                        placeholder={`Tìm kiếm ${itemSearchType === 'hotel' ? 'khách sạn' : itemSearchType === 'restaurant' ? 'nhà hàng' : 'điểm đến'}...`}
                        value={itemSearchQuery}
                        onChangeText={setItemSearchQuery}
                        onSubmitEditing={handleSearchItems}
                      />
                      <TouchableOpacity
                        style={styles.itemSearchButton}
                        onPress={handleSearchItems}
                        disabled={isSearchingItems}
                      >
                        {isSearchingItems ? (
                          <ActivityIndicator size="small" color={COLORS.textInverse} />
                        ) : (
                          <Ionicons name="search" size={20} color={COLORS.textInverse} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {itemSearchResults.length > 0 && (
                      <View style={styles.itemSearchResults}>
                        {itemSearchResults.map((item: any) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.itemResultCard}
                            onPress={() => handleSelectItem(item)}
                          >
                            {item.image && (
                              <Image
                                source={{ uri: item.image }}
                                style={styles.itemResultImage}
                              />
                            )}
                            <View style={styles.itemResultInfo}>
                              <Text style={styles.itemResultName}>{item.name}</Text>
                              <Text style={styles.itemResultLocation}>{item.location}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

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
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingPost ? 'Cập nhật' : 'Đăng bài'}
                  </Text>
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
    position: 'relative',
    ...Platform.select({
      web: {
        '::after': {
          content: '""',
          position: 'absolute',
          bottom: -8,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: COLORS.primary,
          borderRadius: 2,
        },
      },
    }),
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
        },
      },
    }),
  },
  createButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  headerSection: {
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: COLORS.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  filtersSection: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 40,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.surfaceLight,
          borderColor: COLORS.primaryLight,
        },
      },
    }),
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          ...SHADOWS.md,
        },
      },
    }),
  },
  categoryText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  resultsSection: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.sm,
  },
  postCard: {
    display: 'flex',
    flexDirection: 'column',
    flexBasis: width > 1200 ? '31%' : width > 768 ? '47%' : '100%',
    flexGrow: 0,
    flexShrink: 1,
    margin: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
    minWidth: 280,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          borderColor: COLORS.primary,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    }),
  },
  postImageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    marginBottom: 0,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
  },
  postImagePlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImagePlaceholderText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  imageCountText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  authorName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  postDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  postActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    zIndex: 10,
    ...Platform.select({
      web: {
        pointerEvents: 'auto' as const,
      },
    }),
  },
  actionButton: {
    padding: SPACING.xs,
    zIndex: 11,
    ...Platform.select({
      web: {
        pointerEvents: 'auto' as const,
        cursor: 'pointer',
      },
    }),
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  ratingText: {
    ...TYPOGRAPHY.small,
    color: COLORS.warning,
    fontWeight: '600',
  },
  categoryBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  postTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: '700',
    paddingHorizontal: SPACING.lg,
    lineHeight: 28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  locationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    gap: 2,
  },
  postContent: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  tagText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  removeTagButton: {
    padding: SPACING.xs / 2,
  },
  postFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceLight,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: 'auto',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  readMoreText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  likeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  viewText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    maxWidth: 400,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
        },
      },
    }),
  },
  emptyStateButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
  footerSpacing: {
    height: SPACING.xxl,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    width: width > 768 ? 600 : '90%',
    maxHeight: '90%',
    ...SHADOWS.xl,
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
    padding: SPACING.lg,
    maxHeight: 500,
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
    textAlignVertical: 'top',
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
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
  // Image upload styles
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
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
  // Item selection styles
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
    marginBottom: SPACING.xs / 2,
  },
  selectedItemType: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  removeItemButton: {
    padding: SPACING.xs,
  },
  itemSearchTypeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  itemTypeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  itemTypeButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  itemTypeButtonTextActive: {
    color: COLORS.textInverse,
  },
  itemSearchContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  itemSearchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
  },
  itemSearchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSearchResults: {
    maxHeight: 300,
    marginTop: SPACING.sm,
  },
  itemResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemResultImage: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  itemResultInfo: {
    flex: 1,
  },
  itemResultName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  itemResultLocation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  // Item card in post
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  itemCardImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  itemCardInfo: {
    flex: 1,
  },
  itemCardName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  itemCardLocation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

