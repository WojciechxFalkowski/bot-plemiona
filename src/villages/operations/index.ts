// Query operations
export * from './query/find-all-villages.operation';
export * from './query/find-village-by-id.operation';
export * from './query/find-village-by-name.operation';
export * from './query/find-villages-with-auto-scavenging.operation';
export * from './query/find-villages-with-auto-building.operation';

// Toggle operations
export * from './toggle/toggle-auto-scavenging.operation';
export * from './toggle/toggle-auto-building.operation';
export * from './toggle/toggle-auto-scavenging-by-name.operation';
export * from './toggle/toggle-auto-building-by-name.operation';

// CRUD operations
export * from './crud/create-village.operation';
export * from './crud/update-village.operation';
export * from './crud/delete-village.operation';
export * from './crud/delete-all-villages-for-server.operation';

// Sync operations
export * from './sync/sync-villages.operation';
export * from './sync/refresh-village-data.operation';

// Scraping operations
export * from './scraping/get-overview-village-information.operation';

// Utilities operations
export * from './utilities/map-to-response-dto.operation';
export * from './utilities/get-village-count.operation';
export * from './utilities/get-auto-scavenging-count.operation';
export * from './utilities/get-auto-building-count.operation';
export * from './utilities/should-auto-refresh.operation';

