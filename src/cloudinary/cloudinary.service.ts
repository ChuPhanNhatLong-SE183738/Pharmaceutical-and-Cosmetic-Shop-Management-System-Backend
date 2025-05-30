import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadImage(file: Express.Multer.File, options: {
    folder?: string;
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  } = {}): Promise<string> {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'avatars',
            transformation: [
              {
                // Default optimization settings
                fetch_format: 'auto',
                quality: options.quality || 'auto',
                // Optional transformation settings
                width: options.width,
                height: options.height,
                crop: options.crop || 'scale',
                gravity: 'auto',
              }
            ]
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      const uploadResult = result as any;
      this.logger.debug(`Image uploaded successfully: ${uploadResult.secure_url}`);
      
      return uploadResult.secure_url;
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  } = {}): string {
    return cloudinary.url(publicId, {
      secure: true,
      fetch_format: 'auto',
      quality: options.quality || 'auto',
      width: options.width,
      height: options.height,
      crop: options.crop,
      gravity: 'auto'
    });
  }
}