import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { errorResponse, successResponse } from 'src/helper/response.helper';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async changeAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const userId = req.user.sub || req.user.id || req.user.userId;

      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      this.logger.debug(`Processing avatar upload for user: ${userId}`);
      this.logger.debug(
        `File details: ${JSON.stringify({
          originalname: file?.originalname,
          mimetype: file?.mimetype,
          size: file?.size,
        })}`,
      );

      const updatedUser = await this.usersService.changeAvatar(
        userId.toString(),
        file,
      );
      const { password, ...result } = updatedUser.toObject();

      return successResponse(result, 'Avatar updated successfully');
    } catch (error) {
      this.logger.error(`Avatar upload failed: ${error.message}`);
      return errorResponse(error.message, error.status || 400);
    }
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    try {
      const userId = req.user.sub || req.user.id || req.user.userId;

      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      this.logger.debug(`Updating profile for user: ${userId}`);
      this.logger.debug(`Update details: ${JSON.stringify(updateUserDto)}`);

      const sensitiveFields = [
        'email',
        'password',
        'isVerified',
        'isActive',
        'role',
        'skinAnalysisHistory',
        'purchaseHistory',
      ];
      const requestBody = req.body;

      const forbiddenFields = Object.keys(requestBody).filter((key) =>
        sensitiveFields.includes(key),
      );

      if (forbiddenFields.length > 0) {
        throw new BadRequestException(
          `Cannot update sensitive fields: ${forbiddenFields.join(', ')}.`,
        );
      }

      const updatedUser = await this.usersService.update(
        userId.toString(),
        updateUserDto,
      );
      const { password, ...result } = updatedUser.toObject();

      return successResponse(result, 'Profile updated successfully');
    } catch (error) {
      this.logger.error(`Profile update failed: ${error.message}`);
      return errorResponse(error.message, error.status || 400);
    }
  }
}
