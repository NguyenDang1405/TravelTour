import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  helpful?: number;
}

interface ReviewsSectionProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onLoadMore?: () => void;
}

export default function ReviewsSection({
  reviews,
  averageRating,
  totalReviews,
  onLoadMore,
}: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayReviews = showAll ? reviews : reviews.slice(0, 3);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Ionicons
        key={index}
        name={index < Math.floor(rating) ? 'star' : 'star-outline'}
        size={16}
        color={index < rating ? '#FFB800' : COLORS.textSecondary}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.ratingContainer}>
            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {renderStars(averageRating)}
            </View>
          </View>
          <Text style={styles.totalReviews}>{totalReviews} đánh giá</Text>
        </View>
      </View>

      <ScrollView style={styles.reviewsList}>
        {displayReviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewUserInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {review.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>{review.userName}</Text>
                  <View style={styles.reviewMeta}>
                    <View style={styles.starsContainer}>
                      {renderStars(review.rating)}
                    </View>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
            {review.helpful !== undefined && (
              <TouchableOpacity style={styles.helpfulButton}>
                <Ionicons name="thumbs-up-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.helpfulText}>Hữu ích ({review.helpful})</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {reviews.length > 3 && !showAll && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => setShowAll(true)}
        >
          <Text style={styles.loadMoreText}>Xem thêm {reviews.length - 3} đánh giá</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  totalReviews: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  reviewsList: {
    maxHeight: 400,
  },
  reviewItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  loadMoreText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

