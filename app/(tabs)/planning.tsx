import { useUser, useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import React, { useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import PlanningMobile from './planning.mobile';
import PlanningWeb from './planning.web';

export default function PlanningScreen() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const createUser = useMutation(api.users.createUser);

  // Debug logging
  useEffect(() => {
    console.log('🔍 PlanningScreen - Auth state:', {
      isSignedIn,
      authLoaded,
      userLoaded,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.emailAddresses?.[0]?.emailAddress,
    });
  }, [isSignedIn, authLoaded, userLoaded, user]);

  // Lấy user data từ Convex - chỉ query khi user đã được load
  const convexUser = useQuery(
    api.users.getUser, 
    (userLoaded && authLoaded && isSignedIn && user?.id) 
      ? { clerkId: user.id } 
      : "skip"
  );

  // Debug convexUser
  useEffect(() => {
    console.log('🔍 PlanningScreen - ConvexUser state:', {
      convexUser,
      hasConvexUser: !!convexUser,
      convexUserId: convexUser?._id,
      userLoaded,
      authLoaded,
      isSignedIn,
      hasUser: !!user,
    });
  }, [convexUser, userLoaded, authLoaded, isSignedIn, user]);

  // Tự động tạo user trong Convex nếu chưa có
  useEffect(() => {
    if (userLoaded && authLoaded && isSignedIn && user && !convexUser) {
      const syncUser = async () => {
        try {
          const clerkId = user.id;
          const email = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || "";
          
          // Xử lý name
          let name = user.fullName || "";
          if (!name && (user.firstName || user.lastName)) {
            name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
          }
          if (!name && user.unsafeMetadata?.fullName) {
            name = String(user.unsafeMetadata.fullName);
          }
          
          // Use convexUser avatar if exists, otherwise fallback to Clerk imageUrl
          const avatar = (convexUser as any)?.avatar || user.imageUrl || "";
          
          if (clerkId && email) {
            console.log('🔄 PlanningScreen - Auto-creating/updating user in Convex...', { clerkId, email, name, avatar: avatar ? 'has avatar' : 'no avatar' });
            await createUser({
              clerkId,
              email,
              name: name || undefined,
              avatar: avatar || undefined,
            });
            console.log('✅ PlanningScreen - User created in Convex');
          }
        } catch (error) {
          console.error('❌ PlanningScreen - Error creating user in Convex:', error);
        }
      };
      
      syncUser();
    }
  }, [userLoaded, authLoaded, isSignedIn, user, convexUser, createUser]);

  // Loading state
  if (!authLoaded || !userLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Not signed in
  if (!isSignedIn || !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vui lòng đăng nhập để tiếp tục</Text>
      </View>
    );
  }

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <PlanningWeb user={user} convexUser={convexUser} />;
  }

  return <PlanningMobile user={user} convexUser={convexUser} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
});
