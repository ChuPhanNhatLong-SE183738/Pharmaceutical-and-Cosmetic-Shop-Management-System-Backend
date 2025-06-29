import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateChatMessageDto, SenderType } from './dto/create-chat_message.dto';
import { UpdateChatMessageDto } from './dto/update-chat_message.dto';
import { ChatMessage, ChatMessageDocument } from './entities/chat_message.entity';
import { ChatHistory, ChatHistoryDocument } from '../chat_history/entities/chat_history.entity';

@Injectable()
export class ChatMessagesService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(ChatHistory.name)
    private readonly chatHistoryModel: Model<ChatHistoryDocument>,
  ) {}

  create(createChatMessageDto: CreateChatMessageDto) {
    return 'This action adds a new chatMessage';
  }

  findAll() {
    return `This action returns all chatMessages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatMessage`;
  }

  update(id: number, updateChatMessageDto: UpdateChatMessageDto) {
    return `This action updates a #${id} chatMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatMessage`;
  }

  async findAllByChatHistoryId(chatHistoryId: string): Promise<ChatMessage[]> {
    return this.chatMessageModel.find({ chatId: new Types.ObjectId(chatHistoryId) }).exec();
  }

  async createMessage(dto: CreateChatMessageDto): Promise<ChatMessage> {
    const message = await this.chatMessageModel.create({
      chatId: new Types.ObjectId(dto.chatId),
      sender: dto.sender,
      messageContent: dto.messageContent,
    });

    // Update chat history to include this message
    const chatHistory = await this.chatHistoryModel.findOneAndUpdate(
      { _id: new Types.ObjectId(dto.chatId), userId: new Types.ObjectId(dto.userId) },
      { $push: { messages: message._id } },
      { new: true }
    );

    // If this is the first user message and chat title is still "New Chat", update the title
    if (dto.sender === SenderType.USER && chatHistory && chatHistory.title === 'New Chat') {
      // Check if this is actually the first user message
      const userMessages = await this.chatMessageModel.countDocuments({
        chatId: new Types.ObjectId(dto.chatId),
        sender: SenderType.USER
      });

      if (userMessages === 1) { // This is the first user message
        // Truncate message if too long for title
        const title = dto.messageContent.length > 50 
          ? dto.messageContent.substring(0, 47) + '...' 
          : dto.messageContent;

        await this.chatHistoryModel.findByIdAndUpdate(
          dto.chatId,
          { title: title }
        );
      }
    }

    return message;
  }
}
