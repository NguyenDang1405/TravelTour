import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Tạo booking mới
export const createBooking = mutation({
  args: {
    tripId: v.optional(v.id("trips")),
    userId: v.id("users"),
    type: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
    provider: v.string(),
    externalId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    location: v.object({
      name: v.string(),
      address: v.string(),
      coordinates: v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    }),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    guests: v.optional(v.number()),
    price: v.number(),
    currency: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bookingId = await ctx.db.insert("bookings", {
      ...(args.tripId && { tripId: args.tripId }),
      userId: args.userId,
      type: args.type,
      provider: args.provider,
      externalId: args.externalId,
      name: args.name,
      description: args.description,
      location: args.location,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      guests: args.guests,
      price: args.price,
      currency: args.currency,
      image: args.image,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return bookingId;
  },
});

// Lấy bookings của trip
export const getTripBookings = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

// Cập nhật booking status
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    paymentId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      status: args.status,
      paymentId: args.paymentId,
      invoiceUrl: args.invoiceUrl,
      updatedAt: Date.now(),
    });
  },
});

// Lấy booking theo ID
export const getBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookingId);
  },
});

// Lấy bookings của user
export const getUserBookings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Cancel booking
export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

// Delete booking (xóa hoàn toàn)
export const deleteBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.bookingId);
  },
});