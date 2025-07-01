import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @IsEmail()
  @IsNotEmpty()
  @Prop({ required: true, unique: true })
  email: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ required: true })
  password: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ required: true })
  fullName: string;

  @IsPhoneNumber()
  @Prop()
  @Prop({ required: true })
  phone: string;

  @IsString()
  @Prop()
  @Prop({ required: true })
  address: string;

  @IsDateString()
  @Prop()
  @Prop({ required: true })
  dob: string;

  @IsString()
  @Prop({
    default: 'https://media.tenor.com/iYxImvPgPnIAAAAe/horse-horses.png',
  })
  photoUrl: string;

  @IsBoolean()
  @Prop({ default: false })
  isVerified: boolean;

  @IsBoolean()
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [Object], default: [] })
  skinAnalysisHistory: Array<any>;

  @Prop({ type: [Object], default: [] })
  purchaseHistory: Array<any>;

  @IsNotEmpty()
  @Prop({ type: String, enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Prop({ type: String, default: null })
  verificationToken: string | null;

  @Prop({ type: Date, default: null })
  verificationTokenCreatedAt: Date | null;

  @Prop({ type: String, default: null })
  otp: string | null;

  @Prop({ type: Date, default: null })
  otpCreatedAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
