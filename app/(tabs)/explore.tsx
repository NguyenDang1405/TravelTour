import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import React from 'react';
import { Platform } from 'react-native';
import { api } from '@/convex/_generated/api';
import ExploreMobile from './explore.mobile';
import ExploreWeb from './explore.web';

export default function ExploreScreen() {
  const { user } = useUser();

  // Lấy user data từ Convex
  const convexUser = useQuery(api.users.getUser, 
    user ? { clerkId: user.id } : "skip"
  );

  // Render UI khác nhau cho Web và Mobile
  if (Platform.OS === 'web') {
    return <ExploreWeb user={user} convexUser={convexUser} />;
  }

  return <ExploreMobile user={user} convexUser={convexUser} />;
}
