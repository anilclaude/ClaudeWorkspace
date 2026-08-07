import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { __ModuleName__Entity } from './entities/__module_name__.entity';
import { __ModuleName__Controller } from './__module_name__.controller';
import { __ModuleName__Service } from './__module_name__.service';

@Module({
  imports: [TypeOrmModule.forFeature([__ModuleName__Entity])],
  controllers: [__ModuleName__Controller],
  providers: [__ModuleName__Service],
  exports: [__ModuleName__Service],
})
export class __ModuleName__Module {}
