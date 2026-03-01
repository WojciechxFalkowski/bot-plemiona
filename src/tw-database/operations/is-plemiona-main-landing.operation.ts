/**
 * Returns true when on main Plemiona landing page (e.g. https://www.plemiona.pl/).
 * Indicates session lost - user logged in and kicked the bot, or redirect to login.
 *
 * @param url - Current page URL
 */
export function isOnPlemionaMainLandingPage(url: string): boolean {
    const u = url.toLowerCase();
    return u.includes('www.plemiona.pl') && !u.includes('game.php');
}
