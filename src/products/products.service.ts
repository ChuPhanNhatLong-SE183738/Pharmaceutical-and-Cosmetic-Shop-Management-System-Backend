import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const productData = {
      ...createProductDto,
      stock: createProductDto.stock ?? 0,
    };
    const newProduct = new this.productModel(productData);
    return newProduct.save();
  }

  async findAll(
    query?: any,
  ): Promise<{ products: ProductDocument[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortPrice,
    } = query || {};

    const filter: any = {};

    if (category) {
      filter.category = {
        $in: Array.isArray(category) ? category : [category],
      };
    }

    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productDescription: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    let sortOptions: any = {};
    if (sortPrice === 'asc') {
      sortOptions.price = 1;
    } else if (sortPrice === 'desc') {
      sortOptions.price = -1;
    } else {
      const sortOrder = order === 'desc' ? -1 : 1;
      sortOptions[sortBy] = sortOrder;
    }

    const products = await this.productModel
      .find(filter)
      .populate('category')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .exec();

    const total = await this.productModel.countDocuments(filter);

    return { products, total };
  }

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async getCurrentPrice(id: string): Promise<number> {
    const product = await this.findOne(id);

    const currentPrice =
      product.salePercentage !== null && product.salePercentage > 0
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;

    return currentPrice;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const isStockOnlyUpdate =
      Object.keys(updateProductDto).length === 1 && 'stock' in updateProductDto;

    try {
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(id, updateProductDto, {
          new: true,
          runValidators: !isStockOnlyUpdate,
        })
        .exec();
      
      if (!updatedProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return updatedProduct;
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  async findByCategory(category: string): Promise<ProductDocument[]> {
    return this.productModel.find({ category: { $in: [category] } }).exec();
  }

  async findByBrand(brand: string): Promise<ProductDocument[]> {
    return this.productModel.find({ brand }).exec();
  }

  async incrementStock(id: string, quantity: number): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $inc: { stock: quantity } },
        { new: true, runValidators: false },
      )
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  async decrementStock(id: string, quantity: number): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $inc: { stock: -quantity } },
        { new: true, runValidators: false },
      )
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  async updateRating(
    productId: string,
    averageRating: number,
    reviewCount: number,
  ): Promise<void> {
    await this.productModel.findByIdAndUpdate(
      productId,
      {
        $set: {
          averageRating,
          reviewCount,
        },
      },
      { new: true },
    );
  }
}
