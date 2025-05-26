import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // Updated import to include Types
import { User, UserDocument } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return newUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findOne(id: string): Promise<UserDocument> {
    try {
      // First check if ID is undefined or empty
      if (!id) {
        this.logger.warn('Attempted to find user with undefined or empty ID');
        throw new BadRequestException('User ID is required');
      }
      
      let userId;
      
      // Handle different ID formats
      if (Types.ObjectId.isValid(id)) {
        // Only convert to ObjectId if it's a valid one
        userId = new Types.ObjectId(id);
      } else {
        // Use as string if it's not a valid ObjectId
        userId = id;
      }
      
      this.logger.log(`Looking for user with ID: ${id}`);
      const user = await this.userModel.findById(userId).exec();
      
      if (!user) {
        this.logger.warn(`User with ID ${id} not found in database`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      
      return user;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error; // Re-throw these specific errors
      }
      this.logger.error(`Error finding user with ID ${id}:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserDocument> {
    this.logger.log(`Finding user by ID: ${id}`);
    try {
      // First check if ID is undefined or empty
      if (!id) {
        this.logger.warn('Attempted to find user with undefined or empty ID');
        throw new BadRequestException('User ID is required');
      }
      
      // Convert string ID to ObjectId if it's not already one and it's valid
      let objectId: any = id;
      if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
        objectId = new Types.ObjectId(id);
      }
      
      this.logger.log(`Looking up user with objectId: ${objectId}`);
      const user = await this.userModel.findById(objectId).exec();
      
      if (!user) {
        this.logger.warn(`No user found with ID: ${id}`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      
      this.logger.log(`Found user with email: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error; // Re-throw these specific errors
      }
      this.logger.error(`Error finding user by ID: ${id} - ${error.message}`);
      if (error.name === 'CastError') {
        throw new NotFoundException(`Invalid user ID format: ${id}`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
