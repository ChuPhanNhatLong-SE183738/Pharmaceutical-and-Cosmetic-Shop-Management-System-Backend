import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  HttpStatus,
  Req,
  Logger
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AnalyseService } from './analyse.service';
import { CreateAnalyseDto } from './dto/create-analyse.dto';
import { UpdateAnalyseDto } from './dto/update-analyse.dto';
import { successResponse, errorResponse } from '../helper/response.helper';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('skin-analysis')
@Controller('analyse')
export class AnalyseController {
  private readonly logger = new Logger(AnalyseController.name);

  constructor(private readonly analyseService: AnalyseService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/skin-analysis',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAndAnalyze(@UploadedFile() file, @Req() req) {
    try {
      if (!file) {
        return errorResponse('No image file provided', HttpStatus.BAD_REQUEST);
      }

      const userId = req.user.userId || req.user._id || req.user.sub;
      
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/skin-analysis/${file.filename}`;
      
      const result = await this.analyseService.processAndSaveAnalysis(
        file.buffer || await require('fs').promises.readFile(file.path),
        userId,
        imageUrl
      );
      
      return successResponse(result, 'Skin analysis completed successfully');
    } catch (error) {
      this.logger.error(`Error during skin analysis: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user-analyses')
  @UseGuards(JwtAuthGuard)
  async findUserAnalyses(@Req() req) {
    try {
      const userId = req.user.userId || req.user._id || req.user.sub;
      const analyses = await this.analyseService.findByUserId(userId);
      return successResponse(analyses, 'User analyses retrieved successfully');
    } catch (error) {
      this.logger.error(`Error fetching user analyses: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    try {
      const analysis = await this.analyseService.findOne(id);
      return successResponse(analysis, 'Analysis retrieved successfully');
    } catch (error) {
      this.logger.error(`Error fetching analysis: ${error.message}`);
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() updateAnalyseDto: UpdateAnalyseDto) {
    try {
      const updatedAnalysis = await this.analyseService.update(id, updateAnalyseDto);
      return successResponse(updatedAnalysis, 'Analysis updated successfully');
    } catch (error) {
      this.logger.error(`Error updating analysis: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const analysis = await this.analyseService.findOne(id);
      const userId = req.user.userId || req.user._id || req.user.sub;
      
      if (analysis.userId.toString() !== userId && req.user.role !== Role.ADMIN) {
        return errorResponse('You can only delete your own analyses', HttpStatus.FORBIDDEN);
      }
      
      const result = await this.analyseService.remove(id);
      return successResponse(result, 'Analysis deleted successfully');
    } catch (error) {
      this.logger.error(`Error deleting analysis: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}