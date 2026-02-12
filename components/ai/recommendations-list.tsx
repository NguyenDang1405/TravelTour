import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Platform,
  Dimensions 
} from 'react-native';
import RecommendationCard from './recommendation-card';

const { width } = Dimensions.get('window');

interface Recommendation {
  id: string;
  name: string;
  type: 'hotel' | 'attraction' | 'restaurant' | 'flight' | 'transport';
  location: string;
  price?: number;
  rating?: number;
  image?: string;
  description?: string;
}

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onPress?: (recommendation: Recommendation) => void;
  onAddToTrip?: (recommendation: Recommendation) => void;
  onBook?: (recommendation: Recommendation) => void;
}

export default function RecommendationsList({
  recommendations,
  onPress,
  onAddToTrip,
  onBook,
}: RecommendationsListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const cardWidth = Math.min(320, width * 0.85);
  const cardSpacing = SPACING.md;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gợi ý cho bạn</Text>
        <View style={styles.scrollIndicators}>
          {recommendations.length > 3 && (
            <>
              <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.indicatorText}>
                Vuốt để xem thêm
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </>
          )}
        </View>
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: SPACING.md }
        ]}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={cardWidth + cardSpacing}
        snapToAlignment="start"
      >
        {recommendations.map((rec, index) => (
          <View
            key={rec.id}
            style={[
              styles.cardWrapper,
              { 
                width: cardWidth,
                marginRight: index === recommendations.length - 1 ? 0 : cardSpacing,
              }
            ]}
          >
            <RecommendationCard
              id={rec.id}
              name={rec.name}
              type={rec.type}
              location={rec.location}
              price={rec.price}
              rating={rec.rating}
              image={rec.image}
              description={rec.description}
              onPress={() => onPress?.(rec)}
              onAddToTrip={() => onAddToTrip?.(rec)}
              onBook={() => onBook?.(rec)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  scrollIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  indicatorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingVertical: SPACING.xs,
  },
  cardWrapper: {
    height: '100%',
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease',
        ':hover': {
          transform: 'scale(1.02)',
        },
      },
    }),
  },
});

