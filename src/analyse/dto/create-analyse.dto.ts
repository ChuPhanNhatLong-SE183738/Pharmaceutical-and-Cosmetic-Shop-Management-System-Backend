import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsMongoId, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendationDto {
  @IsString()
  @IsNotEmpty()
  recommendationId: string;

  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateAnalyseDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  skinType: string;
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendationDto)
  recommendedProducts?: RecommendationDto[];
}

// New DTO for upload with Firebase URL
export class UploadAnalyseDto {
  @IsUrl()
  @IsNotEmpty()
  firebaseUrl: string;
}
