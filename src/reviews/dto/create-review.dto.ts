import { IsNotEmpty, IsString } from "class-validator";

export class CreateReviewDto {
    @IsNotEmpty()
    userId: string;
    
    @IsNotEmpty()
    productId: string;
    
    @IsNotEmpty()
    rating: number;
    
    @IsString()
    content: string;
}
