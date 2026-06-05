
export interface PaymentRequest {
  amount: number;
  orderId: string;
  orderDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  message?: string;
  error?: string;
}

export interface VNPayConfig {
  vnp_TmnCode: string;
  vnp_HashSecret: string;
  vnp_Url: string;
  vnp_ReturnUrl: string;
}

class PaymentService {
  private config: VNPayConfig = {
    vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'YOUR_TMN_CODE',
    vnp_HashSecret: process.env.VNPAY_HASH_SECRET || 'YOUR_HASH_SECRET',
    vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: 'https://your-app.com/payment/return',
  };

  // Generate VNPay payment URL
  generateVNPayUrl(request: PaymentRequest): string {
    const {
      amount,
      orderId,
      orderDescription,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
    } = request;

    const params = new URLSearchParams({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.vnp_TmnCode,
      vnp_Amount: (amount * 100).toString(), // VNPay requires amount in cents
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderDescription,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1', // In production, get real IP
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''),
    });

    // Add customer info if available
    if (customerName) params.append('vnp_Bill_FirstName', customerName);
    if (customerEmail) params.append('vnp_Bill_Email', customerEmail);
    if (customerPhone) params.append('vnp_Bill_Mobile', customerPhone);

    // Sort parameters for hash generation
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // Generate secure hash
    const secureHash = this.generateSecureHash(sortedParams);

    // Add hash to parameters
    params.append('vnp_SecureHash', secureHash);

    return `${this.config.vnp_Url}?${params.toString()}`;
  }

  // Generate secure hash for VNPay
  private generateSecureHash(queryString: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha512', this.config.vnp_HashSecret);
    hmac.update(queryString);
    return hmac.digest('hex');
  }

  // Verify VNPay response
  verifyVNPayResponse(responseParams: Record<string, string>): PaymentResponse {
    try {
      const {
        vnp_ResponseCode,
        vnp_TransactionStatus,
        vnp_TxnRef,
        vnp_Amount,
        vnp_SecureHash,
        vnp_OrderInfo,
      } = responseParams;

      // Remove hash from params for verification
      const { vnp_SecureHash: _, ...paramsForHash } = responseParams;
      
      // Sort parameters
      const sortedParams = Object.entries(paramsForHash)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      // Verify hash
      const expectedHash = this.generateSecureHash(sortedParams);
      
      if (vnp_SecureHash !== expectedHash) {
        return {
          success: false,
          error: 'Invalid hash signature',
        };
      }

      // Check response code
      if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
        return {
          success: true,
          transactionId: vnp_TxnRef,
          amount: parseInt(vnp_Amount) / 100, // Convert back from cents
          message: 'Payment successful',
        };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(vnp_ResponseCode),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Payment verification failed',
      };
    }
  }

  // Get error message from VNPay response code
  private getErrorMessage(responseCode: string): string {
    const errorMessages: Record<string, string> = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch bị hủy',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };

    return errorMessages[responseCode] || 'Giao dịch không thành công';
  }

  // Process payment with VNPay
  async processVNPayPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const paymentUrl = this.generateVNPayUrl(request);
      
      // In a real app, you would open WebView or redirect to payment URL
      // For now, we'll simulate a successful payment
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            transactionId: `TXN_${Date.now()}`,
            amount: request.amount,
            message: 'Payment successful',
          });
        }, 2000);
      });
    } catch (error) {
      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  // Process MoMo payment (mock implementation)
  async processMoMoPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Mock MoMo payment processing
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            transactionId: `MOMO_${Date.now()}`,
            amount: request.amount,
            message: 'MoMo payment successful',
          });
        }, 1500);
      });
    } catch (error) {
      return {
        success: false,
        error: 'MoMo payment failed',
      };
    }
  }

  // Process bank transfer (mock implementation)
  async processBankTransfer(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Mock bank transfer processing
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            transactionId: `BANK_${Date.now()}`,
            amount: request.amount,
            message: 'Bank transfer initiated. Please complete payment within 24 hours.',
          });
        }, 1000);
      });
    } catch (error) {
      return {
        success: false,
        error: 'Bank transfer failed',
      };
    }
  }

  // Get payment methods
  getPaymentMethods() {
    return [
      {
        id: 'vnpay',
        name: 'VNPAY',
        description: 'Thanh toán qua VNPAY',
        icon: '💳',
        enabled: true,
      },
      {
        id: 'momo',
        name: 'MoMo',
        description: 'Ví điện tử MoMo',
        icon: '📱',
        enabled: true,
      },
      {
        id: 'bank',
        name: 'Chuyển khoản',
        description: 'Chuyển khoản ngân hàng',
        icon: '🏦',
        enabled: true,
      },
    ];
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  // Calculate fees
  calculateFees(amount: number, paymentMethod: string): number {
    const feeRates: Record<string, number> = {
      vnpay: 0.015, // 1.5%
      momo: 0.01,   // 1%
      bank: 0.005,  // 0.5%
    };

    return Math.round(amount * (feeRates[paymentMethod] || 0));
  }
}

export const paymentService = new PaymentService();
