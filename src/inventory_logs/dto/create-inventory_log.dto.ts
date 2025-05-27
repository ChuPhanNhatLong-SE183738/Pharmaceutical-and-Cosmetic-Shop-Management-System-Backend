import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ProductQuantityDto {
    @IsNotEmpty()
    @IsMongoId()
    productId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CreateInventoryLogDto {
    @IsNotEmpty()
    @IsString()
    batch: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductQuantityDto)
    products: ProductQuantityDto[];

    @IsNotEmpty()
    @IsString()
    @IsEnum(['import', 'export'])
    action: string;

    @IsNotEmpty()
    @IsString()
    userId: string;
}
