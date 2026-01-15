"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Generate VNPay payment URL
export const generateVNPayUrl = action({
  args: {
    paymentId: v.id("payments"),
    returnUrl: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get payment details
    const payment = await ctx.runQuery(api.payments.getPayment, {
      paymentId: args.paymentId,
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    console.log(`[generateVNPayUrl] 💰 Payment details:`, {
      paymentId: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      bookingId: payment.bookingId,
    });

    // Get VNPay config from environment (in production, use Convex environment variables)
    const vnp_TmnCode = process.env.VNPAY_TMN_CODE || process.env.NEXT_PUBLIC_VNPAY_TMN_CODE || "4ASZ2MCM";
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || "GD5GZC9BHRJO95YR48R9CDKCROZJYH2T";
    const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    // Generate transaction reference from payment ID
    // Always generate a new unique ID. Reusing an old externalTransactionId with a new vnp_CreateDate 
    // will cause VNPay to reject the request with a signature error or duplicate transaction error.
    const vnp_TxnRef = `TXN_${Date.now()}_${payment._id}`;

    // VNPay requires amount in cents (multiply by 100)
    const vnp_Amount = Math.round(payment.amount * 100).toString();

    // Format date to yyyyMMddHHmmss in GMT+7 strictly
    const date = new Date();
    // VNPAY requires GMT+7 time
    const localDate = new Date(date.getTime() + 7 * 60 * 60 * 1000); // add 7 hours strictly to UTC time
    
    const yyyy = localDate.getUTCFullYear();
    const MM = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getUTCDate()).padStart(2, '0');
    const HH = String(localDate.getUTCHours()).padStart(2, '0');
    const mm = String(localDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(localDate.getUTCSeconds()).padStart(2, '0');
    
    const createDate = `${yyyy}${MM}${dd}${HH}${mm}${ss}`;

    // Add 15 minutes for expire date
    const expireDateObj = new Date(localDate.getTime() + 15 * 60 * 1000);
    const ex_yyyy = expireDateObj.getUTCFullYear();
    const ex_MM = String(expireDateObj.getUTCMonth() + 1).padStart(2, '0');
    const ex_dd = String(expireDateObj.getUTCDate()).padStart(2, '0');
    const ex_HH = String(expireDateObj.getUTCHours()).padStart(2, '0');
    const ex_mm = String(expireDateObj.getUTCMinutes()).padStart(2, '0');
    const ex_ss = String(expireDateObj.getUTCSeconds()).padStart(2, '0');
    const expireDate = `${ex_yyyy}${ex_MM}${ex_dd}${ex_HH}${ex_mm}${ex_ss}`;

    // Using the official vnpay package to eliminate any hashing/encoding discrepancies
    const { VNPay, ignoreLogger } = require("vnpay");
    
    const vnpay = new VNPay({
      tmnCode: vnp_TmnCode,
      secureSecret: vnp_HashSecret,
      vnpayHost: "https://sandbox.vnpayment.vn",
      testMode: true,
      hashAlgorithm: "SHA512",
      enableLog: false,
      loggerFn: ignoreLogger,
    });
    
    // Note: The vnpay package automatically converts vnp_Amount = amount * 100
    // so we just pass the original payment.amount
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(payment.amount),
      vnp_IpAddr: "113.160.92.202",
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: `Payment for booking ${payment.bookingId}`,
      vnp_OrderType: "other",
      vnp_ReturnUrl: args.returnUrl,
      vnp_Locale: "vn",
      vnp_CreateDate: Number(createDate),
      vnp_ExpireDate: Number(expireDate),
    });

    // Update payment with transaction reference and save url for debugging
    await ctx.runMutation(api.payments.updatePaymentStatus, {
      paymentId: args.paymentId,
      status: "processing",
      externalTransactionId: vnp_TxnRef,
      metadata: {
        debug_paymentUrl: paymentUrl,
      },
    });
    
    console.log(`[generateVNPayUrl] ✅ VNPay URL generated:`, {
      amount: payment.amount,
      vnp_Amount,
      urlLength: paymentUrl.length,
    });

    return {
      paymentUrl,
      transactionId: vnp_TxnRef,
    };
  },
});

// Verify VNPay callback (action for client-side verification)
export const verifyVNPayCallback = action({
  args: {
    vnp_Params: v.any(),
  },
  handler: async (ctx, args): Promise<any> => {
    let vnp_Params = { ...args.vnp_Params };
    const secureHash = vnp_Params['vnp_SecureHash'];
    
    const vnp_TmnCode = process.env.VNPAY_TMN_CODE || process.env.NEXT_PUBLIC_VNPAY_TMN_CODE || "4ASZ2MCM";
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || "GD5GZC9BHRJO95YR48R9CDKCROZJYH2T";

    // Using the official vnpay package
    const { VNPay } = require("vnpay");
    const vnpay = new VNPay({
      tmnCode: vnp_TmnCode,
      secureSecret: vnp_HashSecret,
      vnpayHost: "https://sandbox.vnpayment.vn",
      testMode: true,
      hashAlgorithm: "SHA512",
    });

    // vnpay package expects the query string object directly
    let isValid = false;
    try {
      isValid = vnpay.verifyReturnUrl(args.vnp_Params);
    } catch (e) {
      console.error("[verifyVNPayCallback] Error verifying return url:", e);
    }

    if (!isValid) {
      console.error("[verifyVNPayCallback] ❌ Invalid signature!");
      return { success: false, message: "Invalid signature", code: "97" };
    }

    // Process the webhook mutation to update payment status
    const result = await ctx.runMutation(api.payments.processVNPayWebhook, {
      vnp_ResponseCode: vnp_Params['vnp_ResponseCode'] || "",
      vnp_TransactionStatus: vnp_Params['vnp_TransactionStatus'] || "",
      vnp_TxnRef: vnp_Params['vnp_TxnRef'] || "",
      vnp_Amount: vnp_Params['vnp_Amount'] || "",
      vnp_SecureHash: secureHash || "",
      vnp_OrderInfo: vnp_Params['vnp_OrderInfo'] || "",
    });

    return result;
  },
});

