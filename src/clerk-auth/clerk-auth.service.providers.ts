import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { UserEntity } from './user.entity';
import { USER_ENTITY_REPOSITORY } from './clerk-auth.service.contracts';

export const clerkAuthProviders = [
  {
    provide: USER_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UserEntity),
    inject: [DATA_SOURCE],
  }
]; 