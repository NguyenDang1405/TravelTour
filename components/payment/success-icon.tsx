import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SuccessIconProps {
  size?: number;
  animated?: boolean;
}

export default function SuccessIcon({ size = 80, animated = true }: SuccessIconProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Checkmark fade in
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(checkmarkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      checkmarkOpacity.setValue(1);
    }
  }, [animated]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.checkmarkContainer,
            { opacity: checkmarkOpacity },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={size * 0.6}
            color={COLORS.white}
            style={styles.checkmark}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontWeight: 'bold',
  },
});

