import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { CreateServerDto } from '../../dto/create-server.dto';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';
import { createDefaultSettingsOperation, CreateDefaultSettingsDependencies } from '../settings/create-default-settings.operation';

export interface CreateServerDependencies {
    serverRepository: Repository<ServerEntity>;
    createDefaultSettingsDeps: CreateDefaultSettingsDependencies;
}

/**
 * Tworzy nowy serwer
 * @param createServerDto Dane serwera do utworzenia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO utworzonego serwera
 * @throws ConflictException jeśli serwer o podanym ID lub kodzie już istnieje
 */
export async function createServerOperation(
    createServerDto: CreateServerDto,
    deps: CreateServerDependencies
): Promise<ServerResponseDto> {
    const { serverRepository, createDefaultSettingsDeps } = deps;

    // Sprawdź czy serwer o podanym ID już istnieje
    const existingServerById = await serverRepository.findOne({
        where: { id: createServerDto.id }
    });

    if (existingServerById) {
        throw new ConflictException(`Server with ID ${createServerDto.id} already exists`);
    }

    // Sprawdź czy serwer o podanym kodzie już istnieje
    const existingServerByCode = await serverRepository.findOne({
        where: { serverCode: createServerDto.serverCode }
    });

    if (existingServerByCode) {
        throw new ConflictException(`Server with code ${createServerDto.serverCode} already exists`);
    }

    const server = serverRepository.create({
        id: createServerDto.id,
        serverCode: createServerDto.serverCode,
        serverName: createServerDto.serverName,
        isActive: createServerDto.isActive ?? true
    });

    const savedServer = await serverRepository.save(server);

    // Utwórz domyślne ustawienia dla nowego serwera
    await createDefaultSettingsOperation(savedServer.id, createDefaultSettingsDeps);

    return mapToResponseDtoOperation(savedServer);
}

