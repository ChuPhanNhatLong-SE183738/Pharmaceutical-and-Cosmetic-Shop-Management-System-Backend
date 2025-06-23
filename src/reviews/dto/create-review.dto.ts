import { IsNotEmpty, IsString, IsNumber, Min, Max } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({
        description: 'User ID who is creating the review',
        example: '6123456789abcdef12345678',
        readOnly: true
    })
    @IsNotEmpty()
    userId: string;
    
    @ApiProperty({
        description: 'Product ID being reviewed',
        example: '6123456789abcdef87654321'
    })
    @IsNotEmpty()
    productId: string;
    
    @ApiProperty({
        description: 'Rating for the product (1-5 stars)',
        example: 5,
        minimum: 1,
        maximum: 5
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;
    
    @ApiProperty({
        description: 'Review content/comment',
        example: 'Excellent product! Great quality and fast delivery. Highly recommended!'
    })
    @IsString()
    content: string;
}
