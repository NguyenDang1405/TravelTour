import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Cache TTL: 24 hours (86400 seconds) to reduce paid API calls
const CACHE_TTL_SECONDS = 86400;

// Generate cache key from query and filters
function generateCacheKey(query: string, filters: any): string {
  const filterStr = JSON.stringify(filters);
  return `${query}:${filterStr}`;
}

// Check if cache entry exists and is valid
export const getCachedSearch = query({
  args: {
    query: v.string(),
    filters: v.object({
      budget: v.optional(v.number()),
      duration: v.optional(v.number()),
      interests: v.optional(v.array(v.string())),
      destination: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const cacheKey = generateCacheKey(args.query, args.filters);
    const now = Date.now();

    // Find cache entries by query
    const cacheEntries = await ctx.db
      .query("searchCache")
      .withIndex("by_query", (q) => q.eq("query", args.query))
      .collect();

    // Find matching cache entry
    for (const entry of cacheEntries) {
      const entryKey = generateCacheKey(entry.query, entry.filters);
      if (entryKey === cacheKey && entry.expiresAt > now) {
        // Cache hit - return results
        return {
          cached: true,
          results: entry.results,
          expiresAt: entry.expiresAt,
        };
      }
    }

    // Cache miss
    return {
      cached: false,
      results: null,
      expiresAt: null,
    };
  },
});

// Get recent cache entries for AI context
export const getRecentCaches = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const now = Date.now();
    
    const cacheEntries = await ctx.db
      .query("searchCache")
      .order("desc")
      .take(limit);
      
    // Filter out expired caches
    return cacheEntries.filter(entry => entry.expiresAt > now);
  },
});

// Save search results to cache
export const saveSearchCache = mutation({
  args: {
    query: v.string(),
    filters: v.object({
      budget: v.optional(v.number()),
      duration: v.optional(v.number()),
      interests: v.optional(v.array(v.string())),
      destination: v.optional(v.string()),
    }),
    results: v.array(v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      location: v.string(),
      price: v.number(),
      currency: v.optional(v.string()), // For flights (USD/EUR) vs hotels (VND)
      rating: v.number(),
      reviews: v.optional(v.number()),
      image: v.string(),
      description: v.string(),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      metadata: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + CACHE_TTL_SECONDS * 1000;

    // Check if cache entry already exists
    const cacheKey = generateCacheKey(args.query, args.filters);
    const existingEntries = await ctx.db
      .query("searchCache")
      .withIndex("by_query", (q) => q.eq("query", args.query))
      .collect();

    // Update existing entry if found
    for (const entry of existingEntries) {
      const entryKey = generateCacheKey(entry.query, entry.filters);
      if (entryKey === cacheKey) {
        await ctx.db.patch(entry._id, {
          results: args.results,
          expiresAt,
        });
        return entry._id;
      }
    }

    // Create new cache entry
    const cacheId = await ctx.db.insert("searchCache", {
      query: args.query,
      filters: args.filters,
      results: args.results,
      expiresAt,
      createdAt: now,
    });

    return cacheId;
  },
});

// Clean expired cache entries (can be called periodically)
export const cleanExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredEntries = await ctx.db
      .query("searchCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    let deletedCount = 0;
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

// Clear ALL cache entries (useful when switching providers or refreshing stale caches)
export const clearAllSearchCache = mutation({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("searchCache").collect();
    let deletedCount = 0;
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }
    return { deletedCount };
  },
});
