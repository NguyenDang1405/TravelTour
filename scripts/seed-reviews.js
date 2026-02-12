const fs = require('fs');

async function seedReviews() {
  const { ConvexHttpClient } = require('convex/browser');
  const client = new ConvexHttpClient('https://hearty-emu-374.convex.cloud');

  const reviews = [
    {
      userName: 'Salim',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      content: 'Dịch vụ rất tuyệt vời. Mình đã có một chuyến đi cực kì đáng nhớ. ND Travel đã hỗ trợ rất nhanh khi gặp vấn đề và mình rất đánh giá cao chăm sóc khách hàng.',
      featured: true
    },
    {
      userName: 'Moon',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      content: 'Chuyến đi tuyệt vời nhất từ trước đến nay! Khách sạn đẹp, lịch trình hợp lý. Cảm ơn TravelTour đã mang lại cho gia đình mình một kỳ nghỉ trọn vẹn.',
      featured: true
    },
    {
      userName: 'Pam',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      content: 'Giá cả hợp lý, hướng dẫn viên nhiệt tình. Ứng dụng đặt tour rất dễ sử dụng và tiện lợi. Mình sẽ tiếp tục ủng hộ trong các chuyến đi sắp tới.',
      featured: true
    }
  ];

  for (const review of reviews) {
    await client.mutation('reviews:addReview', review);
    console.log('Added review for', review.userName);
  }
}

seedReviews().catch(console.error);
