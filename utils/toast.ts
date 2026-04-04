import Toast from 'react-native-toast-message';
import { COLORS } from '@/constants/theme';
import React from 'react';
import { AppRegistry } from 'react-native';

/**
 * Custom toast helper functions with beautiful UI
 */

export const showToast = {
  success: (message: string, title?: string) => {
    Toast.show({
      type: 'success',
      text1: title || 'Thành công',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  },

  error: (message: string, title?: string) => {
    Toast.show({
      type: 'error',
      text1: title || 'Lỗi',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  info: (message: string, title?: string) => {
    Toast.show({
      type: 'info',
      text1: title || 'Thông tin',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  },

  warning: (message: string, title?: string) => {
    Toast.show({
      type: 'warning',
      text1: title || 'Cảnh báo',
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      autoHide: true,
      topOffset: 60,
    });
  },
};

// Global state for confirmation dialog
let confirmDialogRef: {
  show: (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
  }) => Promise<boolean>;
} | null = null;

export const setConfirmDialogRef = (ref: typeof confirmDialogRef) => {
  confirmDialogRef = ref;
};

/**
 * Show confirmation dialog using custom beautiful modal
 * Returns a promise that resolves to true if confirmed, false otherwise
 */
export const showConfirm = (
  message: string,
  title: string = 'Xác nhận',
  type: 'danger' | 'warning' | 'info' = 'danger'
): Promise<boolean> => {
  console.log('🔍 showConfirm called - title:', title, 'hasRef:', !!confirmDialogRef);
  
  if (confirmDialogRef && typeof confirmDialogRef.show === 'function') {
    try {
      console.log('✅ Using custom ConfirmDialog');
      return confirmDialogRef.show({
        title,
        message,
        type,
      });
    } catch (error) {
      console.error('❌ Error using custom ConfirmDialog, falling back:', error);
    }
  }

  // Fallback to native dialogs if ref is not set
  console.log('⚠️ Using fallback native dialog');
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.confirm) {
      // Web: use window.confirm
      const confirmed = window.confirm(`${title}\n\n${message}`);
      resolve(confirmed);
    } else {
      // Mobile: use Alert (import from react-native)
      const { Alert } = require('react-native');
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Xác nhận',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    }
  });
};

