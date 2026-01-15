import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Cache TTL: 7 days (604800 seconds) - SERPAPI results don't change often
const SERPAPI_CACHE_TTL_SECONDS = 604800;

// Normalize query string to ensure consistent cache keys
function normalizeQuery(query: string): string {
  // Trim whitespace and normalize multiple spaces to single space
  return query.trim().replace(/\s+/g, ' ');
}

// Generate cache key from engine and query
function generateSerpApiCacheKey(engine: string, query: string): string {
  const normalized = normalizeQuery(query);
  return `${engine}:${normalized}`;
}

// Check if SERPAPI cache entry exists and is valid
export const getCachedSerpApi = query({
  args: {
    engine: v.string(), // "google_maps" or "google_images"
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const cacheKey = generateSerpApiCacheKey(args.engine, args.query);
    const now = Date.now();

    // Find cache entry by cacheKey
    const cacheEntry = await ctx.db
      .query("serpApiCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (cacheEntry) {
      if (cacheEntry.expiresAt > now) {
        // Cache hit - return cached data
        console.log(`[SerpApiCache] ✅ Cache HIT for key: "${cacheKey}" (expires in ${Math.round((cacheEntry.expiresAt - now) / 1000 / 60)} minutes)`);
        return {
          cached: true,
          data: cacheEntry.data,
          expiresAt: cacheEntry.expiresAt,
        };
      } else {
        // Cache expired
        console.log(`[SerpApiCache] ⏰ Cache EXPIRED for key: "${cacheKey}" (expired ${Math.round((now - cacheEntry.expiresAt) / 1000 / 60)} minutes ago)`);
      }
    } else {
      console.log(`[SerpApiCache] ❌ Cache MISS for key: "${cacheKey}"`);
    }

    // Cache miss or expired
    return {
      cached: false,
      data: null,
      expiresAt: null,
    };
  },
});

// Save SERPAPI response to cache
export const saveSerpApiCache = mutation({
  args: {
    engine: v.string(), // "google_maps" or "google_images"
    query: v.string(),
    data: v.any(), // Raw response data from SERPAPI
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + SERPAPI_CACHE_TTL_SECONDS * 1000;
    const cacheKey = generateSerpApiCacheKey(args.engine, args.query);

    // Check if cache entry already exists
    const existingEntry = await ctx.db
      .query("serpApiCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (existingEntry) {
      // Update existing entry
      await ctx.db.patch(existingEntry._id, {
        data: args.data,
        expiresAt,
      });
      console.log(`[SerpApiCache] 💾 Updated cache entry for key: "${cacheKey}"`);
      return existingEntry._id;
    }

    // Create new cache entry
    const cacheId = await ctx.db.insert("serpApiCache", {
      cacheKey,
      engine: args.engine,
      query: normalizeQuery(args.query), // Store normalized query
      data: args.data,
      expiresAt,
      createdAt: now,
    });

    console.log(`[SerpApiCache] 💾 Created new cache entry for key: "${cacheKey}" (expires in ${SERPAPI_CACHE_TTL_SECONDS / 86400} days)`);
    return cacheId;
  },
});

// Clean expired SERPAPI cache entries
export const cleanExpiredSerpApiCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredEntries = await ctx.db
      .query("serpApiCache")
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

// Clear ALL SERPAPI cache entries
export const clearAllSerpApiCache = mutation({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("serpApiCache").collect();
    let deletedCount = 0;
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }
    return { deletedCount };
  },
});

