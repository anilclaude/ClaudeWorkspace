import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { __ModuleName__Entity } from './entities/__module_name__.entity';
import type { Create__ModuleName__Input } from './validation/__module_name__.schema';

// The only file in this module that touches the database — controllers
// delegate here and nowhere else (repo-structure.md's module-wise rule).
@Injectable()
export class __ModuleName__Service {
  constructor(
    @InjectRepository(__ModuleName__Entity)
    private readonly repo: Repository<__ModuleName__Entity>,
  ) {}

  async create(input: Create__ModuleName__Input): Promise<__ModuleName__Entity> {
    const entity = this.repo.create(input);
    return this.repo.save(entity);
  }

  async findAll(): Promise<__ModuleName__Entity[]> {
    return this.repo.find();
  }
}
