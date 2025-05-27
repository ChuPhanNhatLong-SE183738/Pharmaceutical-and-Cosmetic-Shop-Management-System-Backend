import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, HttpStatus, HttpException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto, AddToCartDto } from './dto/update-cart.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { successResponse, errorResponse } from '../helper/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { ProductsService } from '../products/products.service';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(
    private readonly cartService: CartService,
    private readonly productsService: ProductsService // Inject ProductsService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.id;
    return this.cartService.addToCart(
      userId,
      addToCartDto.productId,
      addToCartDto.quantity,
    );
  }

  // Customer endpoints for their own cart - SPECIFIC ROUTES FIRST
  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test authentication' })
  async testAuth(@Request() req) {
    try {
      console.log('Request user object:', req.user);
      return successResponse({
        message: 'Authentication successful',
        user: req.user,
      }, 'Authentication test successful');
    } catch (error) {
      console.error('Auth test error:', error);
      return errorResponse('Authentication test failed', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }
  }

  @Get('my-cart')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'User cart retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Cart not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User not authenticated' })
  async getMyCart(@Request() req) {
    try {
      this.logger.log('Getting cart for authenticated user');
      
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }

      const userId = req.user._id || req.user.id || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      const userObjectId = new Types.ObjectId(userId.toString());
      const cart = await this.cartService.findByUserId(userObjectId);
      
      if (!cart) {
        return successResponse(null, 'User has no cart yet');
      }
      return successResponse(cart, 'User cart retrieved successfully');
    } catch (error) {
      this.logger.error(`Error in getMyCart: ${error.message}`);
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('add-item')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add an item to current user cart' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Item added to cart successfully' })
  async addToCartLegacy(@Request() req, @Body() addToCartDto: AddToCartDto) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      const userId = req.user._id || req.user.id || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      const userObjectId = new Types.ObjectId(userId.toString());
      const updatedCart = await this.cartService.addToCart(
        userObjectId.toString(), 
        addToCartDto.productId,
        addToCartDto.quantity
      );
      return successResponse(updatedCart, 'Item added to cart successfully');
    } catch (error) {
      this.logger.error(`Error in addToCart: ${error.message}`);
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse('Failed to add item to cart', HttpStatus.BAD_REQUEST, error);
    }
  }

  @Delete('remove-item/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove an item from current user cart' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Item removed from cart successfully' })
  async removeFromCart(@Request() req, @Param('productId') productId: string) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      const userId = req.user._id || req.user.id || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      const userObjectId = new Types.ObjectId(userId.toString());
      const updatedCart = await this.cartService.removeFromCart(userObjectId, new Types.ObjectId(productId));
      return successResponse(updatedCart, 'Item removed from cart successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('clear')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear the current user cart' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Cart cleared successfully' })
  async clearCart(@Request() req) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      const userId = req.user._id || req.user.id || req.user.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      const userObjectId = new Types.ObjectId(userId.toString());
      const emptyCart = await this.cartService.clearCart(userObjectId);
      return successResponse(emptyCart, 'Cart cleared successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Admin endpoints - GENERIC ROUTES LAST
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new cart (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Cart created successfully' })
  async create(@Body() createCartDto: CreateCartDto) {
    try {
      const cart = await this.cartService.create(createCartDto);
      return successResponse(cart, 'Cart created successfully', HttpStatus.CREATED);
    } catch (error) {
      return errorResponse(error.message, HttpStatus.BAD_REQUEST, error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all carts (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All carts retrieved successfully' })
  async findAll() {
    try {
      const carts = await this.cartService.findAll();
      return successResponse(carts, 'All carts retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Cart ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cart retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Cart not found' })
  async findOne(@Param('id') id: string) {
    try {
      const cart = await this.cartService.findOne(id);
      return successResponse(cart, 'Cart retrieved successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a cart by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Cart ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cart updated successfully' })
  async update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    try {
      const updatedCart = await this.cartService.update(id, updateCartDto);
      return successResponse(updatedCart, 'Cart updated successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a cart by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Cart ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cart deleted successfully' })
  async remove(@Param('id') id: string) {
    try {
      const deletedCart = await this.cartService.remove(id);
      return successResponse(deletedCart, 'Cart deleted successfully');
    } catch (error) {
      if (error instanceof HttpException) {
        return errorResponse(error.message, error.getStatus());
      }
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
