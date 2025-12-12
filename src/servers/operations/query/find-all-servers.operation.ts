import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindAllServersDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Znajduje wszystkie serwery
 * @param includeInactive Czy włączyć nieaktywne serwery
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista serwerów posortowana po ID
 */
export async function findAllServersOperation(
    includeInactive: boolean,
    deps: FindAllServersDependencies
): Promise<ServerResponseDto[]> {
    const { serverRepository } = deps;
    
    const queryBuilder = serverRepository.createQueryBuilder('server')
        .leftJoinAndSelect('server.cookies', 'cookies');

    if (!includeInactive) {
        queryBuilder.where('server.isActive = :isActive', { isActive: true });
    }

    const servers = await queryBuilder
        .orderBy('server.id', 'ASC')
        .getMany();

    return servers.map(server => mapToResponseDtoOperation(server));
}

