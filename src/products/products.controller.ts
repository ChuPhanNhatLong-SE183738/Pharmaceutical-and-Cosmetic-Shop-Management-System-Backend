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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
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
  async incrementStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    const product = await this.productsService.incrementStock(id, quantity);
    return successResponse(product, 'Product stock incremented successfully');
  }

  @Patch(':id/stock/decrement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async decrementStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    const product = await this.productsService.decrementStock(id, quantity);
    return successResponse(product, 'Product stock decremented successfully');
  }
}
