import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImageGalleryProps {
  images: string[];
  defaultImage?: string;
}

const { width } = Dimensions.get('window');

export default function ImageGallery({ images, defaultImage }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const displayImages = images.length > 0 ? images : (defaultImage ? [defaultImage] : []);

  if (displayImages.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="image-outline" size={48} color={COLORS.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Image */}
      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: displayImages[selectedIndex] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        {displayImages.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1))}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0))}
            >
              <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {selectedIndex + 1} / {displayImages.length}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Thumbnail Gallery */}
      {displayImages.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailContainer}
          contentContainerStyle={styles.thumbnailContent}
        >
          {displayImages.map((image, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                selectedIndex === index && styles.thumbnailSelected,
              ]}
              onPress={() => setSelectedIndex(index)}
            >
              <Image source={{ uri: image }} style={styles.thumbnailImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  mainImageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    backgroundColor: COLORS.surfaceLight,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailContainer: {
    marginTop: 12,
    maxHeight: 80,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: COLORS.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: 400,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

