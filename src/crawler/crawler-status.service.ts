import { Injectable } from '@nestjs/common';

export interface ActiveServerInfo {
    serverId: number;
    serverCode: string;
    serverName: string;
    taskType: string;
    startedAt: Date;
}

/**
 * In-memory state for crawler active server and recaptcha-blocked servers.
 * Used by the header status indicator (polling from frontend).
 */
export interface NextScheduledTaskInfo {
    taskType: string;
    serverCode: string;
}

@Injectable()
export class CrawlerStatusService {
    private activeServer: ActiveServerInfo | null = null;
    private recaptchaBlockedServers: Map<number, { detectedAt: Date }> = new Map();
    private nextScheduledAt: number | null = null;
    private nextScheduledTask: NextScheduledTaskInfo | null = null;

    /**
     * Sets the currently active server (crawler is executing a task on it).
     */
    setActive(
        serverId: number,
        serverCode: string,
        serverName: string,
        taskType: string
    ): void {
        this.activeServer = {
            serverId,
            serverCode,
            serverName,
            taskType,
            startedAt: new Date(),
        };
    }

    /**
     * Clears the active server state (task finished).
     */
    clearActive(): void {
        this.activeServer = null;
    }

    /**
     * Sets the next scheduled execution time (ms from now) and optional task info.
     */
    setNextScheduledIn(ms: number, nextTask?: NextScheduledTaskInfo | null): void {
        this.nextScheduledAt = Date.now() + ms;
        this.nextScheduledTask = nextTask ?? null;
    }

    /**
     * Clears the next scheduled execution time.
     */
    clearNextScheduled(): void {
        this.nextScheduledAt = null;
        this.nextScheduledTask = null;
    }

    /**
     * Marks a server as blocked by reCAPTCHA (bot protection detected).
     */
    markRecaptchaBlocked(serverId: number): void {
        this.recaptchaBlockedServers.set(serverId, { detectedAt: new Date() });
    }

    /**
     * Clears recaptcha-blocked state for a server (next run succeeded).
     */
    clearRecaptchaBlocked(serverId: number): void {
        this.recaptchaBlockedServers.delete(serverId);
    }

    /**
     * Returns raw status for the API (without server names/codes enrichment).
     */
    getStatus(): {
        activeServer: ActiveServerInfo | null;
        recaptchaBlockedServerIds: number[];
        nextScheduledInSeconds: number | null;
        nextScheduledTask: NextScheduledTaskInfo | null;
    } {
        const nextScheduledInSeconds = this.nextScheduledAt
            ? Math.max(0, Math.floor((this.nextScheduledAt - Date.now()) / 1000))
            : null;
        return {
            activeServer: this.activeServer,
            recaptchaBlockedServerIds: Array.from(this.recaptchaBlockedServers.keys()),
            nextScheduledInSeconds,
            nextScheduledTask: this.nextScheduledTask,
        };
    }

    /**
     * Returns detectedAt for a recaptcha-blocked server.
     */
    getRecaptchaDetectedAt(serverId: number): Date | null {
        return this.recaptchaBlockedServers.get(serverId)?.detectedAt ?? null;
    }
}
