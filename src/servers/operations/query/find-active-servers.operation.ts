import { findAllServersOperation, FindAllServersDependencies } from './find-all-servers.operation';
import { ServerResponseDto } from '../../dto/server-response.dto';

export interface FindActiveServersDependencies {
    findAllServersDeps: FindAllServersDependencies;
}

/**
 * Pobiera tylko aktywne serwery (dla orchestratora)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista aktywnych serwerów
 */
export async function findActiveServersOperation(
    deps: FindActiveServersDependencies
): Promise<ServerResponseDto[]> {
    return findAllServersOperation(false, deps.findAllServersDeps);
}

