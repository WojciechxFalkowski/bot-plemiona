# Plemiona Scavenging Bot

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)](https://playwright.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)

An automated bot for the browser-based game "Plemiona" (Tribal Wars) that manages scavenging missions to gather resources without player intervention.

## 🌟 Features

- **Automated Authentication**: Login via cookies or credentials
- **Intelligent Scheduling**: Waits for ongoing missions to complete
- **Optimal Resource Gathering**: Distributes troops efficiently across scavenging levels
- **Easy Control**: API endpoints to start/stop the bot and manage settings
- **Persistence**: Stores cookies and settings for continuous operation
- **Flexible Operation**: Run in headless mode or with visible browser

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## 🚀 Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://your-repository-url/plemiona-bot.git
   cd plemiona-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following configuration:

   ```
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_NAME=plemiona_bot
   BACKEND_PORT=3000

   # Plemiona Game Credentials
   PLEMIONA_USERNAME=your_game_username
   ```

4. Run database migrations:

   ```bash
   npm run migration:run
   ```

5. Start the application:

   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run start:prod
   ```

## 🎮 Usage

### API Endpoints

The API is available at `https://bot-plemiona-api.wojciechfalkowski.pl/` with Swagger documentation at `https://bot-plemiona-api.wojciechfalkowski.pl/api`.

#### Scavenging Operations

- **GET /api/scavenging/run-headless**: Start the bot in background mode
- **GET /api/scavenging/run-visible**: Start the bot with visible browser (debugging)

#### Settings Management

- **GET /api/settings/scavenging/auto**: Check if auto-scavenging is enabled
- **PUT /api/settings/scavenging/auto**: Enable/disable auto-scavenging

  ```json
  {
    "enabled": true
  }
  ```

- **GET /api/settings/plemiona/cookies**: Retrieve saved authentication cookies
- **PUT /api/settings/plemiona/cookies**: Update authentication cookies
  ```json
  {
    "cookies": [
      {
        "name": "pl_auth",
        "value": "your-cookie-value",
        "domain": ".plemiona.pl",
        "path": "/",
        "expires": 1714464392
      },
      {
        "name": "sid",
        "value": "your-session-id",
        "domain": "pl216.plemiona.pl",
        "path": "/",
        "expires": -1
      }
      // Additional cookies...
    ]
  }
  ```

### Configuration

The bot's behavior can be customized by editing configuration files:

#### Game Configuration (src/utils/scavenging.config.ts)

```typescript
export const scavengingSettings = {
  max_resources: 99999,  // Maximum resources to target
  archers: 0,            // Set to 1 if the world has archers
  skip_level_1: 0,       // Set to 1 to skip level 1 if others are available
};

// Unit settings like capacity, untouchable counts, etc.
export const unitSettings = { ... };
```

#### Login Information

Game credentials are stored in environment variables:

```
PLEMIONA_USERNAME=your_game_username
```

These are used as a fallback when cookie authentication fails. For security reasons, it's strongly recommended to use cookies for authentication whenever possible.

## 🧩 Project Structure

```
plemiona-bot/
├── src/
│   ├── crawler/            # Browser automation & scavenging logic
│   ├── database/           # Database connection & configuration
│   ├── migrations/         # TypeORM database migrations
│   ├── settings/           # Settings management
│   ├── utils/              # Utilities and game configuration
│   ├── app.module.ts       # Main application module
│   └── main.ts             # Application entry point
├── .env                    # Environment variables
└── package.json            # Project dependencies & scripts
```

## 📝 Future Improvements

The following features are planned for future development:

- Support for multiple villages (currently hardcoded to one village ID)
- Web dashboard for monitoring bot status and detailed statistics
- Advanced scheduling options (time-based operation, resource targeting)
- Support for other game activities (farming, recruitment, building)
- Email/Discord notifications for important events or errors
- Enhanced error handling and recovery mechanisms

## ⚠️ Limitations

- Currently supports only a single village
- Village ID is hardcoded (URL parameter in crawler.service.ts)
- No visual interface for monitoring status
- Limited error recovery for unexpected game changes
- Cookie authentication may break with game updates

## 🔒 Security Considerations

- **Never commit your .env file** to version control
- Store credentials in environment variables instead of hardcoding them
- For production deployments, consider using secrets management solutions
- The bot stores cookies in the database; ensure database security
- Consider using a dedicated user account for the bot with limited privileges in the game

## 🔍 Troubleshooting

### Common Issues

1. **Bot fails to login**:

   - Check your cookies or credentials
   - Verify the game hasn't changed its login page structure

2. **Scavenging doesn't start**:

   - Ensure auto-scavenging is enabled via the API
   - Check logs for any specific errors

3. **Database connection errors**:
   - Verify your database credentials and connection settings
   - Ensure migrations have been run

### Logs

The application generates detailed logs during operation. Check these logs for any error messages or unexpected behavior. In production, logs are stored in the application's standard output.

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Open a pull request

Please ensure your code follows the existing style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚙️ Technical Notes

- Built with NestJS for robust backend architecture
- Uses Playwright for browser automation (more modern than Puppeteer)
- TypeORM for database management with migration support
- Swagger for API documentation
- Follows NestJS best practices for maintainable code

---

**Note**: This bot is intended for educational purposes. Use at your own risk and responsibility. The authors are not responsible for any consequences of using this bot, including but not limited to account bans or violations of the game's terms of service.
