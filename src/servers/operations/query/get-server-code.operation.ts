import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';

export interface GetServerCodeDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Pobiera kod serwera po ID
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Kod serwera lub pusty string jeśli nie znaleziono
 */
export async function getServerCodeOperation(
    serverId: number,
    deps: GetServerCodeDependencies
): Promise<string> {
    const { serverRepository } = deps;
    const server = await serverRepository.findOne({ where: { id: serverId } });
    return server?.serverCode || '';
}

