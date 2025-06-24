import { IsString, IsBoolean, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewInventoryLogDto {
  @ApiProperty({
    description: 'Whether to approve or reject the inventory request',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: 'Reason for rejection (required when approved is false)',
    example: 'Insufficient documentation provided',
    required: false,
  })
  @ValidateIf((o) => o.approved === false)
  @IsString()
  reason?: string;
}
