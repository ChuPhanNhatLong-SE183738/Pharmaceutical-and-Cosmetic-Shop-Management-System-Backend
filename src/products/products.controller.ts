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
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product', description: 'Creates a new product with the provided details' })
  @ApiBody({ type: CreateProductDto, description: 'Product data' })
  @ApiCreatedResponse({ description: 'The product has been successfully created' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - user is not logged in' })
  @ApiForbiddenResponse({ description: 'Forbidden - user does not have required roles' })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return successResponse(product, 'Product created successfully');
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products with filtering options',
    description: 'Retrieve products with filtering by category, price, brand, etc.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, type: String, description: 'Sort order (asc/desc)', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category ID(s)' })
  @ApiQuery({ name: 'brand', required: false, type: String, description: 'Filter by brand name' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for product name or description' })
  @ApiQuery({ name: 'sortPrice', required: false, type: String, enum: ['asc', 'desc'], description: 'Sort by price (asc/desc)' })
  @ApiOkResponse({ description: 'Products retrieved successfully' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('category') category?: string | string[],
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('search') search?: string,
    @Query('sortPrice') sortPrice?: 'asc' | 'desc',
  ) {
    const query = {
      page,
      limit,
      sortBy,
      order,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortPrice,
    };
    const result = await this.productsService.findAll(query);
    return successResponse(result, 'Products retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID', description: 'Retrieves product details by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({ description: 'Product retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return successResponse(product, 'Product retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product', description: 'Updates a product with the provided details' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto, description: 'Updated product data' })
  @ApiOkResponse({ description: 'Product updated successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - user is not logged in' })
  @ApiForbiddenResponse({ description: 'Forbidden - user does not have required roles' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product', description: 'Deletes a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({ description: 'Product deleted successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - user is not logged in' })
  @ApiForbiddenResponse({ description: 'Forbidden - user does not have required roles' })
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
  @ApiOperation({ summary: 'Get products by brand', description: 'Retrieves all products for a specific brand' })
  @ApiParam({ name: 'brand', description: 'Brand name' })
  @ApiOkResponse({ description: 'Products retrieved successfully' })
  async findByBrand(@Param('brand') brand: string) {
    const products = await this.productsService.findByBrand(brand);
    return successResponse(products, 'Products retrieved successfully');
  }

  @Patch(':id/stock/increment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increment product stock', description: 'Increases the stock quantity of a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ schema: { properties: { quantity: { type: 'number', example: 5 } } }, description: 'Quantity to add' })
  @ApiOkResponse({ description: 'Product stock incremented successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - user is not logged in' })
  @ApiForbiddenResponse({ description: 'Forbidden - user does not have required roles' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decrement product stock', description: 'Decreases the stock quantity of a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ schema: { properties: { quantity: { type: 'number', example: 1 } } }, description: 'Quantity to remove' })
  @ApiOkResponse({ description: 'Product stock decremented successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - user is not logged in' })
  @ApiForbiddenResponse({ description: 'Forbidden - user does not have required roles' })
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
    description: 'Returns the current price of a product including any applicable discount'
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({ description: 'Current price retrieved successfully', schema: { properties: { price: { type: 'number' } } } })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getCurrentPrice(@Param('id') id: string) {
    const price = await this.productsService.getCurrentPrice(id);
    return { price };
  }
}
