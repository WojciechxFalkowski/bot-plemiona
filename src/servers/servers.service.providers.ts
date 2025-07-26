import { DATA_SOURCE } from '@/database/database.contracts';
import { DataSource } from 'typeorm';
import { ServerEntity } from './entities/server.entity';
import { ServerCookiesEntity } from './entities/server-cookies.entity';
import { SERVER_ENTITY_REPOSITORY, SERVER_COOKIES_ENTITY_REPOSITORY } from './servers.service.contracts';

export const serversProviders = [
  {
    provide: SERVER_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ServerEntity),
    inject: [DATA_SOURCE],
  },
  {
    provide: SERVER_COOKIES_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ServerCookiesEntity),
    inject: [DATA_SOURCE],
  }
]; 