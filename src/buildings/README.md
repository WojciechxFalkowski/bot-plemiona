# Buildings Module

## Overview

The Buildings module provides static data about all available buildings in Tribal Wars (Plemiona) game. It offers information about building names, maximum levels, and URL paths for accessing specific building screens.

## Features

- Get all available buildings with their properties
- Get specific building data by screen identifier
- Static data with consistent building information
- Full TypeScript support with proper typing

## API Endpoints

### GET `/buildings`

Returns a list of all available buildings in the game.

**Response:**
```json
{
  "buildings": [
    {
      "screen": "main",
      "name": "Ratusz",
      "maxLevel": 30,
      "href": "/game.php?village={villageId}&screen=main"
    },
    // ... other buildings
  ]
}
```

### GET `/buildings/:screen`

Returns data for a specific building by its screen identifier.

**Parameters:**
- `screen` (string) - Screen identifier (e.g., 'main', 'barracks', 'stable')

**Response:**
```json
{
  "screen": "main",
  "name": "Ratusz",
  "maxLevel": 30,
  "href": "/game.php?village={villageId}&screen=main"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Building with screen 'invalid' not found",
  "error": "Not Found"
}
```

## Available Buildings

| Screen | Name | Max Level |
|--------|------|-----------|
| main | Ratusz | 30 |
| barracks | Koszary | 25 |
| stable | Stajnia | 20 |
| garage | Warsztat | 15 |
| snob | Pałac | 1 |
| smith | Kuźnia | 20 |
| place | Plac | 1 |
| statue | Piedestał | 1 |
| market | Rynek | 25 |
| wood | Tartak | 30 |
| stone | Cegielnia | 30 |
| iron | Huta żelaza | 30 |
| farm | Zagroda | 30 |
| storage | Spichlerz | 30 |
| hide | Schowek | 10 |
| wall | Mur | 20 |

## Usage

The href field contains a template that can be used by frontend applications. Replace `{villageId}` with the actual village ID to get a working URL.

Example:
```typescript
const building = await getBuildingByScreen('main');
const url = building.href.replace('{villageId}', '2197');
// Result: "/game.php?village=2197&screen=main"
```

## Service Methods

### `getAllBuildings(): BuildingData[]`
Returns an array of all buildings.

### `getBuildingByScreen(screen: string): BuildingData`
Returns a specific building by screen identifier. Throws `NotFoundException` if building not found.

### `getAvailableScreens(): string[]`
Returns an array of all available screen identifiers. 