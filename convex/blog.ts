import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

// Hàm tạo slug từ title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD") // Normalize Vietnamese characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// Tạo slug duy nhất bằng cách thêm số nếu slug đã tồn tại
async function generateUniqueSlug(ctx: QueryCtx | MutationCtx, baseSlug: string, excludePostId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    
    if (!existing || (excludePostId && existing._id === excludePostId)) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Lấy tất cả blog posts đã publish
export const getPublishedPosts = query({
  args: {
    category: v.optional(v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination"),
      v.literal("general")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("blogPosts")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc");

    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const posts = await query.take(args.limit || 50);

    // Populate user info
    const postsWithUser = await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        return {
          ...post,
          author: {
            name: user?.name || "Anonymous",
            avatar: user?.avatar,
          },
        };
      })
    );

    return postsWithUser;
  },
});

// Lấy blog posts của user
export const getUserPosts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return posts;
  },
});

// Lấy một blog post theo ID
export const getPostById = query({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const user = await ctx.db.get(post.userId);
    return {
      ...post,
      views: post.views,
      author: {
        name: user?.name || "Anonymous",
        avatar: user?.avatar,
      },
    };
  },
});

// Lấy một blog post theo slug hoặc ID
export const getPostBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.slug.length > 20 && args.slug.length < 40) {
      try {
        const postById = await ctx.db.get(args.slug as any) as any;
        if (postById) {
          const user = await ctx.db.get(postById.userId) as any;
          return {
            ...postById,
            author: {
              name: user?.name || "Anonymous",
              avatar: user?.avatar,
            },
          };
        }
      } catch (e) {
        // Not a valid ID, continue to slug search
      }
    }
    
    // PRIORITY 2: Try to find by slug
    let post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!post) {
      // Fallback: search all posts (in case index doesn't work)
      const allPosts = await ctx.db.query("blogPosts").collect();
      post = allPosts.find(p => p.slug === args.slug) || null;
    }
    
    if (!post) {
      return null;
    }

    const user = await ctx.db.get((post as any).userId) as any;
    return {
      ...post,
      author: {
        name: user?.name || "Anonymous",
        avatar: user?.avatar,
      },
    };
  },
});

// Mutation để increment views (gọi riêng từ frontend)
export const incrementViews = mutation({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    
    await ctx.db.patch(args.postId, {
      views: post.views + 1,
    });
    
    return { views: post.views + 1 };
  },
});

// Tạo blog post mới
export const createPost = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    rating: v.optional(v.number()),
    location: v.optional(v.string()),
    category: v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination"),
      v.literal("general")
    ),
    itemId: v.optional(v.string()),
    itemType: v.optional(v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination")
    )),
    itemName: v.optional(v.string()),
    itemImage: v.optional(v.string()),
    itemLocation: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const baseSlug = generateSlug(args.title);
    const slug = await generateUniqueSlug(ctx, baseSlug);
    
    const postId = await ctx.db.insert("blogPosts", {
      userId: args.userId,
      title: args.title,
      slug: slug,
      content: args.content,
      rating: args.rating,
      location: args.location,
      category: args.category,
      itemId: args.itemId,
      itemType: args.itemType,
      itemName: args.itemName,
      itemImage: args.itemImage,
      itemLocation: args.itemLocation,
      images: args.images || [],
      tags: args.tags || [],
      likes: 0,
      views: 0,
      isPublished: args.isPublished ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

// Cập nhật blog post
export const updatePost = mutation({
  args: {
    postId: v.id("blogPosts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    rating: v.optional(v.number()),
    location: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination"),
      v.literal("general")
    )),
    itemId: v.optional(v.string()),
    itemType: v.optional(v.union(
      v.literal("hotel"),
      v.literal("restaurant"),
      v.literal("attraction"),
      v.literal("destination")
    )),
    itemName: v.optional(v.string()),
    itemImage: v.optional(v.string()),
    itemLocation: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { postId, ...rest } = args;
    const updates: Record<string, any> = { ...rest };
    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Nếu title thay đổi, tạo slug mới
    if (args.title && args.title !== post.title) {
      const baseSlug = generateSlug(args.title);
      updates.slug = await generateUniqueSlug(ctx, baseSlug, postId);
    }

    await ctx.db.patch(postId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return postId;
  },
});

// Xóa blog post
export const deletePost = mutation({
  args: {
    postId: v.id("blogPosts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log('🗑️ deletePost mutation called - postId:', args.postId, 'userId:', args.userId);
    
    const post = await ctx.db.get(args.postId);
    if (!post) {
      console.error('❌ Post not found:', args.postId);
      throw new Error("Post not found");
    }

    console.log('🔍 Post found - post.userId:', post.userId, 'args.userId:', args.userId);
    
    // Chỉ cho phép xóa bài viết của chính mình
    if (post.userId !== args.userId) {
      console.error('❌ Unauthorized - post.userId:', post.userId, 'args.userId:', args.userId);
      throw new Error("Unauthorized: Bạn không có quyền xóa bài đánh giá này");
    }

    console.log('✅ Authorization passed, deleting post:', args.postId);
    await ctx.db.delete(args.postId);
    console.log('✅ Post deleted successfully');
    
    return { success: true };
  },
});

// Like/Unlike blog post
export const toggleLike = mutation({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Note: Trong thực tế, bạn nên tạo bảng likes riêng để track user nào đã like
    // Ở đây chỉ tăng/giảm số lượng likes đơn giản
    await ctx.db.patch(args.postId, {
      likes: post.likes + 1,
    });

    return { likes: post.likes + 1 };
  },
});

// Migration: Thêm slug cho tất cả bài viết cũ chưa có slug
export const migrateSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("blogPosts").collect();
    let migrated = 0;
    
    for (const post of allPosts) {
      if (!post.slug) {
        const baseSlug = generateSlug(post.title);
        const slug = await generateUniqueSlug(ctx, baseSlug, post._id);
        await ctx.db.patch(post._id, { slug });
        migrated++;
      }
    }
    
    return { migrated, total: allPosts.length };
  },
});

// Query để kiểm tra tất cả blog posts (debug)
export const getAllPosts = query({
  args: {},
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("blogPosts").collect();
    return allPosts.map(post => ({
      _id: post._id,
      title: post.title,
      slug: post.slug || 'NO SLUG',
      hasSlug: !!post.slug,
    }));
  },
});

