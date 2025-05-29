import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingLogDto } from './create-shipping-log.dto';

export class UpdateShippingLogDto extends PartialType(CreateShippingLogDto) {}
