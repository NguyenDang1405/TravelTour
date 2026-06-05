import { ClerkProvider } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import React, { useRef } from 'react';

import ConfirmDialogProvider, { ConfirmDialogRef } from '@/components/ConfirmDialogProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NativeErrorBoundary } from '../src/shared/components/ErrorBoundary';
import { toastConfig } from '@/components/ToastConfig';
import { setConfirmDialogRef } from '@/utils/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokenCache } from '@/utils/tokenCache';

// Only import reanimated on native platforms
if (Platform.OS !== 'web') {
  require('react-native-reanimated');
}

// Handle global errors (like fontfaceobserver timeout) - XỬ LÝ TRIỆT ĐỂ
// Suppress development warnings (Clerk/Convex/Browser) - chỉ là warnings, không ảnh hưởng chức năng
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Suppress warnings in console
  const originalWarn = console.warn;
  console.warn = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    // Ignore third-party cookie warnings (from browser)
    if (message.includes('Third-party cookie') || message.includes('third-party cookie')) {
      return; // Suppress this warning
    }
    // Ignore Clerk development keys warning
    if (message.includes('Clerk has been loaded with development keys') || 
        message.includes('development keys') && message.includes('Clerk')) {
      return; // Suppress this warning
    }
    originalWarn.apply(console, args);
  };
  
  // Suppress browser console warnings about third-party cookies
  // These come from the browser itself, not from console.warn
  if (typeof window !== 'undefined' && window.console) {
    const originalError = console.error;
    console.error = function(...args: any[]) {
      const message = args[0]?.toString() || '';
      // Ignore third-party cookie errors from browser
      if (message.includes('Third-party cookie') || message.includes('third-party cookie')) {
        return; // Suppress this error
      }
      originalError.apply(console, args);
    };
  }
  // CÁCH 0: Mock fontfaceobserver ngay từ đầu để nó không throw error
  try {
    // Mock FontFaceObserver constructor và methods
    const mockFontFaceObserver = function(this: any, family: string, descriptors?: any) {
      this.family = family;
      this.descriptors = descriptors;
    };
    
    mockFontFaceObserver.prototype.load = function(testString?: string, timeout?: number) {
      // Return resolved promise ngay lập tức, không chờ timeout
      return Promise.resolve();
    };
    
    mockFontFaceObserver.prototype.check = function() {
      return true;
    };
    
    // Override FontFaceObserver nếu đã tồn tại hoặc sẽ được load
    (window as any).FontFaceObserver = mockFontFaceObserver;
    
    // Intercept require/import nếu có
    if (typeof (window as any).require !== 'undefined') {
      const originalRequire = (window as any).require;
      (window as any).require = function(moduleName: string) {
        if (moduleName && (moduleName.includes('fontfaceobserver') || moduleName.includes('FontFaceObserver'))) {
          return mockFontFaceObserver;
        }
        return originalRequire(moduleName);
      };
    }
  } catch (e) {
    // Ignore nếu không mock được
  }

  // CÁCH 1: Tắt hoàn toàn throw trong fontfaceobserver bằng cách override Error constructor
  try {
    const originalErrorConstructor = window.Error;
    const errorConstructorHandler = {
      construct(target: any, args: any[]) {
        try {
          const error = new target(...args);
          const errorMsg = String(error.message || '');
          const errorStack = String(error.stack || '');
          
          // Nếu error từ fontfaceobserver, return một silent error object
          if (
            (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms')) ||
            (errorStack.includes('fontfaceobserver') || errorStack.includes('fontfaceobserver.standalone'))
          ) {
            // Tạo một error object đặc biệt không throw
            const silentError: any = {};
            silentError.name = '';
            silentError.message = '';
            silentError.stack = '';
            silentError.toString = () => '';
            silentError.__suppressError = true;
            return silentError;
          }
          
          return error;
        } catch (e) {
          // Nếu có lỗi khi tạo error, return silent error
          const silentError: any = {};
          silentError.name = '';
          silentError.message = '';
          silentError.stack = '';
          silentError.toString = () => '';
          return silentError;
        }
      }
    };
    
    (window as any).Error = new Proxy(originalErrorConstructor, errorConstructorHandler);
  } catch (e) {
    // Ignore
  }
  // CÁCH 2: Wrap setTimeout để bắt mọi error từ fontfaceobserver
  const originalSetTimeout = window.setTimeout;
  const wrappedSetTimeout = function(callback: Function, delay?: number, ...args: any[]) {
    // Kiểm tra nếu callback từ fontfaceobserver (delay = 6000ms)
    if (typeof callback === 'function' && delay === 6000) {
      // Có thể đây là fontfaceobserver timeout, wrap kỹ hơn
      const wrappedCallback = function(this: any, ...cbArgs: any[]) {
        try {
          const result = callback.apply(this, cbArgs);
          if (result && typeof result.catch === 'function') {
            return result.catch(() => undefined); // Suppress promise errors
          }
          return result;
        } catch (error: any) {
          // Suppress tất cả errors từ callback 6000ms (có thể là fontfaceobserver)
          const errorMsg = String(error?.message || error || '');
          const errorStack = String(error?.stack || '');
          const errorName = String(error?.name || '');
          
          if (
            (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms') || errorStack.includes('timeout exceeded')) ||
            (errorStack.includes('fontfaceobserver') || errorStack.includes('fontfaceobserver.standalone')) ||
            (errorName.includes('timeout'))
          ) {
            // Suppress hoàn toàn - không throw, không log
            return undefined;
          }
          // Nếu không phải fontfaceobserver, throw lại
          throw error;
        }
      };
      return originalSetTimeout.call(window, wrappedCallback, delay, ...args);
    }
    
    // Với các setTimeout khác, vẫn wrap nhưng ít strict hơn
    if (typeof callback === 'function') {
      const wrappedCallback = function(this: any, ...cbArgs: any[]) {
        try {
          const result = callback.apply(this, cbArgs);
          if (result && typeof result.catch === 'function') {
            return result.catch((error: any) => {
              const errorMsg = String(error?.message || error || '');
              const errorStack = String(error?.stack || '');
              if (
                (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms') || errorStack.includes('timeout exceeded')) &&
                (errorMsg.includes('fontfaceobserver') || errorStack.includes('fontfaceobserver'))
              ) {
                return Promise.resolve();
              }
              throw error;
            });
          }
          return result;
        } catch (error: any) {
          const errorMsg = String(error?.message || error || '');
          const errorStack = String(error?.stack || '');
          
          // Kiểm tra fontfaceobserver error
          if (
            (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms') || errorStack.includes('timeout exceeded')) &&
            (errorMsg.includes('fontfaceobserver') || errorStack.includes('fontfaceobserver'))
          ) {
            return undefined; // Suppress
          }
          
          throw error;
        }
      };
      return originalSetTimeout.call(window, wrappedCallback, delay, ...args);
    }
    return originalSetTimeout.call(window, callback, delay, ...args);
  };
  
  // Assign with proper type preservation to maintain setTimeout's full type signature
  (window.setTimeout as any) = Object.assign(wrappedSetTimeout, originalSetTimeout);

  // Suppress fontfaceobserver timeout errors - BẮT Ở MỌI NƠI
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorStr = String(message || '');
    const errorSource = String(source || '');
    const errorStack = String(error?.stack || '');
    const errorName = String(error?.name || '');
    const errorMsg = String(error?.message || '');
    
    // Kiểm tra TẤT CẢ các dấu hiệu của fontfaceobserver timeout
    const hasTimeout = (
      errorStr.includes('timeout exceeded') ||
      errorStr.includes('6000ms') ||
      errorStr.includes('6000') ||
      errorStack.includes('timeout exceeded') ||
      errorStack.includes('6000ms') ||
      errorStack.includes('6000') ||
      errorName.includes('timeout') ||
      errorMsg.includes('timeout exceeded') ||
      errorMsg.includes('6000ms')
    );
    
    const hasFontfaceObserver = (
      errorStr.includes('fontfaceobserver') ||
      errorSource.includes('fontfaceobserver') ||
      errorStack.includes('fontfaceobserver') ||
      errorStack.includes('fontfaceobserver.standalone') ||
      errorSource.includes('fontfaceobserver.standalone') ||
      errorMsg.includes('fontfaceobserver')
    );
    
    if (hasTimeout && hasFontfaceObserver) {
      // Hoàn toàn suppress - return true để prevent default error handling
      return true;
    }
    
    // Let other errors through
    if (originalError) {
      return originalError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Catch unhandled promise rejections - BẮT Ở CAPTURE PHASE
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let shouldSuppress = false;
    
    if (reason) {
      const reasonStr = String(reason);
      const reasonMessage = String(reason?.message || '');
      const reasonStack = String(reason?.stack || '');
      const reasonName = String(reason?.name || '');
      
      const hasTimeout = (
        reasonStr.includes('timeout exceeded') ||
        reasonStr.includes('6000ms') ||
        reasonStr.includes('6000') ||
        reasonMessage.includes('timeout exceeded') ||
        reasonMessage.includes('6000ms') ||
        reasonStack.includes('timeout exceeded') ||
        reasonStack.includes('6000ms') ||
        reasonName.includes('timeout')
      );
      
      const hasFontfaceObserver = (
        reasonStr.includes('fontfaceobserver') ||
        reasonMessage.includes('fontfaceobserver') ||
        reasonStack.includes('fontfaceobserver') ||
        reasonStack.includes('fontfaceobserver.standalone')
      );
      
      if (hasTimeout && hasFontfaceObserver) {
        shouldSuppress = true;
      }
    }
    
    if (shouldSuppress) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true); // Use capture phase để bắt sớm nhất

  // Also override console.error to filter these errors
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const errorMsg = args.map(a => String(a)).join(' ');
    if (
      (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms') || errorMsg.includes('6000')) &&
      errorMsg.includes('fontfaceobserver')
    ) {
      return; // Don't log this error
    }
    originalConsoleError.apply(console, args);
  };

  // Thêm một lớp bảo vệ - override Error constructor để bắt ngay từ đầu
  try {
    const OriginalError = window.Error;
    (window as any).Error = function(this: any, message?: string) {
      const error = new OriginalError(message);
      const errorMsg = String(message || '');
      
      // Nếu là fontfaceobserver timeout error, return một silent error
      if (
        (errorMsg.includes('timeout exceeded') || errorMsg.includes('6000ms')) &&
        errorMsg.includes('fontfaceobserver')
      ) {
        const silentError = new OriginalError();
        Object.defineProperty(silentError, 'message', { value: '', writable: false });
        Object.defineProperty(silentError, 'stack', { value: '', writable: false });
        return silentError;
      }
      
      return error;
    };
    // Copy prototype và static methods
    Object.setPrototypeOf((window as any).Error, OriginalError);
    (window as any).Error.prototype = OriginalError.prototype;
  } catch (e) {
    // Ignore nếu không thể override Error
  }
}

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || Constants.expoConfig?.extra?.convexUrl;
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// Only create Convex client if URL is provided
let convex: ConvexReactClient | null = null;
try {
  if (convexUrl) {
    convex = new ConvexReactClient(convexUrl);
  }
} catch (error) {
  console.error('Failed to create Convex client:', error);
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const confirmDialogRef = useRef<ConfirmDialogRef>(null);

  // Warn if env vars are missing (only in dev)
  if (__DEV__) {
    if (!clerkPublishableKey) {
      console.warn('⚠️ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set');
    }
    if (!convex) {
      console.warn('⚠️ EXPO_PUBLIC_CONVEX_URL is not set');
    }
  }

  // Set confirm dialog ref for global access
  // This will be set by ConfirmDialogProvider itself, but we also set it here as backup
  React.useEffect(() => {
    const checkAndSetRef = () => {
      if (confirmDialogRef.current) {
        console.log('✅ Setting ConfirmDialog ref from _layout');
        setConfirmDialogRef(confirmDialogRef.current);
        return true;
      }
      return false;
    };

    // Try immediately
    if (!checkAndSetRef()) {
      // If not ready, try with a small delay
      const timer = setTimeout(() => {
        if (!checkAndSetRef()) {
          console.warn('⚠️ ConfirmDialog ref is still null after delay');
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const content = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ headerShown: false }} />
        <Stack.Screen name="item-details" options={{ headerShown: false }} />
        <Stack.Screen name="payment-success" options={{ headerShown: false }} />
        <Stack.Screen name="payment-callback" options={{ headerShown: false }} />
        <Stack.Screen name="trip" options={{ headerShown: false }} />
        <Stack.Screen name="blog/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="my-trips" options={{ headerShown: false }} />
        <Stack.Screen name="my-bookings" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );

  return (
    <ErrorBoundary>
      <NativeErrorBoundary>
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          {convex ? (
            <ConvexProvider client={convex}>
              {content}
              <Toast config={toastConfig} />
              <ConfirmDialogProvider ref={confirmDialogRef} />
            </ConvexProvider>
          ) : (
            <>
              {content}
              <Toast config={toastConfig} />
              <ConfirmDialogProvider ref={confirmDialogRef} />
            </>
          )}
        </ClerkProvider>
      </NativeErrorBoundary>
    </ErrorBoundary>
  );
}

// updated
