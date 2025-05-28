import { Injectable, Logger } from '@nestjs/common';
import { VnpayService } from 'nestjs-vnpay';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { dateFormat, ProductCode, VnpLocale } from 'vnpay';
import { CartPaymentDto } from './dto/cart-payment.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { OrdersService } from '../orders/orders.service'; // Add this import
import { NotificationsService } from '../notifications/notifications.service'; // Add this import
import { Types } from 'mongoose'; // Add this import

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly vnpayService: VnpayService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
    private readonly ordersService: OrdersService, // Add this service
    private readonly notificationsService: NotificationsService, // Add this service
  ) {}

  async getBankList() {
    return this.vnpayService.getBankList();
  }

  async createPaymentUrlFromCart(
    cartPaymentDto: CartPaymentDto,
    ipAddr: string,
    userId: string,
  ) {
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
    this.logger.debug(
      'Payment Parameters:',
      JSON.stringify(paymentParams, null, 2),
    );

    try {
      const vnpUrlReturn =
        await this.vnpayService.buildPaymentUrl(paymentParams);

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
        },
      });

      return {
        paymentUrl: vnpUrlReturn,
        orderReference,
        totalAmount: cart.totalPrice,
        currency: 'VND',
      };
    } catch (error) {
      this.logger.error('Error generating payment URL:', error);
      throw error;
    }
  }

  async verifyReturnUrl(query: any) {
    this.logger.debug(
      'Received return query params:',
      JSON.stringify(query, null, 2),
    );

    try {
      const verificationResult = await this.vnpayService.verifyReturnUrl(query);
      this.logger.debug(
        'Verification result:',
        JSON.stringify(verificationResult, null, 2),
      );

      // Create transaction if payment is successful
      if (verificationResult.isSuccess) {
        const orderId = query.vnp_TxnRef;
        const amount = parseInt(query.vnp_Amount, 10) / 100; // Convert back from VND format

        // Extract userId from orderInfo (which was embedded during payment creation)
        // Format: order_{orderReference}_user_{userId}
        const orderInfo = query.vnp_OrderInfo;
        const userIdMatch = orderInfo.match(/user_([^_]+)/);
        const userId = userIdMatch ? userIdMatch[1] : null;

        if (!userId) {
          this.logger.error('Cannot extract userId from orderInfo');
          throw new Error('Invalid order information');
        }

        // First, find and update any pending transaction with this orderId
        const existingTransaction =
          await this.transactionsService.findByOrderId(orderId);

        let transaction;
        if (existingTransaction) {
          // Fix the type error by using explicit type conversion
          const transactionId = existingTransaction._id instanceof Types.ObjectId 
            ? existingTransaction._id.toString() 
            : String(existingTransaction._id);

          // If transaction exists, update it to success
          transaction = await this.transactionsService.updateStatus(
            transactionId,
            'success',
          );
          this.logger.debug(
            `Updated existing transaction status: ${transaction._id}`,
          );

          // Update the paymentDetails with VNPay response data
          transaction = await this.transactionsService.update(
            transactionId,
            {
              paymentDetails: {
                ...existingTransaction.paymentDetails,
                bankCode: query.vnp_BankCode,
                cardType: query.vnp_CardType,
                transactionNo: query.vnp_TransactionNo,
                payDate: query.vnp_PayDate,
                responseCode: query.vnp_ResponseCode,
              },
            },
          );
        } else {
          // If no transaction exists, create a new one
          transaction = await this.transactionsService.create({
            orderId,
            status: 'success',
            totalAmount: amount,
            paymentMethod: 'VNPAY',
            paymentDetails: {
              userId,
              bankCode: query.vnp_BankCode,
              cardType: query.vnp_CardType,
              transactionNo: query.vnp_TransactionNo,
              payDate: query.vnp_PayDate,
              responseCode: query.vnp_ResponseCode,
            },
          });
          this.logger.debug(`Created new transaction: ${transaction._id}`);
        }

        // Check if paymentDetails and cartId exist
        const cartId = transaction.paymentDetails?.cartId || '';
        if (!cartId) {
          this.logger.error('Cart ID not found in transaction details');
          throw new Error('Cart information missing');
        }

        // Create order with pending status
        // Use explicit type conversion for transaction._id
        const transactionId =
          transaction._id instanceof Types.ObjectId
            ? transaction._id.toString()
            : String(transaction._id);

        const createdOrder = await this.ordersService.createOrderFromCart({
          userId: userId,
          cartId: cartId,
          transactionId: transactionId,
          status: 'pending', // Order starts with pending status
        });

        // Use explicit type conversion for createdOrder._id
        const orderIdString =
          createdOrder._id instanceof Types.ObjectId
            ? createdOrder._id.toString()
            : String(createdOrder._id);

        // Send notification to staff about the new order that needs confirmation
        await this.notificationsService.createStaffNotification({
          type: 'order_confirmation_needed',
          title: 'New Order Requires Confirmation',
          message: `New order #${orderIdString} needs your confirmation.`,
          orderId: orderIdString,
          priority: 'high',
        });

        this.logger.debug(
          'Order created and notification sent:',
          orderIdString,
        );

        // Return a formatted result for the frontend
        return {
          isSuccess: true,
          message:
            'Payment successful. Order created and pending staff confirmation.',
          orderId: orderIdString,
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
        originalData: query,
      };
    } catch (error) {
      this.logger.error('Verification error:', error);
      return {
        isSuccess: false,
        message: error.message || 'Payment verification error',
        originalError: error,
        originalQuery: query,
      };
    }
  }
}
