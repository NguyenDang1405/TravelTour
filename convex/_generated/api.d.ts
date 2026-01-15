/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as api_ from "../api.js";
import type * as blog from "../blog.js";
import type * as bookings from "../bookings.js";
import type * as favorites from "../favorites.js";
import type * as items from "../items.js";
import type * as payments from "../payments.js";
import type * as paymentsActions from "../paymentsActions.js";
import type * as reviews from "../reviews.js";
import type * as searchCache from "../searchCache.js";
import type * as serpApiCache from "../serpApiCache.js";
import type * as trips from "../trips.js";
import type * as upload from "../upload.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiActions: typeof aiActions;
  api: typeof api_;
  blog: typeof blog;
  bookings: typeof bookings;
  favorites: typeof favorites;
  items: typeof items;
  payments: typeof payments;
  paymentsActions: typeof paymentsActions;
  reviews: typeof reviews;
  searchCache: typeof searchCache;
  serpApiCache: typeof serpApiCache;
  trips: typeof trips;
  upload: typeof upload;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
