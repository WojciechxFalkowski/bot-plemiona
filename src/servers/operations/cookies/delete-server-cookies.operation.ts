import { Repository } from 'typeorm';
import { ServerCookiesEntity } from '../../entities/server-cookies.entity';

export interface DeleteServerCookiesDependencies {
    serverCookiesRepository: Repository<ServerCookiesEntity>;
}

/**
 * Usuwa cookies dla serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function deleteServerCookiesOperation(
    serverId: number,
    deps: DeleteServerCookiesDependencies
): Promise<void> {
    const { serverCookiesRepository } = deps;
    
    const cookies = await serverCookiesRepository.findOne({
        where: { serverId }
    });

    if (cookies) {
        await serverCookiesRepository.remove(cookies);
    }
}

