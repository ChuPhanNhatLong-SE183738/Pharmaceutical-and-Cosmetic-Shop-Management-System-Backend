import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsNotEmpty } from "class-validator";
import { Document } from "mongoose";

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
    @IsNotEmpty()
    @Prop({ required: true, unique: true })
    categoryName: string;

    @IsNotEmpty()
    @Prop({ required: true })
    categoryDescription: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);