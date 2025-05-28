import { Module } from '@nestjs/common';
import { VnpayModule } from 'nestjs-vnpay';
import { ignoreLogger } from 'vnpay';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '.env',
        }),
        VnpayModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secureSecret: configService.getOrThrow<string>('VNPAY_SECURE_SECRET'),
                tmnCode: configService.getOrThrow<string>('VNPAY_TMN_CODE'),
                loggerFn: ignoreLogger,
            }),
            inject: [ConfigService],
        }),
        TransactionsModule,
        CartModule,
        OrdersModule,
        NotificationsModule,
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule {}