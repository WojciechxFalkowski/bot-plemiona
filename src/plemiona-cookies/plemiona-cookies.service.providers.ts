import { DataSource } from 'typeorm';
import { PlemionaCookiesEntity } from './entities/plemiona-cookies.entity';
import { DATA_SOURCE } from '@/database/database.contracts';
import { PLEMIONA_COOKIES_ENTITY_REPOSITORY } from './plemiona-cookies.service.contracts';

export const PlemionaCookiesProviders = [
    {
        provide: PLEMIONA_COOKIES_ENTITY_REPOSITORY,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(PlemionaCookiesEntity),
        inject: [DATA_SOURCE],
    },
]; 