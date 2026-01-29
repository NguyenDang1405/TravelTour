import { Toast } from "@/components/ui/toast";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/store/useAuthStore";
import { styles } from "@/styles/auth.styles";
import { useAuth, useSignIn, useSignUp, useSSO, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";

WebBrowser.maybeCompleteAuthSession();

// Will be calculated in component

// Travel images data with real images from Unsplash
const travelImages = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    title: 'Khám phá thế giới',
    subtitle: 'Du lịch không giới hạn',
    description: 'Trải nghiệm những điểm đến tuyệt vời',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    title: 'Bãi biển tuyệt đẹp',
    subtitle: 'Thư giãn và tận hưởng',
    description: 'Nghỉ dưỡng tại những bãi biển đẹp nhất',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    title: 'Núi non hùng vĩ',
    subtitle: 'Trải nghiệm thiên nhiên',
    description: 'Chinh phục những đỉnh núi cao',
  },
  {
    id: 4,
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
    title: 'Thành phố cổ kính',
    subtitle: 'Khám phá văn hóa',
    description: 'Tìm hiểu lịch sử và văn hóa địa phương',
  },
  {
    id: 5,
    imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80',
    title: 'Hoàng hôn lãng mạn',
    subtitle: 'Khoảnh khắc đáng nhớ',
    description: 'Lưu giữ những kỷ niệm đẹp',
  },
];

export default function Login() {
  const { startSSOFlow } = useSSO();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { setUser } = useAuthStore();
  const router = useRouter();
  const createUserInConvex = useMutation(api.users.createUser);
  useWarmUpBrowser();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Check if user is already signed in và tạo user trong Convex nếu chưa có
  useEffect(() => {
    if (isLoaded && isSignedIn && user && user.id) {
      console.log('✅ Login - User authenticated:', {
        userId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress,
        isLoaded,
        isSignedIn,
      });
      
      setUser(user);
      setIsGoogleLoading(false); // Reset Google loading when authenticated
      setIsFormLoading(false); // Reset form loading when authenticated
      setNeedsEmailVerification(false); // Reset verification state
      setVerificationCode(""); // Reset verification code
      
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
            console.log('🔄 Login - Creating Convex user...');
            await createUserInConvex({
              clerkId,
              email,
              name: name || undefined,
              avatar: avatar || undefined,
            });
            console.log('✅ Login - Convex user created/synced');
          }
        } catch (error) {
          // Ignore errors - có thể user đã tồn tại
          console.log("⚠️ Login - User đã tồn tại trong Convex hoặc có lỗi:", error);
        }
      };
      
      // Sync user to Convex first, then redirect
      syncUserToConvex().then(() => {
        // Wait a bit to ensure Clerk has fully hydrated user object
        setTimeout(() => {
          console.log('🔄 Login - Redirecting to tabs...');
          router.replace("/(tabs)");
        }, 500); // Wait 500ms for Clerk to fully hydrate
      });
    }
  }, [isLoaded, isSignedIn, user, router, setUser, createUserInConvex]);

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({ 
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/sso-callback"),
      });

      if (setActive && createdSessionId) {
        await setActive({ session: createdSessionId });
        // Redirect will be handled by useEffect checking isSignedIn
      }
    } catch (error: any) {
      console.error("Không thể đăng nhập Google vào lúc này.");
      if (error?.message?.includes('redirect') || error?.code === 'redirect') {
        return;
      }
      setIsGoogleLoading(false);
      setToast({
        visible: true,
        message: "Đăng nhập thất bại. Vui lòng thử lại.",
        type: 'error',
      });
    }
  };

  const validatePasswordPolicy = (password: string) => {
    if (password.length < 8) {
      return "Mật khẩu phải dài tối thiểu 8 ký tự.";
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Mật khẩu cần bao gồm cả chữ và số.";
    }
    if (!/[!@#$%^&*()_\-\+=\[{\]};:'",.<>/?\\|`~]/.test(password)) {
      return "Mật khẩu nên có ít nhất một ký tự đặc biệt để đạt mức an toàn Clerk yêu cầu.";
    }
    return "";
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = forgotPasswordEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setToast({
        visible: true,
        message: "Vui lòng nhập email của bạn",
        type: 'error',
      });
      return;
    }

    if (!signIn || !isSignInLoaded) {
      setToast({
        visible: true,
        message: "Đang khởi tạo dịch vụ. Vui lòng thử lại sau.",
        type: 'info',
      });
      return;
    }

    setIsForgotPasswordLoading(true);
    
    try {
      // Tạo password reset flow với Clerk
      // Bước 1: Tạo signIn với email để bắt đầu flow
      const result = await signIn.create({
        identifier: trimmedEmail,
      });

      // Bước 2: Kiểm tra status và prepare reset password strategy
      if (result.status === "complete") {
        // Nếu đã complete, có thể user đã đăng nhập rồi
        throw new Error("Bạn đã đăng nhập. Vui lòng đăng xuất trước khi đặt lại mật khẩu.");
      }

      // Prepare reset password strategy
      // Thử prepare với emailAddressId nếu có, nếu không thì prepare bình thường
      const supportedFactors = result.supportedFirstFactors || signIn.supportedFirstFactors || [];
      const resetPasswordFactor = supportedFactors.find(
        (factor: any) => factor.strategy === "reset_password_email_code"
      );

      if (resetPasswordFactor && (resetPasswordFactor as any).emailAddressId) {
        // Có emailAddressId, sử dụng nó
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: (resetPasswordFactor as any).emailAddressId,
        } as any);
      } else {
        // Không có emailAddressId, prepare bình thường - chỉ có thể làm được nếu có emailAddressId trong result
        // Thử lấy emailAddressId từ result
        const emailAddressId = (result as any).emailAddressId;
        if (emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
            emailAddressId: emailAddressId,
          } as any);
        } else {
          // Fallback: thử prepare mà không có emailAddressId (có thể sẽ fail)
          try {
            await signIn.prepareFirstFactor({
              strategy: "reset_password_email_code",
            } as any);
          } catch {
            throw new Error("Không thể khởi tạo khôi phục mật khẩu. Vui lòng kiểm tra email đã được xác thực.");
          }
        }
      }

      // Clerk đã gửi email với code
      setToast({
        visible: true,
        message: "Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.",
        type: 'success',
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
      
      // Redirect đến màn hình reset password để nhập code
      router.push({
        pathname: "/(auth)/reset-password",
        params: { email: trimmedEmail },
      });
    } catch (error: any) {
      console.error("Không thể gửi email khôi phục mật khẩu.", error);
      
      // Lấy thông báo lỗi từ Clerk
      let errorMessage = "Không thể gửi email khôi phục mật khẩu. Vui lòng thử lại.";
      
      if (error?.errors && error.errors.length > 0) {
        errorMessage = error.errors[0].longMessage || error.errors[0].message || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Một số lỗi phổ biến và thông báo thân thiện hơn
      if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
        errorMessage = "Email này chưa được đăng ký trong hệ thống.";
      } else if (errorMessage.includes("email_address_id") || errorMessage.includes("emailAddressId") || errorMessage.includes("email address")) {
        // Lỗi email_address_id - có thể do email chưa verify hoặc cấu hình Clerk
        errorMessage = "Email này chưa được xác thực hoặc không tồn tại trong hệ thống. Vui lòng kiểm tra lại email hoặc đăng ký tài khoản mới.";
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
        errorMessage = "Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một chút rồi thử lại.";
      } else if (errorMessage.includes("strategy") || errorMessage.includes("not allowed")) {
        errorMessage = "Tính năng khôi phục mật khẩu chưa được kích hoạt. Vui lòng liên hệ hỗ trợ.";
      } else if (errorMessage.includes("already signed in") || errorMessage.includes("đã đăng nhập")) {
        errorMessage = "Bạn đã đăng nhập. Vui lòng đăng xuất trước khi đặt lại mật khẩu.";
      }
      
      setToast({
        visible: true,
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setToast({
        visible: true,
        message: "Vui lòng nhập mã xác thực 6 ký tự từ email.",
        type: 'error',
      });
      return;
    }

    if (!signUp || !isSignUpLoaded) {
      setToast({
        visible: true,
        message: "Đang khởi tạo dịch vụ. Vui lòng thử lại sau.",
        type: 'info',
      });
      return;
    }

    setIsFormLoading(true);

    try {
      // Verify email code
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete" && result.createdSessionId) {
        // Đăng ký hoàn tất - có session, set active và redirect vào app
        await setSignUpActive?.({ session: result.createdSessionId });
        setToast({
          visible: true,
          message: "Đăng ký thành công!",
          type: 'success',
        });
        // Redirect sẽ được xử lý bởi useEffect khi isSignedIn thay đổi
        return;
      } else {
        throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn.");
      }
    } catch (error: any) {
      console.error("Không thể xác thực email.");
      const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message;
      setToast({
        visible: true,
        message: clerkMessage || "Mã xác thực không hợp lệ. Vui lòng thử lại.",
        type: 'error',
      });
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Nếu đang ở bước verify email, xử lý verify
    if (needsEmailVerification && isSignUp) {
      await handleVerifyEmail();
      return;
    }

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedFullName = formData.fullName.trim();

    // Validation - nếu đang verify email thì không cần password
    if (!trimmedEmail || (!needsEmailVerification && !formData.password) || (isSignUp && !needsEmailVerification && !trimmedFullName)) {
      setToast({
        visible: true,
        message: "Vui lòng nhập đầy đủ thông tin hợp lệ",
        type: 'error',
      });
      return;
    }

    let fullNameParts: string[] = [];
    if (isSignUp && !needsEmailVerification) {
      fullNameParts = trimmedFullName.split(" ").filter(Boolean);
      if (fullNameParts.length < 2) {
        setToast({
          visible: true,
          message: "Vui lòng nhập họ và tên đầy đủ (ít nhất hai từ).",
          type: 'info',
        });
        return;
      }
    }

    if (isSignUp && (!signUp || !isSignUpLoaded)) {
      setToast({
        visible: true,
        message: "Đang khởi tạo dịch vụ đăng ký. Vui lòng thử lại sau.",
        type: 'info',
      });
      return;
    }

    if (!isSignUp && (!signIn || !isSignInLoaded)) {
      setToast({
        visible: true,
        message: "Đang khởi tạo dịch vụ đăng nhập. Vui lòng thử lại sau.",
        type: 'info',
      });
      return;
    }

    // Chỉ validate password nếu không đang verify email
    if (!needsEmailVerification) {
      const passwordPolicyMessage = validatePasswordPolicy(formData.password);
      if (passwordPolicyMessage) {
        setToast({
          visible: true,
          message: passwordPolicyMessage,
          type: "info",
        });
        return;
      }
    }

    setIsFormLoading(true);

    try {
      if (isSignUp && signUp) {
        const result = await signUp.create({
          emailAddress: trimmedEmail,
          password: formData.password,
          unsafeMetadata: {
            fullName: trimmedFullName,
          },
        });

        if (result.status === "complete" && result.createdSessionId) {
          // Đăng ký thành công - có session, set active và redirect vào app
          await setSignUpActive?.({ session: result.createdSessionId });
          
          // Tạo user trong Convex sau khi đăng ký thành công
          try {
            // Lấy user info từ Clerk sau khi setActive - sử dụng useUser hook
            const clerkUser = user;
            if (clerkUser) {
              const clerkId = clerkUser.id;
              const email = trimmedEmail;
              const name = trimmedFullName || undefined;
              
              await createUserInConvex({
                clerkId,
                email,
                name,
              });
            }
          } catch (error) {
            // Ignore errors - có thể user đã tồn tại hoặc sẽ được tạo sau
            console.log("Không thể tạo user trong Convex ngay:", error);
          }
          
          setToast({
            visible: true,
            message: "Đăng ký thành công!",
            type: 'success',
          });
          // Redirect sẽ được xử lý bởi useEffect khi isSignedIn thay đổi
          return;
        }

        // Kiểm tra nếu cần verify email
        // result.nextStep không tồn tại trên SignUpResource, kiểm tra status và missingRequirements khác
        const missingRequirements = (result as any).missingRequirements || [];
        if (result.status !== "complete" || missingRequirements.includes("email_address_verification")) {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setNeedsEmailVerification(true);
          setToast({
            visible: true,
            message: "Đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra và nhập mã.",
            type: 'info',
          });
          return;
        }

        // Nếu status không phải complete và không phải email verification
        if (result.status !== "complete") {
          const missing = (result as any).missingRequirements || [];
          throw new Error(`Đăng ký chưa hoàn tất. Thiếu: ${missing.join(", ")}`);
        }

        throw new Error("Đăng ký chưa hoàn tất");
      }

      if (!isSignUp && signIn) {
        const result = await signIn.create({
          identifier: trimmedEmail,
          password: formData.password,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setSignInActive?.({ session: result.createdSessionId });
          
          // Đảm bảo user tồn tại trong Convex (nếu chưa có thì tạo)
          try {
            // Lấy user info từ Clerk sau khi setActive - sử dụng useUser hook thay vì signIn.user
            // signIn.user không tồn tại trong Clerk API, sử dụng user từ useUser hook
            const clerkUser = user;
            if (clerkUser) {
              const clerkId = clerkUser.id;
              const email = trimmedEmail;
              
              // Xử lý name: ưu tiên fullName, nếu không có thì ghép firstName + lastName
              let name = clerkUser.fullName || "";
              if (!name && (clerkUser.firstName || clerkUser.lastName)) {
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
              }
              
              // Lấy name từ unsafeMetadata nếu có (từ đăng ký thông thường)
              if (!name && clerkUser.unsafeMetadata?.fullName) {
                name = String(clerkUser.unsafeMetadata.fullName);
              }
              
              const avatar = clerkUser.imageUrl || undefined;
              
              await createUserInConvex({
                clerkId,
                email,
                name: name || undefined,
                avatar,
              });
            }
          } catch (error) {
            // Ignore errors - có thể user đã tồn tại
            console.log("User đã tồn tại trong Convex hoặc có lỗi:", error);
          }
          
          setToast({
            visible: true,
            message: "Đăng nhập thành công!",
            type: 'success',
          });
          return;
        }

        if (result.status === "needs_first_factor") {
          setToast({
            visible: true,
            message: "Vui lòng hoàn tất bước xác thực bổ sung.",
            type: 'info',
          });
          return;
        }

        throw new Error("Đăng nhập chưa hoàn tất");
      }
    } catch (error: any) {
      console.error("Xử lý biểu mẫu đăng nhập/đăng ký thất bại.");
      const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message;
      setToast({
        visible: true,
        message: clerkMessage || (isSignUp ? "Đăng ký thất bại. Vui lòng thử lại." : "Đăng nhập thất bại. Vui lòng thử lại."),
        type: 'error',
      });
    } finally {
      setIsFormLoading(false);
    }
  };

  // Remove old static imageWidth calculation
  useEffect(() => {
    // Width is now handled by onLayout event of imageContainer
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (Platform.OS === 'web' && imageWidth > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => {
          const next = prev + 1;
          
          // Animate to the next slide
          scrollViewRef.current?.scrollTo({
            x: next * imageWidth,
            animated: true,
          });

          // If we reached the cloned first slide at the end
          if (next === travelImages.length) {
            // Wait for scroll animation to finish (approx 500ms), then silently snap to real first slide
            setTimeout(() => {
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                  x: 0,
                  animated: false,
                });
              }
            }, 600);
            return 0; // State is updated to 0 so dots highlight correctly
          }

          return next;
        });
      }, 4000); // Change image every 4 seconds

      return () => clearInterval(interval);
    }
  }, [imageWidth]);

  const handleScroll = (event: any) => {
    if (imageWidth > 0) {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / imageWidth);
      const normalizedIndex = index % travelImages.length;
      if (normalizedIndex !== currentImageIndex) {
        setCurrentImageIndex(normalizedIndex);
      }
    }
  };

  const handleImageLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== imageWidth) {
      setImageWidth(width);
    }
  };

  const goToImage = (index: number) => {
    if (imageWidth > 0) {
      setCurrentImageIndex(index);
      scrollViewRef.current?.scrollTo({
        x: index * imageWidth,
        animated: true,
      });
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (isSignedIn && user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'web' ? [] : ['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F4C75" translucent={false} />
      <View style={styles.mainContainer}>
        {/* LEFT SIDE - FORM */}
        <View style={styles.formContainer}>
          <ScrollView 
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.brandName}>Travel Tour</Text>
            <Text style={styles.brandTagline}>Explore More. Experience Life.</Text>
          </View>

          {/* Toggle Buttons */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
              onPress={() => {
                setIsSignUp(true);
                setNeedsEmailVerification(false);
                setVerificationCode("");
              }}
            >
              <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                Đăng ký
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
              onPress={() => {
                setIsSignUp(false);
                setNeedsEmailVerification(false);
                setVerificationCode("");
              }}
            >
              <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                Đăng nhập
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Bắt đầu hành trình của bạn</Text>
          <Text style={styles.subHeading}>Đăng {isSignUp ? 'ký' : 'nhập'} để tiếp tục</Text>

          {/* Google Login */}
          <TouchableOpacity 
            style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={COLORS.white} />
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form Fields */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên đầy đủ"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập email của bạn"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textSecondary}
              underlineColorAndroid="transparent"
            />
          </View>

          {/* Email Verification Code Input */}
          {needsEmailVerification && isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mã xác thực email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã 6 ký tự từ email"
                value={verificationCode}
                onChangeText={(text) => setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={COLORS.textSecondary}
                underlineColorAndroid="transparent"
                autoFocus
              />
              <Text style={[styles.inputLabel, { fontSize: 12, marginTop: 4, fontWeight: '400' }]}>
                Mã xác thực đã được gửi đến {formData.email}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!signUp || !isSignUpLoaded) return;
                  try {
                    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                    setToast({
                      visible: true,
                      message: "Đã gửi lại mã xác thực. Vui lòng kiểm tra email.",
                      type: 'success',
                    });
                  } catch {
                    setToast({
                      visible: true,
                      message: "Không thể gửi lại mã. Vui lòng thử lại.",
                      type: 'error',
                    });
                  }
                }}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Gửi lại mã xác thực</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Password Input - chỉ hiện khi không cần verify email */}
          {!needsEmailVerification && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                placeholderTextColor={COLORS.textSecondary}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* Remember Me & Forgot Password */}
          {!isSignUp && (
            <View style={styles.authActionsContainer}>
          <TouchableOpacity
            style={styles.rememberContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
            </View>
            <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
          </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowForgotPassword(true)}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
          )}

          {Platform.OS === "web" && (
            <View nativeID="clerk-captcha" style={styles.captchaPlaceholder} />
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isFormLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isFormLoading}
          >
            {isFormLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>{isSignUp ? "Đăng ký" : "Đăng nhập"}</Text>
            )}
          </TouchableOpacity>
          </ScrollView>
        </View>

        {/* RIGHT SIDE - IMAGE CAROUSEL */}
        {Platform.OS === 'web' && (
          <View style={styles.imageContainer} onLayout={handleImageLayout}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.carouselContainer}
            >
              {[...travelImages, { ...travelImages[0], id: 'clone' }].map((image, index) => (
                <View
                  key={`${image.id}-${index}`}
                  style={[
                    styles.imageSlide,
                    imageWidth > 0 ? { width: imageWidth } : {},
                  ]}
                >
                  {/* Real Image */}
                  <Image
                    source={{ uri: image.imageUrl }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                  
                  {/* Dark Overlay for better text readability */}
                  <View style={styles.imageOverlay} />
                  
                  {/* Beautiful Border */}
                  <View style={styles.imageBorderOuter} />
                  <View style={styles.imageBorderInner} />
                  
                  {/* Content Overlay */}
                  <View style={styles.imageContent}>
                    <Text style={styles.imageTitle}>{image.title}</Text>
                    <Text style={styles.imageSubtitle}>{image.subtitle}</Text>
                    <View style={styles.imageDescriptionContainer}>
                      <Text style={styles.imageDescription}>{image.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {travelImages.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index && styles.dotActive,
                  ]}
                  onPress={() => goToImage(index)}
                />
              ))}
            </View>

            {/* Navigation Arrows */}
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowLeft]}
              onPress={() => goToImage((currentImageIndex - 1 + travelImages.length) % travelImages.length)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowRight]}
              onPress={() => goToImage((currentImageIndex + 1) % travelImages.length)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quên mật khẩu</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Nhập email của bạn để nhận link khôi phục mật khẩu.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textSecondary}
                underlineColorAndroid="transparent"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isForgotPasswordLoading && styles.submitButtonDisabled]}
              onPress={handleForgotPassword}
              activeOpacity={0.8}
              disabled={isForgotPasswordLoading}
            >
              {isForgotPasswordLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Gửi email khôi phục</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
