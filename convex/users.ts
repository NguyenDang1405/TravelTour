import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Tạo user mới khi đăng ký
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Nếu user đã tồn tại, update name và avatar nếu có thay đổi
      const updates: any = {
        updatedAt: Date.now(),
      };
      
      // Update name nếu user chưa có name
      if (args.name && !existingUser.name) {
        updates.name = args.name;
      }
      
      // Update avatar nếu user chưa có avatar
      if (args.avatar && !existingUser.avatar) {
        updates.avatar = args.avatar;
      }
      
      if (Object.keys(updates).length > 1) { // Có thay đổi ngoài updatedAt
        await ctx.db.patch(existingUser._id, updates);
      }
      
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      preferences: {
        interests: [],
        currency: "VND",
        language: "vi",
      },
      searchHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Update user name
export const updateUserName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

// Update user avatar
export const updateAvatar = mutation({
  args: {
    userId: v.id("users"),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[updateAvatar] 📥 Received update request for user ${args.userId}`, {
      avatarLength: args.avatar?.length || 0,
      avatarPreview: args.avatar ? args.avatar.substring(0, 50) + '...' : 'empty/undefined',
      avatarType: typeof args.avatar,
      isString: typeof args.avatar === 'string',
      isEmpty: !args.avatar || args.avatar.trim().length === 0,
    });
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.error(`[updateAvatar] ❌ User not found: ${args.userId}`);
      throw new Error("User not found");
    }
    
    console.log(`[updateAvatar] 📋 Current user state:`, {
      currentAvatar: user.avatar ? user.avatar.substring(0, 50) + '...' : 'none',
      hasCurrentAvatar: !!user.avatar,
    });
    
    // Save avatar - ensure it's saved correctly
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    // Set avatar: if args.avatar is provided and not empty, use it
    // If args.avatar is empty string or undefined, set to undefined to clear avatar
    if (args.avatar && args.avatar.trim().length > 0) {
      updateData.avatar = args.avatar.trim();
      console.log(`[updateAvatar] ✅ Setting avatar to:`, {
        avatarLength: updateData.avatar.length,
        avatarPreview: updateData.avatar.substring(0, 50) + '...',
      });
    } else {
      // Clear avatar by setting to undefined
      updateData.avatar = undefined;
      console.log(`[updateAvatar] 🗑️ Clearing avatar (setting to undefined)`);
    }
    
    await ctx.db.patch(args.userId, updateData);
    console.log(`[updateAvatar] 💾 Database patch completed`);
    
    // Return updated user to verify - query again to ensure it's saved
    const updatedUser = await ctx.db.get(args.userId);
    console.log(`[updateAvatar] ✅ Verification after save:`, {
      hasAvatar: !!updatedUser?.avatar,
      avatar: updatedUser?.avatar ? updatedUser.avatar.substring(0, 50) + '...' : 'none',
      avatarLength: updatedUser?.avatar?.length || 0,
    });
    
    return {
      success: true,
      avatar: updatedUser?.avatar || '',
    };
  },
});

// Lấy thông tin user
export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    // Debug: Log user data including avatar
    if (user) {
      console.log(`[getUser] Found user for clerkId ${args.clerkId}:`, {
        userId: user._id,
        hasAvatar: !!user.avatar,
        avatar: user.avatar ? user.avatar.substring(0, 50) + '...' : 'none',
        name: user.name,
      });
    } else {
      console.log(`[getUser] No user found for clerkId ${args.clerkId}`);
    }
    
    return user;
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Cập nhật preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      budget: v.optional(v.number()),
      interests: v.array(v.string()),
      currency: v.optional(v.string()),
      language: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
      updatedAt: Date.now(),
    });
  },
});

// Thêm vào search history
export const addSearchHistory = mutation({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const updatedHistory = [args.query, ...user.searchHistory.slice(0, 9)]; // Giữ 10 tìm kiếm gần nhất

    await ctx.db.patch(args.userId, {
      searchHistory: updatedHistory,
      updatedAt: Date.now(),
    });
  },
});

// Lấy search history
export const getSearchHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.searchHistory || [];
  },
});

