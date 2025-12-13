import { Page } from 'playwright';

export interface CheckLoginStatusDependencies {
    page: Page;
}

export interface LoginStatus {
    isLoggedIn: boolean;
    isOnCorrectWorld: boolean;
    currentWorld?: string;
}

/**
 * Checks if user is logged in and on the correct world
 * @param expectedWorld Optional expected world name to check
 * @param deps Dependencies containing page instance
 * @returns Login status information
 */
export async function checkLoginStatusOperation(
    expectedWorld: string | undefined,
    deps: CheckLoginStatusDependencies
): Promise<LoginStatus> {
    const { page } = deps;

    try {
        const url = page.url();
        const isLoggedIn = url.includes('game.php') || url.includes('plemiona.pl/game.php');
        
        let isOnCorrectWorld = true;
        let currentWorld: string | undefined;

        if (expectedWorld && isLoggedIn) {
            // Extract world from URL (e.g., pl216.plemiona.pl)
            const worldMatch = url.match(/(\w+)\.plemiona\.pl/);
            if (worldMatch) {
                currentWorld = worldMatch[1];
                // Simple check - could be enhanced with server name mapping
                isOnCorrectWorld = true; // TODO: Implement proper world validation
            }
        }

        return {
            isLoggedIn,
            isOnCorrectWorld,
            currentWorld
        };
    } catch (error) {
        return {
            isLoggedIn: false,
            isOnCorrectWorld: false
        };
    }
}


