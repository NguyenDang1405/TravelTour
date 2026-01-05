# 🔒 Giải quyết vấn đề Convex ghi đè .env.local

## ❌ Vấn đề

Mỗi lần chạy `npm run setup` hoặc `npx convex dev --once`, Convex CLI tự động tạo một deployment mới và **ghi đè** file `.env.local`, làm mất cấu hình `CONVEX_DEPLOYMENT` và `EXPO_PUBLIC_CONVEX_URL` mà bạn đã set.

### Tại sao lại xảy ra?

1. Khi chạy `npx convex dev --once`, Convex CLI kiểm tra xem có file `convex/convex.json` không
2. Nếu không có, nó sẽ tạo một deployment mới
3. Convex CLI tự động ghi deployment mới vào `.env.local`, **ghi đè** các giá trị cũ

## ✅ Giải pháp đã áp dụng

### 1. Script `setup.js` đã được sửa

Script `setup.js` giờ đây sẽ:
- **Backup** `CONVEX_DEPLOYMENT` và `EXPO_PUBLIC_CONVEX_URL` trước khi chạy Convex
- **Restore** lại các giá trị sau khi Convex khởi tạo xong
- **Tự động lock** deployment bằng cách tạo `convex/convex.json`

### 2. File `convex/convex.json` - Lock deployment

File này "khóa" deployment hiện tại, ngăn Convex CLI tạo deployment mới khi chạy với tài khoản/team khác.

**Tự động tạo** khi chạy `npm run setup` hoặc chạy thủ công:
```bash
npm run lock-convex
# hoặc
node scripts/lock-convex-deployment.js lock
```

### 3. Script restore nhanh: `restore-convex-deployment.js`

Khi `.env.local` bị ghi đè, chạy script này để restore ngay:
```bash
npm run restore-convex
# hoặc
node scripts/restore-convex-deployment.js
```

### 4. Script helper: `protect-convex-env.js`

Script này cho phép bạn backup/restore cấu hình Convex thủ công:

```bash
# Backup cấu hình hiện tại
node scripts/protect-convex-env.js backup

# Restore cấu hình đã backup
node scripts/protect-convex-env.js restore
```

## 🛡️ Cách bảo vệ .env.local

### ⭐ Cách 1: Chạy Convex dev với wrapper (Tự động - Khuyến nghị)

**Từ giờ, luôn dùng:**
```bash
npm run dev:be
```

Script wrapper sẽ:
- ✅ Tự động set `CONVEX_DEPLOYMENT` trước khi chạy
- ✅ Tự động restore `.env.local` mỗi 5 giây
- ✅ Tự động restore khi thoát (Ctrl+C)
- ✅ **KHÔNG BAO GIỜ** bị ghi đè bởi tài khoản khác

**KHÔNG chạy trực tiếp:**
```bash
npx convex dev  # ❌ Sẽ bị ghi đè!
```

### Cách 2: Sử dụng script setup (Tự động)

Chỉ cần chạy:
```bash
npm run setup
```

Script sẽ tự động backup và restore cấu hình Convex của bạn.

### Cách 2: Restore nhanh khi bị ghi đè (Khuyến nghị)

Nếu `.env.local` đã bị ghi đè, chạy ngay:

```bash
npm run restore-convex
```

Script này sẽ:
- Restore `CONVEX_DEPLOYMENT` về `dev:oceanic-setter-659`
- Restore `EXPO_PUBLIC_CONVEX_URL` về `https://oceanic-setter-659.convex.cloud`
- Tự động lock deployment

### Cách 3: Backup thủ công trước khi chạy Convex

Nếu bạn cần chạy `npx convex dev --once` trực tiếp:

```bash
# 1. Backup cấu hình
node scripts/protect-convex-env.js backup

# 2. Chạy Convex
npx convex dev --once

# 3. Restore cấu hình
node scripts/protect-convex-env.js restore
```

### Cách 4: Lock deployment để ngăn ghi đè

Sau khi restore, lock deployment để ngăn bị ghi đè lại:

```bash
npm run lock-convex
```

File `convex/convex.json` sẽ được tạo để "khóa" deployment hiện tại.

### Cách 5: Chỉnh sửa .env.local thủ công

Nếu quên backup, bạn có thể chỉnh sửa lại `.env.local`:

```env
# Convex Backend
CONVEX_DEPLOYMENT=dev:oceanic-setter-659 # team: duy-tran-ha, project: travel-tour
EXPO_PUBLIC_CONVEX_URL=https://oceanic-setter-659.convex.cloud
```

Sau đó chạy `npm run lock-convex` để lock deployment.

## 📝 Lưu ý quan trọng

1. **File backup**: `.env.local.convex-backup` được tạo tự động và đã được thêm vào `.gitignore`
2. **Không commit**: File backup không được commit vào git
3. **Mỗi lần reset**: Nếu bạn reset project, nhớ backup lại cấu hình Convex trước

## 🔍 Kiểm tra cấu hình hiện tại

Để xem deployment hiện tại:

```bash
# Xem trong .env.local
cat .env.local | grep CONVEX

# Hoặc kiểm tra qua Convex CLI
npx convex deploy --cmd "echo"
```

## 💡 Best Practices

1. **Luôn backup** trước khi chạy các lệnh Convex có thể thay đổi deployment
2. **Sử dụng script setup** thay vì chạy `npx convex dev --once` trực tiếp
3. **Kiểm tra .env.local** sau khi chạy bất kỳ lệnh Convex nào
4. **Lưu deployment URL** ở một nơi an toàn (ví dụ: trong Convex Dashboard)

## 🆘 Nếu vẫn bị ghi đè

Nếu sau khi áp dụng các giải pháp trên mà vẫn bị ghi đè:

1. **Đảm bảo bạn đang dùng `npm run dev:be`** chứ không phải `npx convex dev` trực tiếp
2. Chạy restore ngay: `npm run restore-convex`
3. Kiểm tra xem script `convex-dev-wrapper.js` có tồn tại không
4. Kiểm tra `package.json` có script `dev:be` đúng không (phải là `node ./scripts/convex-dev-wrapper.js`)
5. Nếu vẫn bị, kiểm tra xem có script nào khác đang gọi `npx convex dev` trực tiếp không

## 📚 Tài liệu tham khảo

- [Convex CLI Documentation](https://docs.convex.dev/cli)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)

