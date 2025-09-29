import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { ArmyTrainingStrategyEntity } from './entities/army-training-strategy.entity';
import { ARMY_TRAINING_STRATEGIES_ENTITY_REPOSITORY } from './army-training-strategy.contracts';

export const armyTrainingStrategyProviders = [
  {
    provide: ARMY_TRAINING_STRATEGIES_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ArmyTrainingStrategyEntity),
    inject: [DATA_SOURCE],
  }
]; 