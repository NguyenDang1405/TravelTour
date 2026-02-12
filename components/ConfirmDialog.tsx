import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  type = 'danger',
}: ConfirmDialogProps) {
  useEffect(() => {
    console.log('🔍 ConfirmDialog - visible:', visible, 'title:', title);
  }, [visible, title]);

  const getTypeColors = () => {
    switch (type) {
      case 'danger':
        return {
          primary: COLORS.error,
          light: COLORS.errorLight,
          icon: 'alert-circle',
        };
      case 'warning':
        return {
          primary: COLORS.warning,
          light: COLORS.warningLight,
          icon: 'warning',
        };
      case 'info':
        return {
          primary: COLORS.info,
          light: COLORS.infoLight,
          icon: 'information-circle',
        };
      default:
        return {
          primary: COLORS.error,
          light: COLORS.errorLight,
          icon: 'alert-circle',
        };
    }
  };

  const colors = getTypeColors();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.light }]}>
            <Ionicons name={colors.icon as any} size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                console.log('🔘 Cancel button clicked');
                onCancel();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                console.log('✅ Confirm button clicked');
                onConfirm();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
    }),
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 400 : width * 0.9,
    padding: SPACING.xl,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        zIndex: 10000,
      },
      default: {
        ...SHADOWS.xl,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
    ...Platform.select({
      web: {
        display: 'flex',
      },
    }),
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
    }),
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
      default: {
        ...SHADOWS.md,
      },
    }),
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
});

