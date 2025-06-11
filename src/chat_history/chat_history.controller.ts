import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ChatHistoryService } from './chat_history.service';
import { CreateChatHistoryDto } from './dto/create-chat_history.dto';
import { UpdateChatHistoryDto } from './dto/update-chat_history.dto';
import { errorResponse, successResponse, SuccessResponse } from '../helper/response.helper';
import { ChatHistory } from './entities/chat_history.entity';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('chat-history')
@Controller('chat-history')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create chat history for a user' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (Mongo ObjectId)' })
  async createByUserId(
    @Param('userId') userId: string,
  ) {
    const chatHistory = await this.chatHistoryService.createByUserId(userId);
    return successResponse(chatHistory, 'Chat history created', 201);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all chat histories for a user' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID (Mongo ObjectId)' })
  async getAllByUserId(
    @Param('userId') userId: string,
  ) {
    const histories = await this.chatHistoryService.findAllByUserId(userId);
    return successResponse(histories, 'Chat histories fetched');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat history by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Chat History ID (Mongo ObjectId)' })
  @ApiResponse({ status: 200, description: 'Chat history deleted successfully' })
  @ApiResponse({ status: 404, description: 'Chat history not found' })
  async remove(@Param('id') id: string) {
    try {
      const result = await this.chatHistoryService.removeChatHistory(id);
      return successResponse(result, 'Chat history deleted successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
