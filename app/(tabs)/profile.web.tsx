import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Image } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface ProfileWebProps {
  user: any;
  convexUser: any;
  trips: any[];
}

export default function ProfileWeb({ user: clerkUserProp, convexUser, trips = [] }: ProfileWebProps) {
  const router = useRouter();
  const segments = useSegments();
  const { signOut } = useAuth();
  const { logout } = useAuthStore();
  // Fallback: lấy user trực tiếp từ useUser nếu prop không có
  const { user: clerkUserFromHook } = useUser();
  const clerkUser = clerkUserProp || clerkUserFromHook;
  
  const currentRoute = segments[segments.length - 1] || 'profile';
  
  // ALWAYS query convexUser from Convex to ensure we get the latest data (including avatar)
  // This ensures avatar persists after page refresh
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );
  
  // Always prioritize query result over props to ensure real-time updates
  // Props might be stale, but query result is always fresh from Convex
  const finalConvexUser = convexUserFromQuery || convexUser;
  
  // Debug: Log avatar state - log every time convexUser changes
  useEffect(() => {
    console.log('🖼️ Profile Avatar Debug:', {
      hasConvexUser: !!finalConvexUser,
      convexUserId: finalConvexUser?._id,
      convexUserFromQuery: convexUserFromQuery ? 'loaded' : 'not loaded',
      convexUserFromProps: convexUser ? 'loaded' : 'not loaded',
      convexAvatar: finalConvexUser?.avatar ? finalConvexUser.avatar.substring(0, 50) + '...' : 'none',
      convexAvatarFull: finalConvexUser?.avatar || 'none',
      clerkAvatar: clerkUser?.imageUrl ? clerkUser.imageUrl.substring(0, 50) + '...' : 'none',
      finalAvatar: finalConvexUser?.avatar || clerkUser?.imageUrl || 'none',
      willUseConvexAvatar: !!finalConvexUser?.avatar,
      willUseClerkAvatar: !finalConvexUser?.avatar && !!clerkUser?.imageUrl,
    });
  }, [finalConvexUser, clerkUser, convexUserFromQuery, convexUser]);
  
  // Mutation to create user
  const createUser = useMutation(api.users.createUser);
  
  // Auto-create user in Convex if not exists
  useEffect(() => {
    const syncUserToConvex = async () => {
      if (clerkUser && !finalConvexUser) {
        try {
          const clerkId = clerkUser.id;
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress || "";
          
          // Xử lý name: ưu tiên fullName, nếu không có thì ghép firstName + lastName
          let name = clerkUser.fullName || "";
          if (!name && (clerkUser.firstName || clerkUser.lastName)) {
            name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
          }
          
          // Lấy name từ unsafeMetadata nếu có
          if (!name && clerkUser.unsafeMetadata?.fullName) {
            name = String(clerkUser.unsafeMetadata.fullName);
          }
          
          // Use convexUser avatar if exists, otherwise fallback to Clerk imageUrl
          const avatar = finalConvexUser?.avatar || clerkUser.imageUrl || undefined;
          
          if (clerkId && email) {
            console.log('🔄 ProfileWeb - Creating/Updating Convex user with:', { clerkId, email, avatar: avatar ? 'has avatar' : 'no avatar' });
            await createUser({
              clerkId,
              email,
              name: name || undefined,
              avatar,
            });
            console.log('✅ ProfileWeb - Convex user đã được tạo thành công');
          } else {
            console.warn('⚠️ ProfileWeb - Cannot create Convex user: missing id or email', {
              hasId: !!clerkId,
              hasEmail: !!email,
            });
          }
        } catch (error: any) {
          // Ignore errors - có thể user đã tồn tại hoặc có lỗi khác
          console.log('⚠️ ProfileWeb - Không thể tạo Convex user:', error?.message || error);
        }
      }
    };
    
    syncUserToConvex();
  }, [clerkUser, finalConvexUser, createUser]);
  
  // Xử lý name: ưu tiên từ Convex, nếu không có thì lấy từ Clerk
  const getDisplayName = () => {
    // 1. Ưu tiên từ Convex - kiểm tra cả null, undefined và empty string
    if (finalConvexUser?.name && finalConvexUser.name.trim() !== '') {
      return finalConvexUser.name;
    }
    
    // 2. Lấy từ Clerk fullName
    if (clerkUser?.fullName && clerkUser.fullName.trim() !== '') {
      return clerkUser.fullName;
    }
    
    // 3. Lấy từ firstName + lastName
    if (clerkUser?.firstName || clerkUser?.lastName) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();
      if (name) return name;
    }
    
    // 4. Lấy từ email (phần trước @)
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || clerkUser?.primaryEmailAddress?.emailAddress;
    if (email) {
      const emailName = email.split('@')[0];
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    // 5. Fallback
    return "User";
  };
  
  const displayName = getDisplayName();
  
  // Debug: Log để kiểm tra
  useEffect(() => {
    if (finalConvexUser) {
      console.log('Convex User:', {
        name: finalConvexUser.name,
        hasName: !!finalConvexUser.name,
        nameLength: finalConvexUser.name?.length,
        fullUser: finalConvexUser,
      });
    }
    console.log('Clerk User:', {
      fullName: clerkUser?.fullName,
      firstName: clerkUser?.firstName,
      lastName: clerkUser?.lastName,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    console.log('Display Name:', displayName);
  }, [finalConvexUser, clerkUser, displayName]);
  
  // Lấy chữ cái đầu cho avatar
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Query trips trực tiếp từ Convex (luôn query để đảm bảo có dữ liệu mới nhất)
  const tripsFromQuery = useQuery(
    api.trips.getUserTrips,
    finalConvexUser?._id ? { userId: finalConvexUser._id } : 'skip'
  );
  
  // Ưu tiên dùng trips từ query (real-time), nếu không có thì dùng từ props
  const allTrips = useMemo(() => {
    // Nếu query đã có kết quả (không phải undefined), dùng query
    if (tripsFromQuery !== undefined) {
      return Array.isArray(tripsFromQuery) ? tripsFromQuery : [];
    }
    // Nếu query đang loading, dùng props nếu có
    if (trips && Array.isArray(trips) && trips.length > 0) {
      return trips;
    }
    // Fallback: empty array
    return [];
  }, [tripsFromQuery, trips]);
  
  // Query favorites để lấy số lượng
  const favoritesList = useQuery(
    api.favorites.getUserFavorites,
    finalConvexUser?._id ? { userId: finalConvexUser._id } : 'skip'
  );
  
  const favoritesCount = useMemo(() => {
    if (favoritesList === undefined) return 0;
    return Array.isArray(favoritesList) ? favoritesList.length : 0;
  }, [favoritesList]);

  // Debug: Log để kiểm tra dữ liệu
  useEffect(() => {
    console.log('🔍 Profile Data Debug:', {
      hasConvexUser: !!finalConvexUser,
      convexUserId: finalConvexUser?._id,
      hasClerkUser: !!clerkUser,
      clerkUserId: clerkUser?.id,
      tripsFromProps: trips,
      tripsFromPropsLength: trips?.length || 0,
      tripsFromQuery: tripsFromQuery,
      tripsFromQueryIsUndefined: tripsFromQuery === undefined,
      tripsFromQueryLength: tripsFromQuery?.length || 0,
      allTrips: allTrips,
      allTripsLength: allTrips?.length || 0,
      allTripsIsArray: Array.isArray(allTrips),
      favoritesList: favoritesList,
      favoritesListIsUndefined: favoritesList === undefined,
      favoritesListLength: favoritesList?.length || 0,
      favoritesCount: favoritesCount,
    });
  }, [finalConvexUser, clerkUser, trips, tripsFromQuery, allTrips, favoritesList, favoritesCount]);

  const handleLogout = async () => {
    try {
      await signOut();
      logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };

  // Tính stats từ trips và favorites
  const stats = useMemo(() => {
    const tripsArray = Array.isArray(allTrips) ? allTrips : [];
    
    // 1. Đếm số chuyến đi
    const tripsCount = tripsArray.length;
    
    // 2. Đếm số điểm đến unique từ trips
    // Lấy destination từ mỗi trip, normalize và loại bỏ empty
    const destinations = tripsArray
      .map(trip => {
        // Ưu tiên destination, nếu không có thì lấy location
        const dest = trip.destination || trip.location || '';
        // Normalize: trim và lowercase để so sánh
        return dest.trim().toLowerCase();
      })
      .filter(dest => dest !== ''); // Loại bỏ empty strings
    
    // Đếm unique destinations
    const uniqueDestinationsCount = new Set(destinations).size;
    
    // 3. Đếm số mục yêu thích (đã có từ favoritesList)
    const favoritesCountValue = favoritesCount;

    console.log('📊 Profile Stats:', {
      tripsCount,
      uniqueDestinationsCount,
      destinations: Array.from(new Set(destinations)),
      favoritesCount: favoritesCountValue,
    });

    return [
      { label: 'Chuyến đi', value: tripsCount.toString(), icon: 'airplane' },
      { label: 'Điểm đến', value: uniqueDestinationsCount.toString(), icon: 'location' },
      { label: 'Yêu thích', value: favoritesCountValue.toString(), icon: 'heart' },
    ];
  }, [allTrips, favoritesCount]);

  // Lấy preferences từ Convex user
  const preferences = finalConvexUser?.preferences?.interests || ['Biển', 'Văn hóa', 'Ẩm thực', 'Thiên nhiên'];

  // Lấy recent trips (tối đa 2 trips gần nhất)
  const recentTrips = useMemo(() => {
    const tripsArray = Array.isArray(allTrips) ? allTrips : [];
    return tripsArray
      .filter(trip => trip.status === 'completed')
      .sort((a, b) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 2);
  }, [allTrips]);

  const menuItems = [
    { id: 'trips', title: 'Chuyến đi của tôi', icon: 'airplane-outline', color: COLORS.primary },
    { id: 'favorites', title: 'Yêu thích', icon: 'heart-outline', color: '#FF6B6B' },
    { id: 'bookings', title: 'Đặt chỗ', icon: 'receipt-outline', color: '#4ECDC4' },
    { id: 'settings', title: 'Cài đặt', icon: 'settings-outline', color: COLORS.grey },
    { id: 'help', title: 'Trợ giúp', icon: 'help-circle-outline', color: '#FFA726' },
    { id: 'about', title: 'Giới thiệu', icon: 'information-circle-outline', color: '#9C27B0' },
  ];

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
              const avatarUrl = finalConvexUser?.avatar || clerkUser?.imageUrl;
              return avatarUrl ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={styles.profileAvatar}
                    onError={(e) => {
                      console.error('❌ Error loading nav avatar:', e.nativeEvent.error);
                    }}
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileInfo}>
              {(() => {
                const avatarUrl = finalConvexUser?.avatar || clerkUser?.imageUrl;
                console.log('🖼️ Profile avatar check:', {
                  hasConvexAvatar: !!finalConvexUser?.avatar,
                  convexAvatar: finalConvexUser?.avatar ? finalConvexUser.avatar.substring(0, 50) + '...' : 'none',
                  hasClerkAvatar: !!clerkUser?.imageUrl,
                  finalAvatar: avatarUrl ? avatarUrl.substring(0, 50) + '...' : 'none',
                });
                return avatarUrl ? (
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={styles.avatarImage}
                    onError={(e) => {
                      console.error('❌ Error loading avatar image:', e.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('✅ Avatar image loaded successfully');
                    }}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {avatarInitial}
                    </Text>
                  </View>
                );
              })()}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {displayName}
                </Text>
                <Text style={styles.userEmail}>
                  {clerkUser?.emailAddresses?.[0]?.emailAddress || clerkUser?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name={stat.icon as any} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => {
              const handlePress = () => {
                switch (item.id) {
                  case 'trips':
                    router.push('/my-trips');
                    break;
                  case 'favorites':
                    router.push('/favorites');
                    break;
                  case 'bookings':
                    router.push('/my-bookings');
                    break;
                  case 'settings':
                    router.push('/settings');
                    break;
                  case 'help':
                    Alert.alert('Trợ giúp', 'Tính năng đang được phát triển');
                    break;
                  case 'about':
                    Alert.alert('Giới thiệu', 'TravelTour - Ứng dụng du lịch thông minh với AI');
                    break;
                  default:
                    break;
                }
              };

              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.menuItem}
                  onPress={handlePress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preferences */}
          <View style={styles.preferencesContainer}>
            <Text style={styles.sectionTitle}>Sở thích</Text>
            <View style={styles.preferencesGrid}>
              {preferences.length > 0 ? (
                preferences.map((preference: string, index: number) => (
                  <View key={index} style={styles.preferenceChip}>
                    <Text style={styles.preferenceText}>{preference}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyPreferencesText}>Chưa có sở thích</Text>
              )}
            </View>
          </View>

          {/* Recent Trips */}
          <View style={styles.recentTripsContainer}>
            <Text style={styles.sectionTitle}>Chuyến đi gần đây</Text>
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => (
                <TouchableOpacity 
                  key={trip._id} 
                  style={styles.tripCard}
                  onPress={() => router.push(`/trip/${trip._id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>{trip.title || trip.destination}</Text>
                    <Text style={styles.tripDate}>
                      {new Date(trip.startDate).toLocaleDateString('vi-VN')} - {new Date(trip.endDate).toLocaleDateString('vi-VN')}
                    </Text>
                    <View style={styles.tripStatusContainer}>
                      <View style={[
                        styles.tripStatusBadge,
                        trip.status === 'completed' && styles.tripStatusBadgeCompleted,
                        trip.status === 'ongoing' && styles.tripStatusBadgeOngoing,
                        trip.status === 'planning' && styles.tripStatusBadgePlanning,
                      ]}>
                        <Text style={[
                          styles.tripStatus,
                          trip.status === 'completed' && styles.tripStatusCompleted,
                        ]}>
                          {trip.status === 'completed' ? 'Hoàn thành' : 
                           trip.status === 'ongoing' ? 'Đang diễn ra' :
                           trip.status === 'planning' ? 'Đang lên kế hoạch' : trip.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {trip.rating && (
                    <View style={styles.tripRating}>
                      <Ionicons name="star" size={18} color="#FFD700" />
                      <Text style={styles.ratingText}>{trip.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyTripsContainer}>
                <Ionicons name="airplane-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyTripsText}>Chưa có chuyến đi nào</Text>
              </View>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    ...SHADOWS.sm,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
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
        transition: 'color 0.2s',
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
    gap: 16,
  },
  profileIconButton: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }),
  },
  avatarActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileAvatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    width: 42,
    height: 42,
    borderRadius: 21,
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
      },
    }),
  },
  profileAvatarActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.surface,
        },
      },
    }),
  },
  editButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.lg,
          transform: 'translateY(-4px)',
        },
      },
    }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  menuContainer: {
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.md,
          transform: 'translateX(4px)',
        },
      },
    }),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  preferencesContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  preferenceChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '10',
        },
      },
    }),
  },
  preferenceText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  recentTripsContainer: {
    marginBottom: 40,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ':hover': {
          borderColor: COLORS.primaryLight,
          ...SHADOWS.lg,
          transform: 'translateY(-4px)',
        },
      },
    }),
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  tripDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tripStatusContainer: {
    flexDirection: 'row',
  },
  tripStatusBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripStatus: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tripRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FF6B6B' + '40',
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
        ':hover': {
          backgroundColor: '#FF6B6B' + '10',
          borderColor: '#FF6B6B',
        },
      },
    }),
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyPreferencesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyTripsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTripsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  tripStatusBadgeCompleted: {
    backgroundColor: '#4ADE80' + '20',
  },
  tripStatusBadgeOngoing: {
    backgroundColor: COLORS.primary + '20',
  },
  tripStatusBadgePlanning: {
    backgroundColor: COLORS.textSecondary + '20',
  },
  tripStatusCompleted: {
    color: '#4ADE80',
  },
});

