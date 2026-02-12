import { COLORS } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gợi ý nhanh</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => onSelect(suggestion)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
});

