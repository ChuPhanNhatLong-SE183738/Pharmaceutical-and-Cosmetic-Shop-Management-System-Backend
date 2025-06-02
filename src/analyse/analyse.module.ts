import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyseService } from './analyse.service';
import { AnalyseController } from './analyse.controller';
import { Analyse, AnalyseSchema } from './entities/analyse.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Analyse.name, schema: AnalyseSchema }]),
    ProductsModule,
  ],
  controllers: [AnalyseController],
  providers: [AnalyseService],
  exports: [AnalyseService],
})
export class AnalyseModule {}
