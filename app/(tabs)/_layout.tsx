import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS } from '@/constants/theme';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  const tabBarStyle = Platform.OS === 'web' 
    ? styles.tabBarWeb 
    : {
        ...styles.tabBarMobile,
        paddingBottom: Math.max(insets.bottom, 8),
      };

  // Danh sách các tabs được phép hiển thị
  const allowedTabs = ['index', 'explore', 'planning', 'ai-chat', 'blog', 'profile'];

  return (
    <Tabs
      screenOptions={({ route }) => {
        // Ẩn hoàn toàn các tabs không có trong danh sách allowed (không chiếm không gian)
        const isAllowed = allowedTabs.includes(route.name);
        return {
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle,
          headerShown: false,
          tabBarButton: isAllowed ? HapticTab : () => null,
          tabBarShowLabel: Platform.OS !== 'web' && isAllowed,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarItemStyle: isAllowed 
            ? styles.tabBarItem 
            : { width: 0, height: 0, display: 'none', opacity: 0 },
        };
      }}
      initialRouteName="index">
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Kế hoạch',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: 'Blog',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWeb: {
    display: 'none', // Ẩn hoàn toàn trên web
  },
  tabBarMobile: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.borderLight,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  tabBarIcon: {
    marginBottom: 2,
    marginTop: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 0,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
