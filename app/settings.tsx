import React from 'react';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import SettingsMobile from './settings.mobile';
import SettingsWeb from './settings.web';

export default function SettingsScreen() {
  const { user } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.users.getUser,
    user ? { clerkId: user.id } : 'skip'
  );

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <SettingsWeb convexUser={convexUser} />;
  }

  return <SettingsMobile convexUser={convexUser} />;
}

