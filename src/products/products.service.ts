import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(query?: any): Promise<{ products: Product[]; total: number }> {
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
    } = query || {};

    const filter: any = {};

    if (category) filter.category = { $in: Array.isArray(category) ? category : [category] };
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
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const products = await this.productModel
      .find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(Number(limit))
      .exec();

    const total = await this.productModel.countDocuments(filter);

    return { products, total };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productModel.find({ category: { $in: [category] } }).exec();
  }

  async findByBrand(brand: string): Promise<Product[]> {
    return this.productModel.find({ brand }).exec();
  }

  async incrementStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    product.stock += quantity;
    return product.save();
  }

  async decrementStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    product.stock -= quantity;
    return product.save();
  }
}