# Hướng dẫn xem Data trong Convex Database

## Vấn đề: Không thấy data sau khi tạo Trip

Data được lưu vào **Convex Database** (cloud database). Để xem data, bạn cần:

## Bước 1: Kiểm tra Convex Backend có đang chạy không

### Cách 1: Chạy Convex Dev Server

```bash
# Chạy Convex backend
npm run dev:be

# Hoặc
npx convex dev
```

Bạn sẽ thấy output như:
```
✓ Convex functions ready!
✓ Dashboard: https://dashboard.convex.dev/...
```

### Cách 2: Chạy cả Frontend và Backend

```bash
# Chạy cả 2 cùng lúc
npm run dev:all
```

## Bước 2: Kiểm tra Environment Variables

Đảm bảo file `.env` hoặc `.env.local` có:

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Nếu chưa có, bạn cần:
1. Tạo Convex project: https://dashboard.convex.dev
2. Copy deployment URL vào `.env`

## Bước 3: Xem Data trong Convex Dashboard

### Cách 1: Qua Convex Dashboard (Web)

1. Mở terminal khi chạy `npx convex dev`
2. Bạn sẽ thấy link dashboard, ví dụ:
   ```
   ✓ Dashboard: https://dashboard.convex.dev/team/your-team/project/your-project
   ```
3. Click vào link hoặc truy cập: https://dashboard.convex.dev
4. Chọn project của bạn
5. Vào tab **"Data"** hoặc **"Tables"**
6. Tìm table **"trips"** để xem các trip đã tạo

### Cách 2: Qua Convex CLI

```bash
# Xem tất cả trips
npx convex run trips:getUserTrips --args '{"userId": "YOUR_USER_ID"}'

# Hoặc mở Convex dashboard
npx convex dashboard
```

## Bước 4: Debug trong Code

Thêm logging để kiểm tra:

### Trong Planning Screen

```typescript
// Sau khi tạo trip
const tripId = await createTripMutation({...});
console.log('✅ Trip created with ID:', tripId);

// Kiểm tra trips list
console.log('📋 Current trips:', trips);
```

### Trong Browser Console

1. Mở Developer Tools (F12)
2. Vào tab **Console**
3. Tìm các log:
   - `✅ Trip created with ID: ...`
   - `📋 Current trips: [...]`
   - Nếu có lỗi: `❌ Error creating trip: ...`

## Bước 5: Kiểm tra Real-time Sync

Data sẽ tự động sync qua Convex subscription. Nếu không thấy:

1. **Kiểm tra Convex URL:**
   ```typescript
   // Trong app/_layout.tsx
   console.log('Convex URL:', convexUrl);
   ```

2. **Kiểm tra User ID:**
   ```typescript
   // Trong Planning Screen
   console.log('Convex User:', convexUser);
   console.log('User ID:', convexUser?._id);
   ```

3. **Kiểm tra Query:**
   ```typescript
   // Trips query
   const trips = useQuery(
     api.trips.getUserTrips,
     convexUser?._id ? { userId: convexUser._id } : "skip"
   );
   console.log('Trips from Convex:', trips);
   ```

## Troubleshooting

### Vấn đề 1: "EXPO_PUBLIC_CONVEX_URL is not set"

**Giải pháp:**
1. Tạo file `.env` trong root project
2. Thêm: `EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud`
3. Restart dev server

### Vấn đề 2: "Failed to create Convex client"

**Giải pháp:**
1. Kiểm tra Convex URL có đúng không
2. Đảm bảo Convex backend đang chạy
3. Kiểm tra network connection

### Vấn đề 3: Data không hiển thị trong UI

**Giải pháp:**
1. Kiểm tra console có lỗi không
2. Kiểm tra `convexUser._id` có tồn tại không
3. Kiểm tra trips query có trả về data không:
   ```typescript
   console.log('Trips query result:', trips);
   ```

### Vấn đề 4: Mutation thành công nhưng không thấy data

**Giải pháp:**
1. Kiểm tra trong Convex Dashboard xem data có được lưu không
2. Kiểm tra `getUserTrips` query có filter đúng userId không
3. Kiểm tra real-time subscription có hoạt động không

## Cách xem Data trực tiếp trong Database

### Qua Convex Dashboard:

1. Truy cập: https://dashboard.convex.dev
2. Chọn project của bạn
3. Vào tab **"Data"**
4. Tìm table **"trips"**
5. Click vào một row để xem chi tiết

### Qua Code (Debug):

Thêm vào Planning Screen:

```typescript
useEffect(() => {
  console.log('=== DEBUG INFO ===');
  console.log('Convex User:', convexUser);
  console.log('Trips from DB:', trips);
  console.log('Current Trip:', currentTrip);
  console.log('Zustand Trips:', useTripStore.getState().trips);
}, [trips, currentTrip, convexUser]);
```

## Checklist

- [ ] Convex backend đang chạy (`npx convex dev`)
- [ ] EXPO_PUBLIC_CONVEX_URL đã được set trong `.env`
- [ ] User đã đăng nhập và có `convexUser._id`
- [ ] Không có lỗi trong console
- [ ] Data có trong Convex Dashboard
- [ ] Real-time subscription hoạt động

## Next Steps

Nếu vẫn không thấy data, hãy:
1. Check console logs
2. Check Convex Dashboard
3. Verify environment variables
4. Restart cả frontend và backend

