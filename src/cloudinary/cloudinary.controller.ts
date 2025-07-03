import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      folder?: string;
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.cloudinaryService.uploadImage(file, {
      folder: body.folder,
      width: body.width ? Number(body.width) : undefined,
      height: body.height ? Number(body.height) : undefined,
      crop: body.crop,
      quality: body.quality,
    });
    return { url };
  }
}
