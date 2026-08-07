import { Body, Controller, Get, Post } from '@nestjs/common';
import { __ModuleName__Service } from './__module_name__.service';
import { create__ModuleName__Schema } from './validation/__module_name__.schema';
import type { __ModuleName__Entity } from './entities/__module_name__.entity';

// Never touches the database directly — validate, delegate to the service,
// return. If a method here starts calling the repository, it belongs in
// __module_name__.service.ts instead.
@Controller('__module_name__s')
export class __ModuleName__Controller {
  constructor(private readonly service: __ModuleName__Service) {}

  @Post()
  async create(@Body() body: unknown): Promise<__ModuleName__Entity> {
    const input = create__ModuleName__Schema.parse(body);
    return this.service.create(input);
  }

  @Get()
  async findAll(): Promise<__ModuleName__Entity[]> {
    return this.service.findAll();
  }
}
