# Plemiona Scavenging Bot - Product Requirements Document

## 1. Introduction

### 1.1 Purpose

The Plemiona Scavenging Bot is an automated tool designed to assist players of the browser-based game "Plemiona" (Tribal Wars) by automatically executing "scavenging" operations to gather resources. The bot logs into the game, navigates to the scavenging screen, analyzes available troops, and dispatches them on optimal scavenging missions without requiring player intervention.

### 1.2 Scope

This document outlines the requirements, functionality, architecture, and implementation details of the Plemiona Scavenging Bot. It serves as a reference for current features and a roadmap for future development.

### 1.3 Target Audience

- Game players looking for automation of repetitive scavenging tasks
- Developers interested in extending or modifying the bot's functionality
- System administrators responsible for deployment and maintenance

## 2. System Overview

### 2.1 System Architecture

The bot is built as a NestJS application with these core components:

1. **Web Interface**: Provides API endpoints and Swagger documentation for control
2. **Database**: Stores persistent settings and login cookies
3. **Browser Automation**: Uses Playwright to control browser interactions
4. **Scheduling System**: Manages timing of scavenging operations

### 2.2 Technologies Used

- **Backend Framework**: NestJS (Node.js)
- **Database**: MySQL (via TypeORM)
- **Browser Automation**: Playwright
- **API Documentation**: Swagger
- **Scheduling**: NestJS @nestjs/schedule

### 2.3 Key Features

- Automated login to Plemiona game (via cookies or manual credentials)
- Intelligent scheduling of scavenging operations
- Optimal distribution of troops across scavenging levels
- Persistence of settings and login data
- Manual override capabilities through API
- Detailed logging of operations

## 3. Functional Requirements

### 3.1 Authentication and Login

- **FR1.1**: Store and use browser cookies for authentication
- **FR1.2**: Fall back to manual login when cookies are invalid or unavailable
- **FR1.3**: Select the correct game world after login

### 3.2 Scavenging Core Functionality

- **FR2.1**: Navigate to the scavenging screen
- **FR2.2**: Read available troops (spear, sword, axe, light, heavy, etc.)
- **FR2.3**: Detect status of scavenging levels (locked, busy, available)
- **FR2.4**: Calculate optimal distribution of troops across levels
- **FR2.5**: Send troops on scavenging missions
- **FR2.6**: Wait for active missions to complete before starting new ones

### 3.3 Settings Management

- **FR3.1**: Store and retrieve settings from database
- **FR3.2**: Configure login credentials and cookies
- **FR3.3**: Toggle automatic scavenging on/off
- **FR3.4**: Configure game-specific settings (archers available, max resources, etc.)

### 3.4 Scheduling and Automation

- **FR4.1**: Start automatically when the application launches (if enabled)
- **FR4.2**: Schedule next run based on active mission durations
- **FR4.3**: Support manual triggering through API

### 3.5 Logging and Monitoring

- **FR5.1**: Log detailed operation steps and decisions
- **FR5.2**: Capture screenshots on errors for debugging

## 4. Technical Implementation

### 4.1 Database Schema

The application uses TypeORM with the following primary entities:

- **SettingsEntity**:
  - id: Primary key
  - key: Unique identifier for the setting
  - value: JSON data containing the setting value
  - updatedAt: Last update timestamp

### 4.2 Core Application Modules

#### 4.2.1 Core Modules

- **AppModule**: Main application module, orchestrates all other modules
- **DatabaseModule**: Manages database connections and repositories
- **SettingsModule**: Handles storage and retrieval of application settings
- **CrawlerModule**: Contains the scavenging logic and browser automation

#### 4.2.2 Key Services

- **SettingsService**: Interface for working with application settings
- **CrawlerService**: Core logic for browser automation and scavenging

#### 4.2.3 Controllers

- **SettingsController**: Endpoints for managing settings
- **CrawlerController**: Endpoints for triggering scavenging operations

### 4.3 Scavenging Process Flow

1. **Initialization**:
   - Check if auto-scavenging is enabled
   - Initialize browser with Playwright
   - Handle authentication with cookies or manual login
2. **World Selection**:
   - Navigate to the specified game world
3. **Scavenging Operations**:
   - Navigate to the scavenging screen
   - Read available units and level statuses
   - Check if levels are busy and wait if necessary
   - Calculate troop distribution for available levels
   - Fill forms and dispatch troops
4. **Scheduling**:
   - Determine the longest active mission duration
   - Schedule next run after that duration (plus buffer)
   - Check auto-scavenging setting before actual execution

### 4.4 Configuration Options

#### 4.4.1 Game Settings (scavenging.config.ts)

- **max_resources**: Maximum resources to target per scavenging level
- **archers**: Whether the game world has archers (0/1)
- **skip_level_1**: Whether to skip level 1 when others are available (0/1)
- **unitSettings**: Per-unit configuration (capacity, untouchable counts, etc.)
- **levelPacks**: Distribution weights for scavenging levels

#### 4.4.2 Application Settings

- **PLEMIONA_COOKIES**: Browser cookies for authentication
- **AUTO_SCAVENGING_ENABLED**: Whether the bot starts automatically

## 5. API Interface

### 5.1 Scavenging Endpoints

- **GET /api/scavenging/run-headless**:
  - Manually triggers the bot in headless mode
  - Response: 200 OK with confirmation message
- **GET /api/scavenging/run-visible**:
  - Manually triggers the bot with a visible browser window
  - Response: 200 OK with confirmation message

### 5.2 Settings Endpoints

- **GET /api/settings/scavenging/auto**:
  - Gets the auto-scavenging setting
  - Response: 200 OK with enabled status
- **PUT /api/settings/scavenging/auto**:
  - Updates the auto-scavenging setting
  - Body: `{ "enabled": true|false }`
  - Response: 200 OK with confirmation message
- **GET /api/settings/plemiona/cookies**:
  - Gets the saved Plemiona cookies
  - Response: 200 OK with array of cookies
- **PUT /api/settings/plemiona/cookies**:
  - Updates the Plemiona cookies
  - Body: `{ "cookies": [array of cookie objects] }`
  - Response: 200 OK with confirmation message

## 6. Extension Points and Future Development

### 6.1 Potential Enhancements

- **Village Management**: Support for multiple villages
- **Resource Targeting**: Prioritize certain resource types
- **Advanced Scheduling**: Time-based schedules (only run during specific hours)
- **User Interface**: Web dashboard for monitoring and settings
- **Notification System**: Alerts for important events or errors
- **Security Enhancements**: Encrypted storage of credentials and cookies
- **Game Events**: Detect and respond to in-game events

### 6.2 Known Limitations

- Only supports a single village (hardcoded village ID)
- No visual representation of bot status
- Limited error recovery for unexpected game changes
- Cookie authentication sensitive to game updates

## 7. Deployment Requirements

### 7.1 System Requirements

- Node.js 14+ runtime
- MySQL 5.7+ database
- Sufficient memory for browser automation (min. 1GB RAM)
- Network access to plemiona.pl

### 7.2 Environment Configuration

Required environment variables:

- `DATABASE_HOST`: Database hostname
- `DATABASE_PORT`: Database port
- `DATABASE_NAME`: Database name
- `BACKEND_PORT`: Port for API server (default: 3000)

### 7.3 Installation Steps

1. Clone repository
2. Install dependencies (`npm install`)
3. Configure environment variables
4. Run database migrations (`npm run migration:run`)
5. Start application (`npm run start:prod`)

## 8. Conclusion

The Plemiona Scavenging Bot provides an automated solution for the repetitive task of sending troops on scavenging missions in the Plemiona game. It offers flexibility through configurable settings and can be adapted to different game worlds and player preferences.

Future development will focus on adding more game functionalities, improving the user interface, and enhancing scheduling capabilities to make the bot even more useful for players.
