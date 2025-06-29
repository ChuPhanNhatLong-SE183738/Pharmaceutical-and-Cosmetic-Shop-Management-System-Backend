import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatHistory,
  ChatHistoryDocument,
} from './entities/chat_history.entity';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../chat_messages/entities/chat_message.entity';

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
      title: 'New Chat',
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

  async removeChatHistory(id: string): Promise<{ deleted: boolean }> {
    try {
      const chatHistory = await this.chatHistoryModel.findById(id);

      if (!chatHistory) {
        throw new NotFoundException(`Chat history with id ${id} not found`);
      }

      await this.chatMessageModel.deleteMany({
        chatId: new Types.ObjectId(id),
      });

      await this.chatHistoryModel.findByIdAndDelete(id);

      return { deleted: true };
    } catch (error) {
      throw new Error(`Failed to delete chat history: ${error.message}`);
    }
  }

  async updateTitle(chatId: string, title: string): Promise<ChatHistory> {
    const truncatedTitle =
      title.length > 50 ? title.substring(0, 47) + '...' : title;

    const updatedChatHistory = await this.chatHistoryModel
      .findByIdAndUpdate(chatId, { title: truncatedTitle }, { new: true })
      .exec();

    if (!updatedChatHistory) {
      throw new NotFoundException(`Chat history with ID ${chatId} not found`);
    }

    return updatedChatHistory;
  }
}
