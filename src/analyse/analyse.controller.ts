import { Controller, Post, UseInterceptors, UploadedFile, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalyseService } from './analyse.service';
import { successResponse } from '../helper/response.helper';
import { Express } from 'express';

@Controller('analyse')
export class AnalyseController {
  constructor(private readonly analyseService: AnalyseService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    })
  )
  async analyse(@UploadedFile() file: Express.Multer.File): Promise<any> {
    if (!file) {
      throw new Error('File is required');
    }
    
    try {
      const analyse = await this.analyseService.runInference(file.buffer);
      return successResponse(
        analyse,
        'Analysis completed successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }
}