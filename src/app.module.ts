import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { PaymentsModule } from './payments/payments.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InventoryLogsModule } from './inventory_logs/inventory_logs.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnalyseModule } from './analyse/analyse.module';
import { ShippingLogsModule } from './shipping_logs/shipping_logs.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        () => ({
          IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID,
          // ...other env variables
        }),
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DB_CONNECTION_LINK'),
      }),
    }),
    ProductsModule,
    CartModule,
    AuthModule,
    OrdersModule,
    CategoriesModule,
    PaymentsModule,
    TransactionsModule,
    ReviewsModule,
    InventoryLogsModule,
    AnalyseModule,
    ShippingLogsModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
