import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Tạo trip mới
export const createTrip = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    budget: v.number(),
  },
  handler: async (ctx, args) => {
    const tripId = await ctx.db.insert("trips", {
      userId: args.userId,
      title: args.title,
      destination: args.destination,
      startDate: args.startDate,
      endDate: args.endDate,
      budget: args.budget,
      status: "planning",
      itinerary: [],
      participants: [],
      isShared: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return tripId;
  },
});

// Lấy trips của user
export const getUserTrips = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Lấy trip theo ID
export const getTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tripId);
  },
});

// Cập nhật itinerary
export const updateItinerary = mutation({
  args: {
    tripId: v.id("trips"),
    itinerary: v.array(v.object({
      day: v.number(),
      date: v.string(),
      activities: v.array(v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
        location: v.object({
          name: v.string(),
          address: v.string(),
          coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
          }),
        }),
        time: v.string(),
        duration: v.number(),
        cost: v.optional(v.number()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
        bookingId: v.optional(v.string()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, {
      itinerary: args.itinerary,
      updatedAt: Date.now(),
    });
  },
});

// Cập nhật status trip
export const updateTripStatus = mutation({
  args: {
    tripId: v.id("trips"),
    status: v.union(
      v.literal("planning"),
      v.literal("confirmed"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Cập nhật thông tin trip
export const updateTrip = mutation({
  args: {
    tripId: v.id("trips"),
    title: v.optional(v.string()),
    destination: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (args.title !== undefined) updateData.title = args.title;
    if (args.destination !== undefined) updateData.destination = args.destination;
    if (args.startDate !== undefined) updateData.startDate = args.startDate;
    if (args.endDate !== undefined) updateData.endDate = args.endDate;
    if (args.budget !== undefined) updateData.budget = args.budget;
    
    await ctx.db.patch(args.tripId, updateData);
  },
});

// Xóa trip và tất cả bookings liên quan
export const deleteTrip = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    // Kiểm tra xem trip có tồn tại không
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Xóa tất cả bookings liên quan đến trip này trước
    // Sử dụng index "by_trip" để tìm bookings hiệu quả hơn
    let relatedBookings: any[] = [];
    try {
      // Thử dùng index trước
      relatedBookings = await ctx.db
        .query("bookings")
        .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
        .collect();
      console.log(`Found ${relatedBookings.length} bookings via index for trip ${args.tripId}`);
    } catch (error) {
      // Nếu index không hoạt động, fallback về filter tất cả bookings
      console.warn("Index query failed, using filter fallback:", error);
      try {
        const allBookings = await ctx.db
          .query("bookings")
          .collect();
        relatedBookings = allBookings.filter(
          (booking) => booking.tripId === args.tripId
        );
        console.log(`Found ${relatedBookings.length} bookings via filter for trip ${args.tripId}`);
      } catch (filterError) {
        console.error("Error filtering bookings:", filterError);
        // Nếu cả filter cũng fail, thử query trực tiếp với điều kiện
        relatedBookings = [];
      }
    }
    
    // Xóa từng booking và các payments liên quan
    let deletedBookingsCount = 0;
    let deletedPaymentsCount = 0;
    
    for (const booking of relatedBookings) {
      try {
        // Xóa các payments liên quan đến booking này
        let payments: any[] = [];
        try {
          payments = await ctx.db
            .query("payments")
            .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
            .collect();
        } catch (paymentIndexError) {
          // Nếu index không hoạt động, query tất cả và filter
          console.warn(`Payment index query failed for booking ${booking._id}, using filter:`, paymentIndexError);
          const allPayments = await ctx.db
            .query("payments")
            .collect();
          payments = allPayments.filter(p => p.bookingId === booking._id);
        }
        
        // Xóa từng payment
        for (const payment of payments) {
          try {
            await ctx.db.delete(payment._id);
            deletedPaymentsCount++;
          } catch (paymentDeleteError) {
            console.error(`Error deleting payment ${payment._id}:`, paymentDeleteError);
          }
        }
        
        // Xóa booking
        await ctx.db.delete(booking._id);
        deletedBookingsCount++;
      } catch (deleteError) {
        console.error(`Error deleting booking ${booking._id}:`, deleteError);
        // Tiếp tục xóa các booking khác dù có lỗi
      }
    }
    
    console.log(`Deleted ${deletedBookingsCount} bookings and ${deletedPaymentsCount} payments for trip ${args.tripId}`);
    
    // Sau đó xóa trip
    await ctx.db.delete(args.tripId);
    
    return { 
      deleted: true, 
      tripId: args.tripId, 
      bookingsDeleted: deletedBookingsCount,
      paymentsDeleted: deletedPaymentsCount
    };
  },
});

// Chia sẻ trip
export const shareTrip = mutation({
  args: {
    tripId: v.id("trips"),
    shareLink: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, {
      isShared: true,
      shareLink: args.shareLink,
      updatedAt: Date.now(),
    });
  },
});
