import { Body, Controller, Get, Logger, Post, Query, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';
import { CartPaymentDto } from './dto/cart-payment.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('banks')
  getBankList() {
    return this.paymentsService.getBankList();
  }
  
  @Post('cart-checkout')
  createCartPayment(
    @Body() cartPaymentDto: CartPaymentDto, 
    @Req() req: Request
  ) {
    this.logger.log(`Creating cart payment with total: ${cartPaymentDto.cart.totalPrice}`);
    this.logger.debug(`Cart details: ${JSON.stringify(cartPaymentDto.cart)}`);
    
    const ipAddr = req.ip || req.socket.remoteAddress || '127.0.0.1';
    this.logger.debug(`Client IP: ${ipAddr}`);
    
    return this.paymentsService.createPaymentUrlFromCart(cartPaymentDto, ipAddr);
  }

  @Get('vnpay-return')
  handleReturn(@Query() query: any) {
    this.logger.log('Received VNPay return callback');
    this.logger.debug(`Return query params: ${JSON.stringify(query)}`);
    
    return this.paymentsService.verifyReturnUrl(query);
  }
}