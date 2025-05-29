import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  Get,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginUserDto } from 'src/users/dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { successResponse, errorResponse } from '../helper/response.helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto, @Res() response: Response) {
    const result = await this.authService.login(loginUserDto, response);
    return response.json(result);
  }

  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res() response: Response,
  ) {
    const result = await this.authService.register(createUserDto, response);
    return response.json(result);
  }
  
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token is valid' })
  async verifyToken(@Request() req) {
    try {
      return successResponse({
        valid: true,
        user: req.user
      }, 'Token is valid');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ApiBearerAuth()
  async getMyProfile(@Request() req) {
    const userId = req.user.sub || req.user.id;
    return this.authService.getMyProfile(userId);
  }

  @Get('debug-token')
  @UseGuards(JwtAuthGuard)
  async debugToken(@Request() req) {
    return {
      user: req.user,
      message: 'This is what your token contains'
    };
  }
}
