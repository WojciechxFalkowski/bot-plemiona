import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import configuration from '@/database/database-configuration';
import { DATA_SOURCE } from './database.contracts';

config();

const configService = new ConfigService(configuration());

const dataSource = new DataSource({
  type: 'mysql',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.root_user'),
  password: configService.get('database.root_password'),
  database: configService.get('database.database_name'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: false,
  // logging: ['query', 'error']
});



export const databaseProviders = [
  {
    provide: DATA_SOURCE,
    useFactory: async () => {
      // configService: ConfigService
      return dataSource.initialize()
    },
    // inject: [ConfigService],
  }
]

export default dataSource;