import { Injectable, Logger } from '@nestjs/common';
import { VnpayService } from 'nestjs-vnpay';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { dateFormat, ProductCode, VnpLocale } from 'vnpay';
import { CartPaymentDto } from './dto/cart-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly vnpayService: VnpayService,
    private readonly configService: ConfigService,
  ) {}

  async getBankList() {
    return this.vnpayService.getBankList();
  }

  async createPaymentUrlFromCart(cartPaymentDto: CartPaymentDto, ipAddr: string) {
    const { cart } = cartPaymentDto;
    
    // Round the total price to a whole number and multiply by 100 for VND
    const amountInVnd = Math.round(cart.totalPrice * 100);
    
    // Generate simpler order reference based on timestamp
    const orderReference = `${Date.now()}`;
    
    // Create simple order info
    const orderInfo = `Thanh toan don hang ${orderReference}`;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use exactly the fields that work without signature error
    const paymentParams = {
      vnp_Amount: amountInVnd,
      vnp_IpAddr: '13.160.92.202',
      vnp_TxnRef: orderReference,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://localhost:4000/payment-result',
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    };

    // Log payment parameters
    this.logger.debug('Simplified Cart Payment Parameters:', JSON.stringify(paymentParams, null, 2));

    try {
      const vnpUrlReturn = await this.vnpayService.buildPaymentUrl(paymentParams);
      
      // Log the returned URL
      this.logger.debug('Generated Cart Payment URL:', vnpUrlReturn);
      
      return { 
        paymentUrl: vnpUrlReturn,
        orderReference,
        totalAmount: cart.totalPrice,
        currency: 'VND'
      };
    } catch (error) {
      this.logger.error('Error generating cart payment URL:', error);
      throw error;
    }
  }

  async verifyReturnUrl(query: any) {
    this.logger.debug('Received return query params:', JSON.stringify(query, null, 2));
    
    try {
      const verificationResult = await this.vnpayService.verifyReturnUrl(query);
      this.logger.debug('Verification result:', JSON.stringify(verificationResult, null, 2));
      return verificationResult;
    } catch (error) {
      this.logger.error('Verification error:', error);
      return {
        isSuccess: false,
        message: error.message,
        originalError: error,
        originalQuery: query
      };
    }
  }
}
