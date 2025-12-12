import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { UpdateServerDto } from '../../dto/update-server.dto';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { findServerByIdOperation, FindServerByIdDependencies } from '../query/find-server-by-id.operation';

export interface UpdateServerDependencies {
    serverRepository: Repository<ServerEntity>;
    findServerByIdDeps: FindServerByIdDependencies;
}

/**
 * Aktualizuje serwer
 * @param id ID serwera
 * @param updateServerDto Dane do aktualizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO zaktualizowanego serwera
 * @throws NotFoundException jeśli serwer nie istnieje
 * @throws ConflictException jeśli nowy kod serwera jest już zajęty
 */
export async function updateServerOperation(
    id: number,
    updateServerDto: UpdateServerDto,
    deps: UpdateServerDependencies
): Promise<ServerResponseDto> {
    const { serverRepository, findServerByIdDeps } = deps;
    
    const server = await serverRepository.findOne({ where: { id } });

    if (!server) {
        throw new NotFoundException(`Server with ID ${id} not found`);
    }

    // Sprawdź czy nowy kod serwera nie jest już zajęty
    if (updateServerDto.serverCode && updateServerDto.serverCode !== server.serverCode) {
        const existingServer = await serverRepository.findOne({
            where: { serverCode: updateServerDto.serverCode }
        });

        if (existingServer) {
            throw new ConflictException(`Server with code ${updateServerDto.serverCode} already exists`);
        }
    }

    Object.assign(server, updateServerDto);
    const updatedServer = await serverRepository.save(server);

    return findServerByIdOperation(updatedServer.id, findServerByIdDeps);
}

