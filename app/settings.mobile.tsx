import { COLORS } from '@/constants/theme';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import ProfileForm from '@/components/settings/profile-form';
import PreferencesSection from '@/components/settings/preferences-section';
import NotificationsSection from '@/components/settings/notifications-section';
import LanguageCurrency from '@/components/settings/language-currency';
import { useAuthStore } from '@/store/useAuthStore';

interface SettingsMobileProps {
  convexUser?: any;
}

export default function SettingsMobile({ convexUser: convexUserProp }: SettingsMobileProps) {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { logout } = useAuthStore();
  const updatePreferences = useMutation(api.users.updatePreferences);
  const updateUserName = useMutation(api.users.updateUserName);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const createUser = useMutation(api.users.createUser);
  
  // ALWAYS query convexUser from Convex to ensure we get the latest data (including avatar)
  // This ensures avatar persists after page refresh
  const convexUserFromQuery = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );
  
  // Always prioritize query result over props to ensure real-time updates
  // Props might be stale, but query result is always fresh from Convex
  const convexUser = convexUserFromQuery || convexUserProp;

  // Initialize preferences from Convex user
  const [preferences, setPreferences] = useState({
    interests: convexUser?.preferences?.interests || ['beach', 'culture', 'food'],
    budget: convexUser?.preferences?.budget || 5000000,
    currency: convexUser?.preferences?.currency || 'VND',
    language: convexUser?.preferences?.language || 'vi',
  });

  // Update preferences when convexUser changes
  useEffect(() => {
    if (convexUser?.preferences) {
      setPreferences({
        interests: convexUser.preferences.interests || [],
        budget: convexUser.preferences.budget || 5000000,
        currency: convexUser.preferences.currency || 'VND',
        language: convexUser.preferences.language || 'vi',
      });
    }
  }, [convexUser]);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            logout();
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản',
      'Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Xóa tài khoản', 'Tính năng đang được phát triển');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Form */}
          <ProfileForm
            name={convexUser?.name || user?.fullName || user?.firstName || ''}
            email={user?.primaryEmailAddress?.emailAddress || ''}
            avatar={useMemo(() => {
              // ALWAYS prioritize Convex avatar - this is the source of truth
              // Logic: If Convex has avatar -> use it, else use Clerk avatar
              const finalConvexUser = convexUserFromQuery || convexUser;
              const convexAvatar = finalConvexUser?.avatar;
              
              // Simple logic: Convex avatar first, Clerk avatar as fallback
              const finalAvatar = convexAvatar || user?.imageUrl;
              
              return finalAvatar;
            }, [convexUser, convexUserFromQuery, user?.imageUrl])}
            onSave={async (name?: string, avatar?: string) => {
              console.log('💾 onSave called:', { 
                hasName: !!name, 
                hasAvatar: !!avatar,
                avatarUrl: avatar ? avatar.substring(0, 50) + '...' : 'none',
                convexUserId: convexUser?._id,
                convexUserFromQuery: convexUserFromQuery?._id,
                hasConvexUser: !!convexUser,
                hasConvexUserFromQuery: !!convexUserFromQuery,
              });
              
              // Use the most up-to-date convexUser (from query if available)
              const finalConvexUser = convexUser || convexUserFromQuery;
              
              if (!finalConvexUser?._id) {
                console.error('❌ No convexUser._id found', {
                  hasConvexUser: !!convexUser,
                  hasConvexUserFromQuery: !!convexUserFromQuery,
                  userId: user?.id,
                });
                
                // Try to create user if doesn't exist
                if (user?.id) {
                  try {
                    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
                    const newUserId = await createUser({
                      clerkId: user.id,
                      email,
                      name: user.fullName || undefined,
                      avatar: avatar || undefined,
                    });
                    console.log('✅ Created new user in Convex:', newUserId);
                    Alert.alert('Thành công', 'Đã tạo tài khoản và lưu thông tin');
                    return;
                  } catch (createError: any) {
                    console.error('❌ Error creating user:', createError);
                    Alert.alert('Lỗi', 'Không thể tạo tài khoản. Vui lòng refresh trang và thử lại.');
                    return;
                  }
                }
                
                Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng refresh trang và thử lại.');
                return;
              }
              
              try {
                const updates: Promise<any>[] = [];
                
                // Update name if changed
                const currentName = finalConvexUser?.name || '';
                const newName = name || '';
                if (newName && newName.trim() && newName.trim() !== currentName) {
                  console.log('📝 Updating name:', { from: currentName, to: newName.trim() });
                  updates.push(
                    updateUserName({ userId: finalConvexUser._id as Id<'users'>, name: newName.trim() })
                  );
                }
                
                // Update avatar if changed - ALWAYS update if new avatar is provided
                const currentAvatar = (finalConvexUser?.avatar || '').trim();
                const newAvatar = (avatar || '').trim();
                console.log('💾 Saving avatar:', {
                  currentAvatar: currentAvatar ? currentAvatar.substring(0, 50) + '...' : 'empty',
                  newAvatar: newAvatar ? newAvatar.substring(0, 50) + '...' : 'empty',
                  isDifferent: newAvatar !== currentAvatar,
                  hasNewAvatar: !!newAvatar && newAvatar.length > 0,
                  willUpdate: newAvatar !== currentAvatar,
                });
                
                // Always update if avatar changed (including clearing avatar)
                if (newAvatar !== currentAvatar) {
                  if (newAvatar && newAvatar.length > 0) {
                    console.log('📤 Updating avatar in Convex...', { userId: finalConvexUser._id, avatarUrl: newAvatar.substring(0, 50) + '...' });
                    updates.push(
                      updateAvatar({ userId: finalConvexUser._id as Id<'users'>, avatar: newAvatar })
                    );
                  } else {
                    // Clearing avatar
                    console.log('📤 Removing avatar (setting to empty)...');
                    updates.push(
                      updateAvatar({ userId: finalConvexUser._id as Id<'users'>, avatar: '' })
                    );
                  }
                } else {
                  console.log('ℹ️ Avatar unchanged, skipping update');
                }
                
                if (updates.length > 0) {
                  console.log(`🔄 Executing ${updates.length} update(s)...`);
                  const results = await Promise.all(updates);
                  console.log('✅ All updates saved successfully to Convex', results);
                  
                  // Verify avatar was saved by checking the result
                  if (avatar && newAvatar !== currentAvatar) {
                    const avatarResult = results.find(r => r?.success);
                    if (avatarResult) {
                      console.log('✅ Avatar save verified:', {
                        savedAvatar: avatarResult.avatar ? avatarResult.avatar.substring(0, 50) + '...' : 'none',
                        expectedAvatar: newAvatar.substring(0, 50) + '...',
                      });
                    }
                  }
                  
                  // Force a small delay to ensure Convex has processed the update
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Don't show alert here if called from auto-save (will show in ProfileForm)
                  if (!avatar || avatar === currentAvatar) {
                    Alert.alert('Thành công', 'Đã lưu thông tin cá nhân');
                  }
                } else {
                  console.log('ℹ️ No changes to save');
                  if (!avatar || avatar === currentAvatar) {
                    Alert.alert('Thông báo', 'Không có thay đổi nào để lưu');
                  }
                }
              } catch (error: any) {
                console.error('❌ Error saving profile:', error);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));
                throw error; // Re-throw để ProfileForm có thể catch
              }
            }}
          />

          {/* Preferences */}
          <PreferencesSection
            interests={preferences.interests}
            budget={preferences.budget}
            onInterestsChange={async (interests) => {
              setPreferences({ ...preferences, interests });
              const finalConvexUser = convexUser || convexUserFromQuery;
              if (finalConvexUser?._id) {
                try {
                  await updatePreferences({
                    userId: finalConvexUser._id as Id<'users'>,
                    preferences: { ...preferences, interests },
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật sở thích. Vui lòng thử lại.');
                }
              }
            }}
            onBudgetChange={async (budget) => {
              setPreferences({ ...preferences, budget });
              const finalConvexUser = convexUser || convexUserFromQuery;
              if (finalConvexUser?._id) {
                try {
                  await updatePreferences({
                    userId: finalConvexUser._id as Id<'users'>,
                    preferences: { ...preferences, budget },
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật ngân sách. Vui lòng thử lại.');
                }
              }
            }}
          />

          {/* Notifications */}
          <NotificationsSection />

          {/* Language & Currency */}
          <LanguageCurrency
            language={preferences.language}
            currency={preferences.currency}
            onLanguageChange={async (language) => {
              setPreferences({ ...preferences, language });
              const finalConvexUser = convexUser || convexUserFromQuery;
              if (finalConvexUser?._id) {
                try {
                  await updatePreferences({
                    userId: finalConvexUser._id as Id<'users'>,
                    preferences: { ...preferences, language },
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật ngôn ngữ. Vui lòng thử lại.');
                }
              }
            }}
            onCurrencyChange={async (currency) => {
              setPreferences({ ...preferences, currency });
              const finalConvexUser = convexUser || convexUserFromQuery;
              if (finalConvexUser?._id) {
                try {
                  await updatePreferences({
                    userId: finalConvexUser._id as Id<'users'>,
                    preferences: { ...preferences, currency },
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật tiền tệ. Vui lòng thử lại.');
                }
              }
            }}
          />

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <View style={styles.dangerHeader}>
              <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
              <Text style={styles.dangerHeaderText}>Khu vực nguy hiểm</Text>
            </View>
            <View style={styles.dangerActions}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color={COLORS.text} />
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={styles.deleteButtonText}>Xóa tài khoản</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  backButton: {
    width: 40,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dangerZone: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  dangerHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  dangerActions: {
    gap: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF6B6B' + '20',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B6B',
  },
});

