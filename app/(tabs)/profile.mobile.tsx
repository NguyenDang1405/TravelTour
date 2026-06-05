import { COLORS } from '@/constants/theme';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

interface ProfileMobileProps {
  user: any;
  convexUser: any;
  trips: any[];
}

export default function ProfileMobile({ user: clerkUserProp, convexUser, trips = [] }: ProfileMobileProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { logout } = useAuthStore();
  // Fallback: lấy user trực tiếp từ useUser nếu prop không có
  const { user: clerkUserFromHook } = useUser();
  const clerkUser = clerkUserProp || clerkUserFromHook;
  
  // Xử lý name: ưu tiên từ Convex, nếu không có thì lấy từ Clerk
  const getDisplayName = () => {
    // 1. Ưu tiên từ Convex - kiểm tra cả null, undefined và empty string
    if (convexUser?.name && convexUser.name.trim() !== '') {
      return convexUser.name;
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
  
  // Lấy chữ cái đầu cho avatar
  const avatarInitial = displayName.charAt(0).toUpperCase();

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

  // Tính stats từ trips thật
  const completedTrips = trips.filter(trip => trip.status === 'completed');
  const uniqueDestinations = new Set(trips.map(trip => trip.destination)).size;
  const averageRating = completedTrips.length > 0 
    ? (completedTrips.reduce((sum, trip) => sum + (trip.rating || 0), 0) / completedTrips.length).toFixed(1)
    : '0';

  const stats = [
    { label: 'Chuyến đi', value: trips.length.toString(), icon: 'airplane' },
    { label: 'Điểm đến', value: uniqueDestinations.toString(), icon: 'location' },
    { label: 'Đánh giá', value: averageRating, icon: 'star' },
  ];

  // Lấy preferences từ Convex user
  const preferences = convexUser?.preferences?.interests || ['Biển', 'Văn hóa', 'Ẩm thực', 'Thiên nhiên'];

  // Lấy recent trips (tối đa 2 trips gần nhất)
  const recentTrips = trips
    .filter(trip => trip.status === 'completed')
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    .slice(0, 2);

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
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            {(() => {
              const avatarUrl = convexUser?.avatar || clerkUser?.imageUrl;
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
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name={stat.icon as any} size={20} color={COLORS.primary} />
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
                    <Ionicons name="star" size={16} color="#FFD700" />
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  editButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  preferencesContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  preferenceText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  recentTripsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tripStatusContainer: {
    flexDirection: 'row',
  },
  tripStatusBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
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
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
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

