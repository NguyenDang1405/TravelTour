const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/index.web.tsx', 'utf8');

// 1. Add featuredReviews
if (!content.includes('const featuredReviews = useQuery(api.reviews?.getFeaturedReviews) || [];')) {
  content = content.replace(
    'const featuredBlogPosts = useQuery(api.blog.getPublishedPosts, { limit: 6 });',
    'const featuredBlogPosts = useQuery(api.blog.getPublishedPosts, { limit: 6 });\n  const featuredReviews = useQuery(api.reviews?.getFeaturedReviews) || [];'
  );
}

// 2. Replace Testimonials rendering
const testimonialsTarget = `{/* Testimonials Section */}
        <ImageBackground
          source={require('@/assets/images/background/background-cus-review.webp')}
          style={testimonialStyles.container}
          resizeMode="cover"
        >
          <Text style={testimonialStyles.title}>Khách hàng nói gì về chúng tôi</Text>
          <Text style={testimonialStyles.subtitle}>Chúng tôi vinh hạnh vì đã có cơ hội đồng hành với hơn 10.000 khách hàng trên khắp thế giới</Text>

          <View style={testimonialStyles.cardsContainer}>
            {/* Left Card (Salim) */}
            <View style={[testimonialStyles.card, testimonialStyles.sideCard]}>
              <Text style={testimonialStyles.quoteText}>
                "Dịch vụ rất tuyệt vời. Mình đã có một chuyến đi cực kì đáng nhớ. ND Travel đã hỗ trợ rất nhanh khi gặp vấn đề và mình rất đánh giá cao chăm sóc khách hàng. Rất may mắn khi lựa chọn ND Travel cho chuyến đi lần này."
              </Text>
              <View style={testimonialStyles.starsContainer}>
                {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={20} color="#FFD700" />)}
              </View>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=salim' }} style={testimonialStyles.avatar} />
              <Text style={testimonialStyles.authorName}>Salim</Text>
            </View>

            {/* Center Card (Moon) */}
            <View style={[testimonialStyles.card, testimonialStyles.centerCard]}>
              <View style={testimonialStyles.navButtonLeft}>
                <Ionicons name="chevron-back" size={24} color="#00A3FF" />
              </View>
              <Text style={testimonialStyles.quoteTextCenter}>
                "Dịch vụ rất tuyệt vời. Mình đã có một chuyến đi cực kì đáng nhớ. ND Travel đã hỗ trợ rất nhanh khi gặp vấn đề và mình rất đánh giá cao chăm sóc khách hàng. Rất may mắn khi lựa chọn ND Travel cho chuyến đi lần này."
              </Text>
              <View style={testimonialStyles.starsContainer}>
                {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={24} color="#FFD700" />)}
              </View>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=moon' }} style={testimonialStyles.avatarCenter} />
              <Text style={testimonialStyles.authorNameCenter}>Moon</Text>
              <View style={testimonialStyles.navButtonRight}>
                <Ionicons name="chevron-forward" size={24} color="#00A3FF" />
              </View>
            </View>

            {/* Right Card (Pam) */}
            <View style={[testimonialStyles.card, testimonialStyles.sideCard]}>
              <Text style={testimonialStyles.quoteText}>
                "Dịch vụ rất tuyệt vời. Mình đã có một chuyến đi cực kì đáng nhớ. ND Travel đã hỗ trợ rất nhanh khi gặp vấn đề và mình rất đánh giá cao chăm sóc khách hàng. Rất may mắn khi lựa chọn ND Travel cho chuyến đi lần này."
              </Text>
              <View style={testimonialStyles.starsContainer}>
                {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={20} color="#FFD700" />)}
              </View>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=pam' }} style={testimonialStyles.avatar} />
              <Text style={testimonialStyles.authorName}>Pam</Text>
            </View>
          </View>
        </ImageBackground>`;

const testimonialsReplace = `{/* Testimonials Section */}
        <ImageBackground
          source={require('@/assets/images/background/background-cus-review.webp')}
          style={testimonialStyles.container}
          resizeMode="cover"
        >
          <Text style={testimonialStyles.title}>Khách hàng nói gì về chúng tôi</Text>
          <Text style={testimonialStyles.subtitle}>Chúng tôi vinh hạnh vì đã có cơ hội đồng hành với hơn 10.000 khách hàng trên khắp thế giới</Text>

          <View style={testimonialStyles.cardsContainer}>
            {featuredReviews.slice(0, 3).map((review: any, index: number) => {
              const isCenter = index === 1;
              return (
                <View key={review._id || index} style={[testimonialStyles.card, isCenter ? testimonialStyles.centerCard : testimonialStyles.sideCard]}>
                  {isCenter && (
                    <View style={testimonialStyles.navButtonLeft}>
                      <Ionicons name="chevron-back" size={24} color="#00A3FF" />
                    </View>
                  )}
                  <Text style={isCenter ? testimonialStyles.quoteTextCenter : testimonialStyles.quoteText}>
                    "{review.content}"
                  </Text>
                  <View style={testimonialStyles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={isCenter ? 24 : 20} color={i <= review.rating ? "#FFD700" : "#E0E0E0"} />)}
                  </View>
                  <Image source={{ uri: review.userAvatar || 'https://i.pravatar.cc/150' }} style={isCenter ? testimonialStyles.avatarCenter : testimonialStyles.avatar} />
                  <Text style={isCenter ? testimonialStyles.authorNameCenter : testimonialStyles.authorName}>{review.userName}</Text>
                  {isCenter && (
                    <View style={testimonialStyles.navButtonRight}>
                      <Ionicons name="chevron-forward" size={24} color="#00A3FF" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ImageBackground>`;
content = content.replace(testimonialsTarget, testimonialsReplace);

// 3. Replace About Us Right Column (Make it less "lỏ")
const aboutUsTarget = `<View style={aboutStyles.rightColumn}>
              <View style={aboutStyles.logoCard}>
                <View style={aboutStyles.logoCircle}>
                  <Text style={aboutStyles.logoLetter}>T</Text>
                </View>
                <Text style={aboutStyles.logoText}>TravelTour<Text style={{ color: '#ed1c24' }}>.</Text></Text>
                <Text style={aboutStyles.logoSubtext}>YOUR JOURNEY - YOUR VALUE</Text>
              </View>
            </View>`;
const aboutUsReplace = `<View style={aboutStyles.rightColumn}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80&auto=format&fit=crop' }} 
                  style={{ width: 160, height: 240, borderRadius: 20, marginTop: 40 }} 
                />
                <View style={{ gap: 16 }}>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop' }} 
                    style={{ width: 160, height: 160, borderRadius: 20 }} 
                  />
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format&fit=crop' }} 
                    style={{ width: 160, height: 200, borderRadius: 20 }} 
                  />
                </View>
              </View>
            </View>`;
content = content.replace(aboutUsTarget, aboutUsReplace);

fs.writeFileSync('app/(tabs)/index.web.tsx', content);
console.log('Successfully updated reviews and about us sections.');
