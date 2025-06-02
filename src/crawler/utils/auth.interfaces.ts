import { BrowserContext, Page } from 'playwright';

// Interfejs dla pliku cookie Plemiona
export interface PlemionaCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
}

// Interfejs dla danych uwierzytelniania
export interface PlemionaCredentials {
    username: string;
    password: string;
    targetWorld: string;
}

// Interfejs dla opcji logowania
export interface LoginOptions {
    useManualLogin?: boolean;
    skipCookies?: boolean;
    loginTimeout?: number;
    worldSelectionTimeout?: number;
}

// Interfejs dla wyniku operacji logowania
export interface LoginResult {
    success: boolean;
    method: 'cookies' | 'manual' | 'mixed';
    worldSelected: boolean;
    error?: string;
} 