import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ScheduledAttackEntity, ScheduledAttackStatus } from '../entities/scheduled-attack.entity';
import { executeScheduledAttackOperation, ExecuteScheduledAttackDependencies } from './execute-scheduled-attack.operation';

export interface ScheduleAttacksDependencies {
  scheduledAttacksRepository: Repository<ScheduledAttackEntity>;
  executeScheduledAttackDeps: ExecuteScheduledAttackDependencies;
  logger: Logger;
}

/**
 * Harmonogramuje wszystkie pending ataki dla serwera
 * Dla każdego ataku oblicza czas wykonania w oknie [sendTimeFrom, sendTimeTo] i planuje wykonanie
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba zaplanowanych ataków
 */
export async function scheduleAttacksOperation(
  serverId: number,
  deps: ScheduleAttacksDependencies
): Promise<number> {
  const { scheduledAttacksRepository, executeScheduledAttackDeps, logger } = deps;

  logger.log(`Scheduling attacks for server ${serverId}`);

  // Pobierz wszystkie pending ataki dla serwera
  const pendingAttacks = await scheduledAttacksRepository.find({
    where: {
      serverId,
      status: ScheduledAttackStatus.PENDING,
    },
    order: { sendTimeFrom: 'ASC' },
  });

  if (pendingAttacks.length === 0) {
    logger.log(`No pending attacks found for server ${serverId}`);
    return 0;
  }

  logger.log(`Found ${pendingAttacks.length} pending attacks for server ${serverId}`);

  let scheduledCount = 0;
  let expiredCount = 0;
  const now = new Date();

  for (const attack of pendingAttacks) {
    try {
      // Sprawdź czy okno czasowe już minęło
      if (attack.sendTimeTo.getTime() < now.getTime()) {
        // Atak jest przeterminowany - ustaw status EXPIRED
        attack.status = ScheduledAttackStatus.EXPIRED;
        attack.errorMessage = `Attack expired: sendTimeTo (${attack.sendTimeTo.toISOString()}) has passed`;
        await scheduledAttacksRepository.save(attack);
        logger.log(`Attack ${attack.id} expired (sendTimeTo: ${attack.sendTimeTo.toISOString()}), status set to EXPIRED`);
        expiredCount++;
        continue;
      }

      // Oblicz czas wykonania
      let executeTime: Date;

      if (attack.sendTimeFrom.getTime() === attack.sendTimeTo.getTime()) {
        // Dokładny moment wysyłki
        executeTime = attack.sendTimeFrom;
      } else {
        // Wykonaj na początku okna
        executeTime = attack.sendTimeFrom;
      }

      // Oblicz opóźnienie (jeśli czas wykonania jest w przeszłości, ale sendTimeTo jeszcze nie minął, wykonaj natychmiast)
      const delayMs = Math.max(0, executeTime.getTime() - now.getTime());

      // Zmień status na scheduled
      attack.status = ScheduledAttackStatus.SCHEDULED;
      await scheduledAttacksRepository.save(attack);

      // Zaplanuj wykonanie
      if (delayMs === 0) {
        // Wykonaj natychmiast (jest w oknie czasowym)
        logger.log(`Scheduling attack ${attack.id} for immediate execution (within time window)`);
        executeScheduledAttackOperation(attack.id, executeScheduledAttackDeps).catch((error) => {
          logger.error(`Error executing scheduled attack ${attack.id}:`, error);
        });
      } else {
        // Zaplanuj wykonanie w przyszłości
        logger.log(
          `Scheduling attack ${attack.id} for execution at ${executeTime.toISOString()} (in ${Math.round(delayMs / 1000)}s)`
        );
        setTimeout(() => {
          executeScheduledAttackOperation(attack.id, executeScheduledAttackDeps).catch((error) => {
            logger.error(`Error executing scheduled attack ${attack.id}:`, error);
          });
        }, delayMs);
      }

      scheduledCount++;
    } catch (error) {
      logger.error(`Error scheduling attack ${attack.id}:`, error);
      // Kontynuuj z następnym atakiem
    }
  }

  logger.log(`Scheduled ${scheduledCount} attacks for server ${serverId}${expiredCount > 0 ? `, ${expiredCount} expired attacks marked as EXPIRED` : ''}`);
  return scheduledCount;
}
