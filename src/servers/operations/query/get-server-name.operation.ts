import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';

export interface GetServerNameDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Pobiera nazwę serwera po ID
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Nazwa serwera lub pusty string jeśli nie znaleziono
 */
export async function getServerNameOperation(
    serverId: number,
    deps: GetServerNameDependencies
): Promise<string> {
    const { serverRepository } = deps;
    const server = await serverRepository.findOne({ where: { id: serverId } });
    return server?.serverName || '';
}

