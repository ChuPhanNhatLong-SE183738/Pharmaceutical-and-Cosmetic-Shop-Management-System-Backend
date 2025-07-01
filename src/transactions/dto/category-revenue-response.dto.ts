import { ApiProperty } from '@nestjs/swagger';

export class CategoryRevenueDto {
  @ApiProperty({
    description: 'Category ID',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Skincare',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Total revenue for this category',
    example: 12500.75,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Number of transactions for this category',
    example: 45,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Number of orders for this category',
    example: 38,
  })
  orderCount: number;
}

export class CategoryRevenueResponseDto {
  @ApiProperty({
    description: 'Revenue breakdown by category',
    type: [CategoryRevenueDto],
  })
  categoryRevenue: CategoryRevenueDto[];

  @ApiProperty({
    description: 'Total revenue across all categories',
    example: 45750.25,
  })
  totalRevenue: number;
}

export class ProductRevenueDto {
  @ApiProperty({
    description: 'Product ID',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Anti-Aging Serum',
  })
  productName: string;

  @ApiProperty({
    description: 'Total revenue for this product',
    example: 2500.50,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Total quantity sold',
    example: 125,
  })
  quantitySold: number;
}

export class CategoryDetailRevenueResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Skincare',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Total revenue for this category',
    example: 12500.75,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Number of transactions for this category',
    example: 45,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Number of orders for this category',
    example: 38,
  })
  orderCount: number;

  @ApiProperty({
    description: 'Revenue breakdown by products in this category',
    type: [ProductRevenueDto],
  })
  products: ProductRevenueDto[];
}
