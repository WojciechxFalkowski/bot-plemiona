import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';

export interface DeleteServerDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Usuwa serwer
 * @param id ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli serwer nie istnieje
 */
export async function deleteServerOperation(
    id: number,
    deps: DeleteServerDependencies
): Promise<void> {
    const { serverRepository } = deps;
    
    const server = await serverRepository.findOne({ where: { id } });

    if (!server) {
        throw new NotFoundException(`Server with ID ${id} not found`);
    }

    await serverRepository.remove(server);
}

