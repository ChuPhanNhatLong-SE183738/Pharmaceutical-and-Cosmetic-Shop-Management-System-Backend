import { Injectable, Logger } from '@nestjs/common';
import { VnpayService } from 'nestjs-vnpay';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { dateFormat, ProductCode, VnpLocale } from 'vnpay';
import { CartPaymentDto } from './dto/cart-payment.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly vnpayService: VnpayService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async getBankList() {
    return this.vnpayService.getBankList();
  }

  async createPaymentUrlFromCart(cartPaymentDto: CartPaymentDto, ipAddr: string, userId: string) {
    const { cart } = cartPaymentDto;
    
    // Always use the userId from the JWT token, not from the request payload
    const validatedUserId = userId;
    
    // Store userId in order info for verification later
    const orderReference = `${Date.now()}`;
    // Create order info with userId embedded for security
    const orderInfo = `order_${orderReference}_user_${validatedUserId}`;
    
    // Round the total price to a whole number and multiply by 100 for VND
    const amountInVnd = Math.round(cart.totalPrice * 100);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use exactly the fields that work without signature error
    const paymentParams = {
      vnp_Amount: amountInVnd,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_TxnRef: orderReference,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://localhost:4000/payment-result',
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    };

    // Log payment parameters
    this.logger.debug('Payment Parameters:', JSON.stringify(paymentParams, null, 2));

    try {
      const vnpUrlReturn = await this.vnpayService.buildPaymentUrl(paymentParams);
      
      // Create a pending transaction record
      await this.transactionsService.create({
        orderId: orderReference,
        status: 'pending',
        totalAmount: cart.totalPrice,
        paymentMethod: 'VNPAY',
        paymentDetails: {
          userId: validatedUserId, // Use the validated userId
          cartId: cart._id,
          ipAddr: ipAddr,
        }
      });
      
      return { 
        paymentUrl: vnpUrlReturn,
        orderReference,
        totalAmount: cart.totalPrice,
        currency: 'VND'
      };
    } catch (error) {
      this.logger.error('Error generating payment URL:', error);
      throw error;
    }
  }

  async verifyReturnUrl(query: any) {
    this.logger.debug('Received return query params:', JSON.stringify(query, null, 2));
    
    try {
      const verificationResult = await this.vnpayService.verifyReturnUrl(query);
      this.logger.debug('Verification result:', JSON.stringify(verificationResult, null, 2));
      
      // Create transaction if payment is successful
      if (verificationResult.isSuccess) {
        const orderId = query.vnp_TxnRef;
        const amount = parseInt(query.vnp_Amount, 10) / 100; // Convert back from VND format
        
        // Create a transaction with more details
        await this.transactionsService.create({
          orderId,
          status: 'success',
          totalAmount: amount,
          paymentMethod: 'VNPAY',
          paymentDetails: {
            bankCode: query.vnp_BankCode,
            cardType: query.vnp_CardType,
            transactionNo: query.vnp_TransactionNo,
            payDate: query.vnp_PayDate,
            responseCode: query.vnp_ResponseCode
          }
        });
        
        this.logger.debug('Transaction created successfully for order:', orderId);
        
        // Return a formatted result for the frontend
        return {
          isSuccess: true,
          message: 'Payment successful',
          orderId: orderId,
          amount: amount,
          transactionId: query.vnp_TransactionNo,
          bankCode: query.vnp_BankCode,
          paymentTime: query.vnp_PayDate,
        };
      }
      
      return {
        isSuccess: false,
        message: 'Payment verification failed',
        responseCode: query.vnp_ResponseCode,
        originalData: query
      };
    } catch (error) {
      this.logger.error('Verification error:', error);
      return {
        isSuccess: false,
        message: error.message || 'Payment verification error',
        originalError: error,
        originalQuery: query
      };
    }
  }
}
