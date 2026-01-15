import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getFeaturedReviews = query({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .order("desc")
      .take(10);
    return reviews;
  },
});

export const addReview = mutation({
  args: {
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    rating: v.number(),
    content: v.string(),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviews", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
