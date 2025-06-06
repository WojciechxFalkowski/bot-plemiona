# Villages Module

The Villages module manages village data and automation settings for the Plemiona bot. It provides a complete API for village management with automatic data synchronization and background refresh capabilities.

## Features

- **Automatic Data Refresh**: Villages data is automatically refreshed if older than 1 hour
- **Background Processing**: Refresh operations run in background to avoid blocking API responses
- **Smart Synchronization**: Upsert logic preserves automation settings while updating village names
- **Toggle Endpoints**: Simple PUT requests to toggle automation settings without request body
- **Comprehensive Filtering**: Get villages by automation status

## API Endpoints

### GET /villages
Returns all villages with automatic refresh check (if data is older than 1 hour).

**Response:**
```json
[
  {
    "id": 12345, 
    "name": "Village Name",
    "coordinates": "500|500",
    "isAutoBuildEnabled": false,
    "isAutoScavengingEnabled": true,
    "createdAt": "2024-12-18T10:30:00Z",
    "updatedAt": "2024-12-18T15:45:00Z"
  }
]
```

### GET /villages/:id
Returns a specific village by ID.

**Parameters:**
- `id` (number): Village game ID

**Response:**
```json
{
  "id": 12345,
  "name": "Village Name",
  "coordinates": "500|500",
  "isAutoBuildEnabled": false,
  "isAutoScavengingEnabled": true,
  "createdAt": "2024-12-18T10:30:00Z",
  "updatedAt": "2024-12-18T15:45:00Z"
}
```

### POST /villages/refresh
Manually triggers village data refresh from the game.

**Response:**
```json
{
  "message": "Village data refreshed successfully",
  "result": {
    "added": 2,
    "updated": 1,
    "deleted": 0,
    "total": 15
  }
}
```

### GET /villages/auto-scavenging-status
Returns all villages with auto-scavenging enabled.

**Response:** Array of village objects (same format as GET /villages)

### GET /villages/auto-building-status
Returns all villages with auto-building enabled.

**Response:** Array of village objects (same format as GET /villages)

### PUT /villages/:id/scavenging
Toggles auto-scavenging setting for a specific village (true ↔ false).

**Parameters:**
- `id` (number): Village game ID

**Response:**
```json
{
  "id": 12345,
  "isAutoScavengingEnabled": true
}
```

### PUT /villages/:id/building
Toggles auto-building setting for a specific village (true ↔ false).

**Parameters:**
- `id` (number): Village game ID

**Response:**
```json
{
  "id": 12345,
  "isAutoBuildEnabled": false
}
```

## Database Schema

```sql
CREATE TABLE villages (
  id INT PRIMARY KEY,  -- Game village ID (not auto-generated)
  name VARCHAR(255) NOT NULL,
  coordinates VARCHAR(20) NOT NULL,  -- Format: "XXX|XXX"
  isAutoBuildEnabled BOOLEAN DEFAULT false,
  isAutoScavengingEnabled BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Integration

### With Villages Crawler Service
The module integrates with `VillagesCrawlerService` for data synchronization:

```typescript
// In VillagesCrawlerService
async syncWithDatabase(villageData: VillageData[]): Promise<VillagesSyncResult> {
  return this.villagesService.syncVillages(villageData);
}
```

### With Scavenging Bot
The scavenging bot can query enabled villages:

```typescript
const enabledVillages = await this.villagesService.findWithAutoScavenging();
// Process only villages with auto-scavenging enabled
```

## Data Synchronization Logic

1. **Upsert Strategy**: Existing villages are updated only if name/coordinates change
2. **Automation Preservation**: User automation settings are never overwritten during sync
3. **Cleanup**: Villages no longer existing in the game are automatically removed
4. **Conflict Resolution**: Game data always takes precedence for name/coordinates

## Auto-Refresh Behavior

- **Threshold**: 1 hour since last update
- **Trigger**: Automatic on GET /villages requests
- **Execution**: Background process (non-blocking)
- **Fallback**: Returns existing data immediately, refreshes in background
- **Error Handling**: Refresh failures are logged but don't affect API responses

## Error Handling

- **404 Not Found**: When requesting non-existent village ID
- **500 Internal Server Error**: Database connection issues
- **Validation Errors**: Invalid ID parameters (non-numeric)

## Logging

All operations are comprehensively logged with appropriate levels:
- **INFO**: Normal operations, toggle actions
- **ERROR**: Failed refresh attempts, database errors
- **DEBUG**: Detailed sync results, village changes
