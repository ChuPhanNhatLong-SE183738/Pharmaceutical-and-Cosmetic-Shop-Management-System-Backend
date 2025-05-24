import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { BucuModule } from './bucu/bucu.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DB_CONNECTION_LINK || ''),
    AuthModule,
    ProductsModule,
    BucuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
