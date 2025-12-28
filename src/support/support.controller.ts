import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportService, SendSupportResponseDto, QueuedSupportResponseDto } from './support.service';
import { SendSupportDto } from './dto';
import { SendSupportDecorators, SendSupportDirectDecorators, GetTaskStatusDecorators } from './decorators';

/**
 * Controller for sending support troops
 */
@ApiTags('Support')
@Controller('support')
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly supportService: SupportService) {}

  /**
   * Queues support troops dispatch to a target village
   * The task will be executed by the orchestrator when it's safe to do so
   */
  @Post('send')
  @SendSupportDecorators()
  public async queueSupport(@Body() dto: SendSupportDto): Promise<QueuedSupportResponseDto> {
    this.logger.log(`Received support request: ${dto.allocations.length} allocations to target ${dto.targetVillageId}`);
    return this.supportService.queueSupport(dto);
  }

  /**
   * Sends support troops directly (bypasses queue)
   * WARNING: May interfere with other browser sessions
   */
  @Post('send-direct')
  @SendSupportDirectDecorators()
  public async sendSupportDirect(@Body() dto: SendSupportDto): Promise<SendSupportResponseDto> {
    this.logger.warn(`Received DIRECT support request (bypassing queue): ${dto.allocations.length} allocations`);
    return this.supportService.sendSupportDirect(dto);
  }

  /**
   * Gets the status of a queued support task
   */
  @Get('task/:taskId')
  @GetTaskStatusDecorators()
  public getTaskStatus(@Param('taskId') taskId: string) {
    this.logger.log(`Checking status for task: ${taskId}`);
    const task = this.supportService.getTaskStatus(taskId);
    if (!task) {
      return { found: false, message: 'Zadanie nie zostało znalezione' };
    }
    return {
      found: true,
      task: {
        id: task.id,
        type: task.type,
        serverId: task.serverId,
        status: task.status,
        queuedAt: task.queuedAt,
        scheduledFor: task.scheduledFor,
        completedAt: task.completedAt,
        error: task.error,
      },
    };
  }
}

