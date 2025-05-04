import { Controller, Post, Logger, Body, BadRequestException, InternalServerErrorException, NotFoundException, HttpException, Get } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Scavenging Bot')
@Controller('scavenging')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(private readonly crawlerService: CrawlerService) { }

  /**
   * Manually triggers the Plemiona scavenging bot with a visible browser window.
   * This is useful for debugging or when you want to see what the bot is doing.
   */
  @Get('run-visible')
  @ApiOperation({
    summary: 'Run scavenging bot with visible browser',
    description: 'Manually starts the scavenging bot in visible mode (shows browser window)'
  })
  @ApiResponse({ status: 200, description: 'Bot started successfully' })
  public async runScavengingVisible() {
    this.logger.log('Manually triggered scavenging bot (visible browser)');
    await this.crawlerService.runScavengingBot({ headless: false });
    return { message: 'Scavenging bot started in visible mode successfully' };
  }

  /**
   * Manually triggers the Plemiona scavenging bot in headless mode.
   * This runs the bot in the background without showing a browser window.
   */
  @Get('run-headless')
  @ApiOperation({
    summary: 'Run scavenging bot in headless mode',
    description: 'Manually starts the scavenging bot in headless mode (browser runs in background)'
  })
  @ApiResponse({ status: 200, description: 'Bot started successfully' })
  public async runScavengingHeadless() {
    this.logger.log('Manually triggered scavenging bot (headless)');
    await this.crawlerService.runScavengingBot({ headless: true });
    return { message: 'Scavenging bot started in headless mode successfully' };
  }
} 
