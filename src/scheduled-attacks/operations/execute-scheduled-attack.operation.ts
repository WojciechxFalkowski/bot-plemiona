import { Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ScheduledAttackEntity, ScheduledAttackStatus, ScheduledAttackType } from '../entities/scheduled-attack.entity';
import { ServersService } from '@/servers/servers.service';
import { performAttackOperation, AttackConfig } from '@/crawler/operations/attacks/perform-attack.operation';
import { performSupportOperation } from '@/crawler/operations/attacks/perform-support.operation';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';

export interface ExecuteScheduledAttackDependencies {
  scheduledAttacksRepository: Repository<ScheduledAttackEntity>;
  serversService: ServersService;
  performAttackOperation: typeof performAttackOperation;
  performSupportOperation: typeof performSupportOperation;
  credentials: PlemionaCredentials;
  plemionaCookiesService: PlemionaCookiesService;
  logger: Logger;
}

/**
 * Wykonuje zaplanowany atak - loguje się, wykonuje atak/wsparcie i aktualizuje status
 * @param attackId ID zaplanowanego ataku
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function executeScheduledAttackOperation(
  attackId: number,
  deps: ExecuteScheduledAttackDependencies
): Promise<void> {
  const {
    scheduledAttacksRepository,
    serversService,
    performAttackOperation,
    performSupportOperation,
    credentials,
    plemionaCookiesService,
    logger,
  } = deps;

  logger.log(`Executing scheduled attack with ID ${attackId}`);

  // Pobierz atak z bazy
  const attack = await scheduledAttacksRepository.findOne({
    where: { id: attackId },
    relations: ['server'],
  });

  if (!attack) {
    throw new NotFoundException(`Scheduled attack with ID ${attackId} not found`);
  }

  // Zmień status na executing
  attack.status = ScheduledAttackStatus.EXECUTING;
  await scheduledAttacksRepository.save(attack);

  try {
    // Pobierz serverName
    const serverName = await serversService.getServerName(attack.serverId);

    // Mapuj encję do AttackConfig
    const attackConfig: AttackConfig = {
      id: attack.villageId || attack.id.toString(),
      link: attack.attackUrl,
      scheduleTime: 0, // nieużywane w scheduled attacks
      marchTime: 0, // nieużywane w scheduled attacks
      type: attack.attackType === ScheduledAttackType.SUPPORT ? 'support' : 'attack',
    };

    // Wywołaj odpowiednią operację
    if (attack.attackType === ScheduledAttackType.SUPPORT) {
      logger.log(`Executing support for attack ID ${attackId}`);
      await performSupportOperation(attackConfig, serverName, {
        logger,
        credentials,
        plemionaCookiesService,
      });
    } else {
      logger.log(`Executing attack for attack ID ${attackId} (type: ${attack.attackType})`);
      await performAttackOperation(attackConfig, serverName, {
        logger,
        credentials,
        plemionaCookiesService,
      });
    }

    // Aktualizuj status na completed
    attack.status = ScheduledAttackStatus.COMPLETED;
    attack.executedAt = new Date();
    attack.errorMessage = undefined;
    await scheduledAttacksRepository.save(attack);

    logger.log(`Scheduled attack ${attackId} completed successfully`);
  } catch (error) {
    // Aktualizuj status na failed
    attack.status = ScheduledAttackStatus.FAILED;
    attack.errorMessage = error instanceof Error ? error.message : String(error);
    await scheduledAttacksRepository.save(attack);

    logger.error(`Scheduled attack ${attackId} failed:`, error);
    throw error;
  }
}
