import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSignUp, useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { styles } from '@/styles/auth.styles';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; type?: 'signup' | 'signin' }>();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  
  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start resend timer (60 seconds)
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!isSignUpLoaded && !isSignInLoaded) {
        setError('Đang khởi tạo dịch vụ. Vui lòng thử lại sau.');
        setIsLoading(false);
        return;
      }

      const verificationType = params.type || 'signup';
      
      if (verificationType === 'signup' && signUp) {
        const result = await signUp.attemptEmailAddressVerification({
          code: verificationCode,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setSignUpActive?.({ session: result.createdSessionId });
          router.replace('/(tabs)');
        } else {
          throw new Error('Mã xác thực không hợp lệ hoặc đã hết hạn.');
        }
      } else if (verificationType === 'signin' && signIn) {
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: verificationCode,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setSignInActive?.({ session: result.createdSessionId });
          router.replace('/(tabs)');
        } else {
          throw new Error('Mã xác thực không hợp lệ hoặc đã hết hạn.');
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const clerkMessage = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message;
      setError(clerkMessage || 'Mã xác thực không hợp lệ. Vui lòng thử lại.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      if (!isSignUpLoaded && !isSignInLoaded) {
        setError('Đang khởi tạo dịch vụ. Vui lòng thử lại sau.');
        setIsResending(false);
        return;
      }

      const verificationType = params.type || 'signup';
      
      if (verificationType === 'signup' && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (verificationType === 'signin' && signIn) {
        await signIn.prepareFirstFactor({ strategy: 'email_code' } as any);
      }

      // Reset timer
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setError('');
    } catch (err: any) {
      console.error('Resend error:', err);
      const clerkMessage = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message;
      setError(clerkMessage || 'Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView 
        contentContainerStyle={(styles as any).scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.authContent}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={64} color={COLORS.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Xác thực email</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác thực 6 chữ số đến{'\n'}
            <Text style={styles.emailText}>{email || 'email của bạn'}</Text>
          </Text>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                  error && styles.codeInputError,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isLoading || code.join('').length !== 6) && styles.primaryButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading || code.join('').length !== 6}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Xác thực</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Không nhận được mã?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0 || isResending}
              style={styles.resendButton}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text
                  style={[
                    styles.resendButtonText,
                    (resendTimer > 0 || isResending) && styles.resendButtonTextDisabled,
                  ]}
                >
                  {resendTimer > 0 ? `Gửi lại (${resendTimer}s)` : 'Gửi lại mã'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Change Email */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Thay đổi email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

