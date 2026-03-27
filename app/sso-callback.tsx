import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function SSOCallback() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { setUser } = useAuthStore();
  const createUserInConvex = useMutation(api.users.createUser);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        // Set user in store
        setUser(user);
        
        // Tự động tạo user trong Convex nếu chưa có
        const syncUserToConvex = async () => {
          try {
            const clerkId = user.id;
            const email = user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || "";
            
            // Xử lý name: ưu tiên fullName, nếu không có thì ghép firstName + lastName
            let name = user.fullName || "";
            if (!name && (user.firstName || user.lastName)) {
              name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
            }
            
            // Lấy name từ unsafeMetadata nếu có (từ đăng ký thông thường)
            if (!name && user.unsafeMetadata?.fullName) {
              name = String(user.unsafeMetadata.fullName);
            }
            
            const avatar = user.imageUrl || "";
            
            if (clerkId && email) {
              await createUserInConvex({
                clerkId,
                email,
                name: name || undefined,
                avatar: avatar || undefined,
              });
            }
          } catch (error) {
            // Ignore errors - có thể user đã tồn tại
            console.log("User đã tồn tại trong Convex hoặc có lỗi:", error);
          }
        };
        
        syncUserToConvex();
        // Redirect to main app
        router.replace('/(tabs)');
      } else {
        // OAuth failed or cancelled, redirect back to login
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1000);
      }
    }
  }, [isLoaded, isSignedIn, user, router, setUser, createUserInConvex]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>Đang xử lý đăng nhập...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: 16,
  },
});

