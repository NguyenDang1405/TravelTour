import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSignIn, useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/auth.styles";
import { Toast } from "@/components/ui/toast";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const clerk = useClerk();
  const [email, setEmail] = useState(params.email || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    // Nếu có token từ deep link, có thể bỏ qua verification
    if (params.token && isSignInLoaded) {
      setNeedsVerification(false);
    } else if (!params.email && !email && isSignInLoaded) {
      // Nếu không có email và không có token, redirect về login
      setToast({
        visible: true,
        message: "Vui lòng yêu cầu khôi phục mật khẩu từ trang đăng nhập.",
        type: 'error',
      });
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 2000);
    } else if (params.email && isSignInLoaded && signIn) {
      // Nếu có email từ params, tự động prepare reset password flow
      // Nhưng chỉ prepare nếu signIn chưa được prepare
      if (signIn.status === null || signIn.status === undefined) {
        signIn.create({
          identifier: params.email,
        }).then((result) => {
          if (result.status === "needs_first_factor") {
            const supportedFactors = result.supportedFirstFactors || [];
            const resetPasswordFactor = supportedFactors.find(
              (factor: any) => factor.strategy === "reset_password_email_code"
            );
            
            if (resetPasswordFactor && (resetPasswordFactor as any).emailAddressId) {
              signIn.prepareFirstFactor({
                strategy: "reset_password_email_code",
                emailAddressId: (resetPasswordFactor as any).emailAddressId,
              } as any);
            } else {
              signIn.prepareFirstFactor({
                strategy: "reset_password_email_code",
              } as any);
            }
          }
        }).catch(() => {
          // Ignore errors, user sẽ có thể resend code
        });
      }
    }
  }, [params.token, params.email, email, isSignInLoaded, router, signIn]);

  const validatePasswordPolicy = (pwd: string) => {
    if (pwd.length < 8) {
      return "Mật khẩu phải dài tối thiểu 8 ký tự.";
    }
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return "Mật khẩu cần bao gồm cả chữ và số.";
    }
    if (!/[!@#$%^&*()_\-\+=\[{\]};:'",.<>/?\\|`~]/.test(pwd)) {
      return "Mật khẩu nên có ít nhất một ký tự đặc biệt để đạt mức an toàn Clerk yêu cầu.";
    }
    return "";
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setToast({
        visible: true,
        message: "Vui lòng nhập mã xác thực từ email (6 ký tự).",
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

    setIsLoading(true);

    try {
      const userEmail = email || params.email || "";
      if (!userEmail) {
        throw new Error("Email không được để trống.");
      }

      // Kiểm tra xem signIn đã được prepare chưa
      // Nếu chưa, tạo signIn flow và prepare
      if (signIn.status === null || signIn.status === undefined) {
        // Tạo signIn flow với email
        const result = await signIn.create({
          identifier: userEmail,
        });

        // Prepare reset password strategy với email_address_id nếu cần
        if (result.status === "needs_first_factor") {
          const supportedFactors = result.supportedFirstFactors || [];
          const resetPasswordFactor = supportedFactors.find(
            (factor: any) => factor.strategy === "reset_password_email_code"
          );
          
          if (resetPasswordFactor && (resetPasswordFactor as any).emailAddressId) {
            await signIn.prepareFirstFactor({
              strategy: "reset_password_email_code",
              emailAddressId: (resetPasswordFactor as any).emailAddressId,
            } as any);
          } else {
            await signIn.prepareFirstFactor({
              strategy: "reset_password_email_code",
            } as any);
          }
        }
      } else if (signIn.status !== "needs_first_factor") {
        // Nếu status không phải needs_first_factor, có thể cần prepare lại
        const supportedFactors = signIn.supportedFirstFactors || [];
        const resetPasswordFactor = supportedFactors.find(
          (factor: any) => factor.strategy === "reset_password_email_code"
        );
        
        if (resetPasswordFactor && (resetPasswordFactor as any).emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
            emailAddressId: (resetPasswordFactor as any).emailAddressId,
          } as any);
        } else {
          await signIn.prepareFirstFactor({
            strategy: "reset_password_email_code",
          } as any);
        }
      }

      // Verify code - chỉ attempt nếu status là needs_first_factor
      if (signIn.status === "needs_first_factor") {
        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: verificationCode,
        });

        if (result.status === "needs_new_password") {
          setNeedsVerification(false);
          setToast({
            visible: true,
            message: "Mã xác thực hợp lệ. Vui lòng nhập mật khẩu mới.",
            type: 'success',
          });
        } else {
          throw new Error("Mã xác thực không hợp lệ hoặc đã hết hạn.");
        }
      } else {
        throw new Error("Vui lòng yêu cầu gửi lại mã xác thực.");
      }
    } catch (error: any) {
      console.error("Không thể xác thực mã.");
      const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message;
      setToast({
        visible: true,
        message: clerkMessage || "Mã xác thực không hợp lệ. Vui lòng thử lại.",
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setToast({
        visible: true,
        message: "Vui lòng nhập đầy đủ mật khẩu mới.",
        type: 'error',
      });
      return;
    }

    if (password !== confirmPassword) {
      setToast({
        visible: true,
        message: "Mật khẩu xác nhận không khớp.",
        type: 'error',
      });
      return;
    }

    const passwordPolicyMessage = validatePasswordPolicy(password);
    if (passwordPolicyMessage) {
      setToast({
        visible: true,
        message: passwordPolicyMessage,
        type: "info",
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

    setIsLoading(true);

    try {
      // Nếu có token từ deep link
      if (params.token) {
        const result = await signIn.create({
          identifier: params.token,
        });

        if (result.status === "needs_new_password") {
          const resetResult = await signIn.resetPassword({
            password: password,
          });

          // QUAN TRỌNG: Sign out user sau khi reset password để tránh tự động đăng nhập
          // Clerk có thể tự động tạo session sau resetPassword, nên phải sign out
          try {
            await clerk.signOut();
          } catch (e) {
            // Ignore nếu sign out fail
          }
          
          setToast({
            visible: true,
            message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.",
            type: 'success',
          });

          // Redirect ngay lập tức, không đợi
          router.replace("/(auth)/login");
          return;
        }
      }

      // Nếu đã verify code, reset password
      if (signIn.status === "needs_new_password") {
        const resetResult = await signIn.resetPassword({
          password: password,
        });

        // QUAN TRỌNG: Sign out user sau khi reset password để tránh tự động đăng nhập
        // Clerk có thể tự động tạo session sau resetPassword, nên phải sign out
        try {
          await clerk.signOut();
        } catch (e) {
          // Ignore nếu sign out fail
        }
        
        setToast({
          visible: true,
          message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.",
          type: 'success',
        });

        // Redirect ngay lập tức, không đợi
        router.replace("/(auth)/login");
      } else {
        throw new Error("Vui lòng xác thực mã từ email trước.");
      }
    } catch (error: any) {
      console.error("Không thể đặt lại mật khẩu.");
      const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message;
      setToast({
        visible: true,
        message: clerkMessage || "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={Platform.OS === 'web' ? [] : ['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} translucent={false} />
      <View style={[styles.formContainer, { flex: 1, backgroundColor: COLORS.surface }]}>
        <ScrollView 
          style={styles.formScrollView}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Icon */}
          <View style={styles.branding}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Ionicons 
                  name={needsVerification ? "mail-outline" : "lock-closed-outline"} 
                  size={40} 
                  color={COLORS.primary} 
                />
              </View>
            </View>
            <Text style={styles.brandName}>Đặt lại mật khẩu</Text>
            <Text style={styles.brandTagline}>
              {needsVerification 
                ? "Nhập mã xác thực 6 ký tự đã được gửi đến email của bạn" 
                : "Tạo mật khẩu mới an toàn cho tài khoản của bạn"}
            </Text>
          </View>

          {/* Email Input (nếu cần) */}
          {needsVerification && !email && !params.email && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textSecondary}
                underlineColorAndroid="transparent"
              />
            </View>
          )}

          {/* Verification Code Input */}
          {needsVerification && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mã xác thực</Text>
              <View style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 8,
                position: 'relative',
              }}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 56,
                      backgroundColor: COLORS.surface,
                      borderWidth: 2,
                      borderColor: verificationCode.length > index 
                        ? COLORS.primary 
                        : COLORS.surfaceLight,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: COLORS.text,
                    }}>
                      {verificationCode[index] || ''}
                    </Text>
                  </View>
                ))}
                <TextInput
                  ref={otpInputRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0,
                    fontSize: 1,
                    color: 'transparent',
                  }}
                  placeholder="Nhập mã 6 ký tự từ email"
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <Text style={[styles.inputLabel, { fontSize: 13, marginTop: 8, fontWeight: '400', color: COLORS.textSecondary }]}>
                <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} /> {' '}
                Mã đã được gửi đến {email || params.email || "email của bạn"}
              </Text>
            </View>
          )}

          {/* Password Input */}
          {!needsVerification && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={COLORS.textSecondary}
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                    autoCorrect={false}
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor={COLORS.textSecondary}
                    underlineColorAndroid="transparent"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={needsVerification ? handleVerifyCode : handleResetPassword}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {needsVerification ? "Xác thực mã" : "Đặt lại mật khẩu"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend Code Button */}
          {needsVerification && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  const userEmail = email || params.email || "";
                  if (!userEmail) {
                    setToast({
                      visible: true,
                      message: "Vui lòng nhập email trước.",
                      type: 'error',
                    });
                    return;
                  }
                  try {
                    if (signIn) {
                      const result = await signIn.create({
                        identifier: userEmail,
                      });
                      
                      if (result.status === "needs_first_factor") {
                        const supportedFactors = result.supportedFirstFactors || [];
                        const resetPasswordFactor = supportedFactors.find(
                          (factor: any) => factor.strategy === "reset_password_email_code"
                        );
                        
                        if (resetPasswordFactor && (resetPasswordFactor as any).emailAddressId) {
                          await signIn.prepareFirstFactor({
                            strategy: "reset_password_email_code",
                            emailAddressId: (resetPasswordFactor as any).emailAddressId,
                          } as any);
                        } else {
                          await signIn.prepareFirstFactor({
                            strategy: "reset_password_email_code",
                          } as any);
                        }
                      }
                      
                      setToast({
                        visible: true,
                        message: "Đã gửi lại mã xác thực. Vui lòng kiểm tra email.",
                        type: 'success',
                      });
                    }
                  } catch (error: any) {
                    const errorMsg = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || "Không thể gửi lại mã. Vui lòng thử lại.";
                    setToast({
                      visible: true,
                      message: errorMsg,
                      type: 'error',
                    });
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.forgotPasswordText, { marginLeft: 6 }]}>Gửi lại mã xác thực</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to Login */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
              }}
            >
              <Ionicons name="arrow-back-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.forgotPasswordText, { marginLeft: 6, color: COLORS.textSecondary }]}>
                Quay lại đăng nhập
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

