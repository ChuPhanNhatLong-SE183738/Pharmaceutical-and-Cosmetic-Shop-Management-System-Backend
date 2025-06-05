import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatHistory, ChatHistoryDocument } from './entities/chat_history.entity';
import { ChatMessage, ChatMessageDocument } from '../chat_messages/entities/chat_message.entity';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectModel(ChatHistory.name)
    private readonly chatHistoryModel: Model<ChatHistoryDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async createByUserId(userId: string): Promise<ChatHistory> {
    // Create the chat history first (empty messages)
    const chatHistory = await this.chatHistoryModel.create({
      userId: new Types.ObjectId(userId),
      messages: [],
    });

    // Create the first AI message
    const aiMessage = await this.chatMessageModel.create({
      chatId: chatHistory._id,
      sender: 'ai',
      messageContent: "Hello, I'm the PharmaBot, how can i help you?",
    });

    // Add the AI message to the chat history
    chatHistory.messages.push(aiMessage._id as Types.ObjectId);
    await chatHistory.save();

    return chatHistory;
  }

  async findAllByUserId(userId: string): Promise<ChatHistory[]> {
    return this.chatHistoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('messages')
      .exec();
  }
}
