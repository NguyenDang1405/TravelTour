import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create payment record
export const createPayment = mutation({
  args: {
    bookingId: v.id("bookings"),
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    externalTransactionId: v.optional(v.string()),
    paymentUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      bookingId: args.bookingId,
      userId: args.userId,
      amount: args.amount,
      currency: args.currency,
      paymentMethod: args.paymentMethod,
      status: args.status,
      externalTransactionId: args.externalTransactionId,
      paymentUrl: args.paymentUrl,
      metadata: args.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return paymentId;
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    externalTransactionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: args.status,
      externalTransactionId: args.externalTransactionId,
      metadata: args.metadata,
      updatedAt: Date.now(),
    });

    // If payment is completed, update booking status
    if (args.status === "completed") {
      const payment = await ctx.db.get(args.paymentId);
      if (payment) {
        await ctx.db.patch(payment.bookingId, {
          status: "confirmed",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// Get payment by ID
export const getPayment = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

// Get payments by booking
export const getPaymentsByBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();
  },
});

// Get payments by user
export const getPaymentsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Process VNPay webhook
export const processVNPayWebhook = mutation({
  args: {
    vnp_ResponseCode: v.string(),
    vnp_TransactionStatus: v.string(),
    vnp_TxnRef: v.string(),
    vnp_Amount: v.string(),
    vnp_SecureHash: v.string(),
    vnp_OrderInfo: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the webhook signature
    // In production, you should verify the hash here
    
    // Find payment by transaction reference
    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("externalTransactionId"), args.vnp_TxnRef))
      .collect();

    if (payments.length === 0) {
      throw new Error("Payment not found");
    }

    const payment = payments[0];
    let status: "completed" | "failed" = "failed";

    if (args.vnp_ResponseCode === "00" && args.vnp_TransactionStatus === "00") {
      status = "completed";
    }

    await ctx.db.patch(payment._id, {
      status,
      externalTransactionId: args.vnp_TxnRef,
      metadata: {
        vnp_ResponseCode: args.vnp_ResponseCode,
        vnp_TransactionStatus: args.vnp_TransactionStatus,
        vnp_Amount: args.vnp_Amount,
        vnp_OrderInfo: args.vnp_OrderInfo,
      },
      updatedAt: Date.now(),
    });

    if (status === "completed") {
      await ctx.db.patch(payment.bookingId, {
        status: "confirmed",
        updatedAt: Date.now(),
      });
    }

    return { success: true, status };
  },
});

// Generate payment summary
export const getPaymentSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
      completedPayments: payments.filter(p => p.status === "completed").length,
      pendingPayments: payments.filter(p => p.status === "pending").length,
      failedPayments: payments.filter(p => p.status === "failed").length,
      paymentMethods: {} as Record<string, number>,
    };

    // Count by payment method
    payments.forEach(payment => {
      summary.paymentMethods[payment.paymentMethod] = 
        (summary.paymentMethods[payment.paymentMethod] || 0) + 1;
    });

    return summary;
  },
});
// Get latest payment for debugging
export const getLatestPayment = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("payments").order("desc").first();
  },
});
