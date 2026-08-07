import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { __ModuleName__Service } from './__module_name__.service';
import { __ModuleName__Entity } from './entities/__module_name__.entity';

// Repository is mocked — this is a unit test, not an integration test. Each
// assertion here would fail if the service stopped doing what it claims,
// which is the bar R1 holds every test to.
describe('__ModuleName__Service', () => {
  let service: __ModuleName__Service;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input: unknown) => input),
      save: jest.fn(async (entity: object) => ({ id: 'test-id', createdAt: new Date(), ...entity })),
      find: jest.fn(async () => []),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        __ModuleName__Service,
        { provide: getRepositoryToken(__ModuleName__Entity), useValue: repo },
      ],
    }).compile();

    service = module.get<__ModuleName__Service>(__ModuleName__Service);
  });

  it('creates an entity from validated input and persists it', async () => {
    const result = await service.create({ name: 'example' });

    expect(repo.create).toHaveBeenCalledWith({ name: 'example' });
    expect(repo.save).toHaveBeenCalled();
    expect(result.id).toBe('test-id');
  });

  it('returns an empty list when nothing exists yet', async () => {
    const result = await service.findAll();

    expect(result).toEqual([]);
    expect(repo.find).toHaveBeenCalled();
  });
});
