import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';

export interface IsServerActiveByCodeDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Sprawdza czy serwer istnieje i jest aktywny po kodzie
 * @param serverCode Kod serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns true jeśli serwer istnieje i jest aktywny, false w przeciwnym razie
 */
export async function isServerActiveByCodeOperation(
    serverCode: string,
    deps: IsServerActiveByCodeDependencies
): Promise<boolean> {
    const { serverRepository } = deps;
    
    const server = await serverRepository.findOne({
        where: { serverCode, isActive: true }
    });
    
    return !!server;
}

