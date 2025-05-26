export class CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string[];
  brand: string;
  productImages: string[];
  ingredients: string;
  suitableFor: string;
  reviews?: string[];
  promotionId?: string;
  expiryDate: Date;
}