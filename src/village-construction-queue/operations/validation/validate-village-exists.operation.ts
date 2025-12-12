import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '@/villages/entities/village.entity';

export interface ValidateVillageExistsDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Sprawdza czy wioska istnieje w bazie danych
 * @param villageId ID wioski do sprawdzenia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Encja wioski jeśli istnieje
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function validateVillageExistsOperation(
    villageId: string,
    deps: ValidateVillageExistsDependencies
): Promise<VillageEntity> {
    const { villageRepository, logger } = deps;
    const village = await villageRepository.findOne({
        where: { id: villageId }
    });

    if (!village) {
        logger.error(`Village ${villageId} not found`);
        throw new NotFoundException(`Village with ID ${villageId} not found`);
    }

    return village;
}

