import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';
import { CartPaymentDto } from './dto/cart-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from '../cart/cart.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly cartService: CartService,
  ) {}

  @Get('banks')
  getBankList() {
    return this.paymentsService.getBankList();
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart-checkout')
  async createPaymentFromCart(
    @Body() cartPaymentDto: CartPaymentDto,
    @Req() req,
  ) {
    // Get userId from token
    const userId =
      req.user._id || req.user.id || req.user.sub || req.user.userId;

    // If we still don't have a userId, log detailed info and throw error
    if (!userId) {
      this.logger.error(
        `No userId found in auth token. Token payload: ${JSON.stringify(req.user)}`,
      );
      throw new UnauthorizedException('User not properly authenticated');
    }

    this.logger.log(`Creating cart payment for user: ${userId}`);
    this.logger.debug(`Token payload: ${JSON.stringify(req.user)}`);

    // Set the correct userId in the cart object
    if (cartPaymentDto.cart) {
      cartPaymentDto.cart.userId = userId;
    }

    try {
      // Verify cart belongs to the authenticated user
      const cart = await this.cartService.findOne(cartPaymentDto.cart._id);

      if (!cart) {
        this.logger.warn(`Cart not found: ${cartPaymentDto.cart._id}`);
        throw new NotFoundException(
          `Cart with ID ${cartPaymentDto.cart._id} not found`,
        );
      }

      this.logger.debug(`Found cart for user check: ${JSON.stringify(cart)}`);

      // Check if the cart belongs to the user - use looser comparison or optional chaining
      if (cart.userId && String(cart.userId) !== String(userId)) {
        this.logger.warn(
          `Unauthorized cart access attempt: ${cartPaymentDto.cart._id} by user: ${userId}, cart belongs to: ${cart.userId}`,
        );
        throw new UnauthorizedException('You do not have access to this cart');
      }

      this.logger.log(
        `Creating cart payment with total: ${cartPaymentDto.cart.totalPrice}`,
      );

      const ipAddr = req.ip || req.socket.remoteAddress || '127.0.0.1';

      return this.paymentsService.createPaymentUrlFromCart(
        cartPaymentDto,
        ipAddr,
        userId,
      );
    } catch (error) {
      this.logger.error(`Error in cart payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('vnpay-return')
  handleReturn(@Query() query: any) {
    this.logger.log('Received VNPay return callback');
    this.logger.debug(`Return query params: ${JSON.stringify(query)}`);

    return this.paymentsService.verifyReturnUrl(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  verifyPayment(@Query() query: any) {
    this.logger.log('Verifying payment with query params');
    this.logger.debug(`Verification query params: ${JSON.stringify(query)}`);

    return this.paymentsService.verifyReturnUrl(query);
  }
}
