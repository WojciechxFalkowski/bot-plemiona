import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';

export interface IsServerActiveByIdDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Sprawdza czy serwer istnieje i jest aktywny
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns true jeśli serwer istnieje i jest aktywny, false w przeciwnym razie
 */
export async function isServerActiveByIdOperation(
    serverId: number,
    deps: IsServerActiveByIdDependencies
): Promise<boolean> {
    const { serverRepository } = deps;
    
    const server = await serverRepository.findOne({
        where: { id: serverId, isActive: true }
    });
    
    return !!server;
}

