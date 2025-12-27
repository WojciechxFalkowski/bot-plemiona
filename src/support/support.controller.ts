import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportService, SendSupportResponseDto } from './support.service';
import { SendSupportDto } from './dto';
import { SendSupportDecorators } from './decorators';

/**
 * Controller for sending support troops
 */
@ApiTags('Support')
@Controller('support')
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly supportService: SupportService) {}

  /**
   * Sends support troops to a target village from multiple source villages
   */
  @Post('send')
  @SendSupportDecorators()
  public async sendSupport(@Body() dto: SendSupportDto): Promise<SendSupportResponseDto> {
    this.logger.log(`Received support request: ${dto.allocations.length} allocations to target ${dto.targetVillageId}`);
    return this.supportService.sendSupport(dto);
  }
}

