import { useUser, useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '@/convex/_generated/api';
import AIChatMobile from './ai-chat.mobile';
import AIChatWeb from './ai-chat.web';

export default function AIChatScreen() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const createUser = useMutation(api.users.createUser);

  // Debug logging
  useEffect(() => {
    console.log('🔍 AIChatScreen - Auth state:', {
      isSignedIn,
      authLoaded,
      userLoaded,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.emailAddresses?.[0]?.emailAddress,
    });
  }, [isSignedIn, authLoaded, userLoaded, user]);

  // Show loading state while Clerk is loading (but still render to allow chat without login)
  // However, if user is signed in, wait a bit for user object to hydrate
  if (!authLoaded || !userLoaded) {
    console.log('⏳ AIChatScreen - Waiting for Clerk to load...', {
      authLoaded,
      userLoaded,
      isSignedIn,
    });
    // Still render component but with null user - allow chat without login
    // The component will handle the fallback
  } else if (isSignedIn && !user) {
    // User is signed in but user object not loaded yet - this is a timing issue
    console.log('⏳ AIChatScreen - User signed in but user object not loaded yet, waiting...');
    // Still render - user will be loaded soon
  }

  // Lấy user data từ Convex
  const convexUser = useQuery(api.users.getUser, 
    user && user.id ? { clerkId: user.id } : "skip"
  );

  // Debug logging for convexUser
  useEffect(() => {
    console.log('🔍 AIChatScreen - Convex user state:', {
      hasConvexUser: !!convexUser,
      convexUserId: convexUser?._id,
      convexUserEmail: convexUser?.email,
      isUndefined: convexUser === undefined,
      isNull: convexUser === null,
    });
  }, [convexUser]);

  // Tự động tạo Convex user nếu Clerk user đã đăng nhập nhưng chưa có Convex user
  useEffect(() => {
    if (user && user.id && !convexUser && convexUser !== undefined) {
      // convexUser === undefined nghĩa là đang loading, không làm gì
      // convexUser === null nghĩa là không tìm thấy, cần tạo mới
      console.log('🔄 AIChatScreen - User exists but no Convex user, creating...');
      const createConvexUser = async () => {
        try {
          const email = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || "";
          
          // Xử lý name: ưu tiên fullName, nếu không có thì ghép firstName + lastName
          let name = user.fullName || "";
          if (!name && (user.firstName || user.lastName)) {
            name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
          }
          
          // Lấy name từ unsafeMetadata nếu có
          if (!name && user.unsafeMetadata?.fullName) {
            name = String(user.unsafeMetadata.fullName);
          }
          
          // Use convexUser avatar if exists, otherwise fallback to Clerk imageUrl
          const avatar = user.imageUrl || undefined;
          
          if (user.id && email) {
            console.log('🔄 AIChatScreen - Creating/Updating Convex user with:', { clerkId: user.id, email, avatar: avatar ? 'has avatar' : 'no avatar' });
            await createUser({
              clerkId: user.id,
              email,
              name: name || undefined,
              avatar,
            });
            console.log('✅ AIChatScreen - Convex user đã được tạo thành công');
          } else {
            console.warn('⚠️ AIChatScreen - Cannot create Convex user: missing id or email', {
              hasId: !!user.id,
              hasEmail: !!email,
            });
          }
        } catch (error: any) {
          // Ignore errors - có thể user đã tồn tại hoặc có lỗi khác
          console.log('⚠️ AIChatScreen - Không thể tạo Convex user:', error?.message || error);
        }
      };
      
      createConvexUser();
    }
  }, [user, convexUser, createUser]);

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <AIChatWeb user={user} convexUser={convexUser} />;
  }

  return <AIChatMobile user={user} convexUser={convexUser} isSignedIn={isSignedIn || false} />;
}

