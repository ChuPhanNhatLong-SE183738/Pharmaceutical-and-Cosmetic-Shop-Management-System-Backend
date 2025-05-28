import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/users/enums/role.enum';
import { successResponse } from 'src/helper/response.helper';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid data provided.' })
  @ApiBody({
    description: 'Product data',
    schema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          example: 'Vitamin C Serum',
          description: 'Name of the product',
        },
        productDescription: {
          type: 'string',
          example:
            'Brightening serum with 20% vitamin C that helps reduce dark spots',
          description: 'Detailed description of the product',
        },
        price: {
          type: 'number',
          example: 45.99,
          description: 'Price of the product',
        },
        stock: {
          type: 'number',
          example: 100,
          description: 'Available quantity in stock',
        },
        category: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['skincare', 'serum', 'face'],
          description: 'Product categories',
        },
        brand: {
          type: 'string',
          example: 'GlowBright',
          description: 'Brand name',
        },
        productImages: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'https://example.com/images/vitamin-c-serum-1.jpg',
            'https://example.com/images/vitamin-c-serum-2.jpg',
          ],
          description: 'URLs to product images',
        },
        ingredients: {
          type: 'string',
          example: 'Water, Ascorbic Acid, Glycerin, Propylene Glycol',
          description: 'Product ingredients',
        },
        suitableFor: {
          type: 'string',
          example: 'All skin types',
          description: 'Skin type suitability',
          enum: [
            'All skin types',
            'Dry skin',
            'Oily skin',
            'Sensitive skin',
            'Combination skin',
            'Normal skin',
          ],
        },
        salePercentage: {
          type: 'number',
          example: 0,
          description: 'Discount percentage',
        },
        expiryDate: {
          type: 'string',
          format: 'date',
          example: '2025-12-31',
          description: 'Product expiry date',
        },
      },
      required: ['productName', 'price', 'stock'],
    },
  })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return successResponse(product, 'Product created successfully');
  }

  @Get()
  async findAll(@Query() query) {
    const result = await this.productsService.findAll(query);
    return successResponse(result, 'Products retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return successResponse(product, 'Product retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return successResponse(product, 'Product updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return successResponse(null, 'Product deleted successfully');
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    const products = await this.productsService.findByCategory(category);
    return successResponse(products, 'Products retrieved successfully');
  }

  @Get('brand/:brand')
  async findByBrand(@Param('brand') brand: string) {
    const products = await this.productsService.findByBrand(brand);
    return successResponse(products, 'Products retrieved successfully');
  }

  @Patch(':id/stock/increment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async incrementStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    const product = await this.productsService.incrementStock(id, quantity);
    return successResponse(product, 'Product stock incremented successfully');
  }

  @Patch(':id/stock/decrement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async decrementStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    const product = await this.productsService.decrementStock(id, quantity);
    return successResponse(product, 'Product stock decremented successfully');
  }

  @Get(':id/price')
  @ApiOperation({
    summary: 'Get current price of a product with discount applied',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async getCurrentPrice(@Param('id') id: string) {
    const price = await this.productsService.getCurrentPrice(id);
    return { price };
  }
}
