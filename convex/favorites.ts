import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add item to favorites
export const addToFavorites = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
    itemType: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
    name: v.string(),
    location: v.string(),
    price: v.optional(v.number()),
    rating: v.optional(v.number()),
    image: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("itemId"), args.itemId))
      .first();

    if (existing) {
      // Already favorited, return existing ID
      return existing._id;
    }

    // Add to favorites
    const favoriteId = await ctx.db.insert("favorites", {
      userId: args.userId,
      itemId: args.itemId,
      itemType: args.itemType,
      name: args.name,
      location: args.location,
      price: args.price,
      rating: args.rating,
      image: args.image,
      description: args.description,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return favoriteId;
  },
});

// Remove item from favorites
export const removeFromFavorites = mutation({
  args: {
    favoriteId: v.id("favorites"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.favoriteId);
  },
});

// Remove by itemId and userId
export const removeFavoriteByItemId = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("itemId"), args.itemId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return true;
    }
    return false;
  },
});

// Get user favorites
export const getUserFavorites = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log('🔍 getUserFavorites - Query called with userId:', args.userId);
    
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    console.log('🔍 getUserFavorites - Found favorites:', favorites.length, favorites);
    
    return favorites;
  },
});

// Get favorites by type
export const getFavoritesByType = query({
  args: {
    userId: v.id("users"),
    itemType: v.union(
      v.literal("hotel"),
      v.literal("flight"),
      v.literal("attraction"),
      v.literal("restaurant"),
      v.literal("transport")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("favorites")
      .withIndex("by_user_type", (q) => 
        q.eq("userId", args.userId).eq("itemType", args.itemType)
      )
      .order("desc")
      .collect();
  },
});

// Check if item is favorited
export const isFavorited = query({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("itemId"), args.itemId))
      .first();

    return favorite !== null;
  },
});

