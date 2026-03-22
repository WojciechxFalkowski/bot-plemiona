import { Page } from 'playwright';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { classifyCrawlerErrorOperation, CrawlerErrorType } from './classify-crawler-error.operation';

export interface HandleCrawlerErrorContext {
    serverId: number;
    operationType: string;
    logActivity?: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
    onRecaptchaBlocked?: (serverId: number) => void;
    onTokenExpired?: (serverId: number) => void;
    /** Optional custom message for error case */
    errorMessage?: string;
    /** When true, do not log when classification is 'error' (e.g. proactive checks where 'error' means "page is OK") */
    skipLogOnGenericError?: boolean;
}

/**
 * Classifies crawler error and handles logging/callbacks.
 * For recaptcha_blocked: calls onRecaptchaBlocked, logs RECAPTCHA_BLOCKED.
 * For session_expired: calls onTokenExpired, logs SESSION_EXPIRED.
 * For error: logs ERROR with optional message.
 *
 * @param page Playwright page (may be null)
 * @param url Current page URL
 * @param context Context with serverId, operationType, optional logActivity and onRecaptchaBlocked
 * @returns The classified error type
 */
export async function handleCrawlerErrorOperation(
    page: Page | null,
    url: string,
    context: HandleCrawlerErrorContext
): Promise<CrawlerErrorType> {
    const classification = await classifyCrawlerErrorOperation(page, url);
    const { serverId, operationType, logActivity, onRecaptchaBlocked } = context;

    if (classification === 'recaptcha_blocked') {
        onRecaptchaBlocked?.(serverId);
        await logActivity?.({
            eventType: CrawlerActivityEventType.RECAPTCHA_BLOCKED,
            message: 'reCAPTCHA wymaga odblokowania'
        });
        return classification;
    }

    if (classification === 'session_expired' || context.errorMessage?.includes('World selector not visible') || context.errorMessage?.includes('SESSION_EXPIRED')) {
        context.onTokenExpired?.(serverId);
        await logActivity?.({
            eventType: CrawlerActivityEventType.SESSION_EXPIRED,
            message: 'Sesja wygasła (użytkownik wylogowany / złe ciastka)'
        });
        return 'session_expired';
    }

    if (classification === 'error') {
        if (!context.skipLogOnGenericError) {
            const msg = context.errorMessage ?? `${operationType} - nieoczekiwany błąd`;
            await logActivity?.({
                eventType: CrawlerActivityEventType.ERROR,
                message: msg
            });
        }
        return classification;
    }

    return classification;
}
