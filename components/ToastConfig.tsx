import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';

/**
 * Custom Toast Configuration with beautiful UI matching app theme
 */
export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.successToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderLeadingIcon={() => (
        <View style={[styles.iconContainer, styles.successIconContainer]}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>
      )}
      text1NumberOfLines={1}
      text2NumberOfLines={3}
    />
  ),

  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[styles.baseToast, styles.errorToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderLeadingIcon={() => (
        <View style={[styles.iconContainer, styles.errorIconContainer]}>
          <Ionicons name="close-circle" size={24} color={COLORS.error} />
        </View>
      )}
      text1NumberOfLines={1}
      text2NumberOfLines={3}
    />
  ),

  info: (props: any) => (
    <InfoToast
      {...props}
      style={[styles.baseToast, styles.infoToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderLeadingIcon={() => (
        <View style={[styles.iconContainer, styles.infoIconContainer]}>
          <Ionicons name="information-circle" size={24} color={COLORS.info} />
        </View>
      )}
      text1NumberOfLines={1}
      text2NumberOfLines={3}
    />
  ),

  warning: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.warningToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderLeadingIcon={() => (
        <View style={[styles.iconContainer, styles.warningIconContainer]}>
          <Ionicons name="warning" size={24} color={COLORS.warning} />
        </View>
      )}
      text1NumberOfLines={1}
      text2NumberOfLines={3}
    />
  ),
};

const styles = StyleSheet.create({
  baseToast: {
    height: 'auto',
    minHeight: 60,
    width: '90%',
    maxWidth: Platform.OS === 'web' ? 400 : '90%',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  successToast: {
    backgroundColor: COLORS.white,
    borderLeftColor: COLORS.success,
    borderWidth: 1,
    borderColor: COLORS.successLight,
  },
  errorToast: {
    backgroundColor: COLORS.white,
    borderLeftColor: COLORS.error,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  infoToast: {
    backgroundColor: COLORS.white,
    borderLeftColor: COLORS.info,
    borderWidth: 1,
    borderColor: COLORS.infoLight,
  },
  warningToast: {
    backgroundColor: COLORS.white,
    borderLeftColor: COLORS.warning,
    borderWidth: 1,
    borderColor: COLORS.warningLight,
  },
  contentContainer: {
    paddingHorizontal: SPACING.sm,
    flex: 1,
  },
  text1: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  text2: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  successIconContainer: {
    backgroundColor: COLORS.successLight,
  },
  errorIconContainer: {
    backgroundColor: COLORS.errorLight,
  },
  infoIconContainer: {
    backgroundColor: COLORS.infoLight,
  },
  warningIconContainer: {
    backgroundColor: COLORS.warningLight,
  },
});


// v1.1.0
