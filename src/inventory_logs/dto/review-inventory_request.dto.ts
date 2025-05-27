import { IsString, IsBoolean, ValidateIf } from 'class-validator';

export class ReviewInventoryLogDto {
  @IsBoolean()
  approved: boolean;

  @ValidateIf(o => o.approved === false)
  @IsString()
  reason: string;
}