import { Injectable, Logger } from '@nestjs/common';
import { SlackNotificationService } from '../notifications/slack-notification.service';

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

/** Default interval for RecaptchaCheck when blocked (10 minutes) */
export const RECAPTCHA_CHECK_INTERVAL_MS = 600000;

export interface RecaptchaBlockedEntry {
    detectedAt: Date;
    nextCheckAt: Date;
}

@Injectable()
export class CrawlerStatusService {
    private readonly logger = new Logger(CrawlerStatusService.name);
    private activeServer: ActiveServerInfo | null = null;
    private recaptchaBlockedServers: Map<number, RecaptchaBlockedEntry> = new Map();
    private nextScheduledAt: number | null = null;
    private nextScheduledTask: NextScheduledTaskInfo | null = null;

    constructor(private readonly slackNotificationService: SlackNotificationService) { }

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
     * Sets nextCheckAt to now + 10 minutes.
     */
    markRecaptchaBlocked(serverId: number): void {
        const now = new Date();
        const nextCheckAt = new Date(now.getTime() + RECAPTCHA_CHECK_INTERVAL_MS);

        if (!this.recaptchaBlockedServers.has(serverId)) {
            let operationType = 'Nieznana operacja';
            if (this.activeServer && this.activeServer.serverId === serverId) {
                operationType = this.activeServer.taskType;
            }

            this.slackNotificationService.sendRecaptchaAlert({ serverId, operationType })
                .catch(err => this.logger.error('Failed to send slack alert', err));
        }

        this.recaptchaBlockedServers.set(serverId, { detectedAt: now, nextCheckAt });
    }

    /**
     * Sets RecaptchaCheck to run immediately for a blocked server (manual trigger).
     */
    setRecaptchaCheckDueNow(serverId: number): void {
        const entry = this.recaptchaBlockedServers.get(serverId);
        if (!entry) return;
        this.recaptchaBlockedServers.set(serverId, {
            ...entry,
            nextCheckAt: new Date()
        });
    }

    /**
     * Updates next RecaptchaCheck time (e.g. when check failed, still blocked).
     */
    updateRecaptchaNextCheck(serverId: number, nextCheckAt: Date): void {
        const entry = this.recaptchaBlockedServers.get(serverId);
        if (!entry) return;
        this.recaptchaBlockedServers.set(serverId, { ...entry, nextCheckAt });
    }

    /**
     * Clears recaptcha-blocked state for a server (next run succeeded).
     */
    clearRecaptchaBlocked(serverId: number): void {
        this.recaptchaBlockedServers.delete(serverId);
    }

    /**
     * Returns the next RecaptchaCheck task to run (earliest due, or null).
     */
    getNextRecaptchaCheckDue(): { serverId: number; nextCheckAt: Date } | null {
        const now = Date.now();
        let earliest: { serverId: number; nextCheckAt: Date } | null = null;
        for (const [serverId, entry] of this.recaptchaBlockedServers) {
            if (entry.nextCheckAt.getTime() <= now) {
                if (!earliest || entry.nextCheckAt.getTime() < earliest.nextCheckAt.getTime()) {
                    earliest = { serverId, nextCheckAt: entry.nextCheckAt };
                }
            }
        }
        return earliest;
    }

    /**
     * Returns recaptcha-blocked entries with nextCheckAt for schedule display.
     */
    getRecaptchaBlockedEntries(): Array<{ serverId: number; detectedAt: Date; nextCheckAt: Date }> {
        return Array.from(this.recaptchaBlockedServers.entries()).map(([serverId, entry]) => ({
            serverId,
            detectedAt: entry.detectedAt,
            nextCheckAt: entry.nextCheckAt
        }));
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

    /**
     * Returns nextCheckAt for a recaptcha-blocked server.
     */
    getRecaptchaNextCheckAt(serverId: number): Date | null {
        return this.recaptchaBlockedServers.get(serverId)?.nextCheckAt ?? null;
    }
}
