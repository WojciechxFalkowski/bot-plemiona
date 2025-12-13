// Query operations
export { findStrategyByIdOperation } from './query/find-strategy-by-id.operation';
export { findStrategyByServerAndVillageOperation } from './query/find-strategy-by-server-and-village.operation';
export { findAllStrategiesByServerAndVillageOperation } from './query/find-all-strategies-by-server-and-village.operation';
export { findAllStrategiesByServerOperation } from './query/find-all-strategies-by-server.operation';
export { findActiveStrategiesByServerOperation } from './query/find-active-strategies-by-server.operation';

// CRUD operations
export { createStrategyOperation } from './crud/create-strategy.operation';
export { updateStrategyByIdOperation } from './crud/update-strategy-by-id.operation';
export { updateStrategyByServerAndVillageOperation } from './crud/update-strategy-by-server-and-village.operation';
export { deleteStrategyByIdOperation } from './crud/delete-strategy-by-id.operation';
export { deleteStrategyByServerAndVillageOperation } from './crud/delete-strategy-by-server-and-village.operation';
export { deleteAllStrategiesByServerAndVillageOperation } from './crud/delete-all-strategies-by-server-and-village.operation';

// Calculations operations
export { calculateMaxAttacksOperation } from './calculations/calculate-max-attacks.operation';

// State management operations
export { updateNextTargetIndexOperation } from './state-management/update-next-target-index.operation';
export { toggleStrategyOperation } from './state-management/toggle-strategy.operation';
export { getActiveUnitsOperation } from './state-management/get-active-units.operation';

// Utilities operations
export { mapStrategyToResponseDtoOperation } from './utilities/map-strategy-to-response-dto.operation';


