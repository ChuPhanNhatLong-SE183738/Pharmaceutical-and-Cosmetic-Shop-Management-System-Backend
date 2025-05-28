import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) 
    private notificationModel: Model<Notification>
  ) {}

  async createStaffNotification(notificationData: {
    type: string;
    title: string;
    message: string;
    orderId?: string;
    priority: 'low' | 'medium' | 'high';
  }) {
    this.logger.debug('Creating staff notification:', notificationData);
    
    const newNotification = new this.notificationModel({
      ...notificationData,
      userType: 'staff',
      isRead: false,
      createdAt: new Date(),
    });

    return newNotification.save();
  }

  async getStaffNotifications() {
    return this.notificationModel.find({ userType: 'staff', isRead: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(notificationId: string) {
    return this.notificationModel.findByIdAndUpdate(
      notificationId, 
      { isRead: true },
      { new: true }
    );
  }
}
