import { IsString, IsOptional, IsDateString } from 'class-validator';

export class InventoryLogFilterDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  status?: 'pending' | 'accepted' | 'denied';

  @IsString()
  @IsOptional()
  userId?: string;
}