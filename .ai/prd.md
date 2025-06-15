# PRD – Plemiona Bot Backend

## Cel projektu

Stworzenie backendu automatyzującego zarządzanie wioskami w grze Plemiona, w tym:
- synchronizację danych o wioskach,
- automatyzację budowy budynków,
- zarządzanie kolejkami budowy,
- obsługę ustawień automatyzacji (scavenging, budowa),
- integrację z systemem autoryzacji użytkowników.

## Główne funkcjonalności

### 1. Zarządzanie wioskami
- Automatyczna synchronizacja listy wiosek z grą (co godzinę lub na żądanie).
- Przechowywanie informacji o wioskach: ID, nazwa, koordynaty, status automatyzacji.
- API do pobierania listy wiosek, filtrowania po statusie automatyzacji, pobierania szczegółów.

### 2. Automatyzacja budowy budynków
- System kolejki budowy dla każdej wioski.
- API do dodawania budynków do kolejki (po nazwie wioski, nie ID).
- Automatyczny procesor co 5 minut: logowanie do gry, sprawdzanie poziomów, klikanie budowy, weryfikacja sukcesu.
- Zaawansowana walidacja: wymagania budynków, max poziomy, brak duplikatów, ciągłość poziomów.

### 3. Zarządzanie automatyzacją
- API do włączania/wyłączania automatycznego scavengingu i budowy dla każdej wioski.
- Filtrowanie wiosek po statusie automatyzacji.

### 4. Integracja z autoryzacją
- Obsługa użytkowników przez Clerk (lub inny provider).
- Ochrona endpointów wymagających autoryzacji.

### 5. Monitoring i logowanie
- Szczegółowe logi operacji (przetwarzanie kolejki, błędy, sukcesy).
- API do podglądu statusu kolejek.

## API – główne endpointy

- `GET /api/villages` – lista wiosek (z automatycznym odświeżaniem)
- `GET /api/villages/:id` – szczegóły wioski
- `POST /api/villages/refresh` – ręczne odświeżenie danych
- `PUT /api/villages/:id/scavenging` – toggle scavenging
- `PUT /api/villages/:id/building` – toggle auto-building
- `GET /api/villages/auto-scavenging-status` – wioski z auto-scavenging
- `GET /api/villages/auto-building-status` – wioski z auto-building
- `POST /api/village-construction-queue` – dodaj budynek do kolejki
- `GET /api/village-construction-queue/village/:villageId` – pobierz kolejkę budowy
- `DELETE /api/village-construction-queue/:id` – usuń z kolejki
- `GET /api/village-construction-queue/scrape-all-villages-queue` – pobierz kolejki z gry

## Wymagania techniczne

- Node.js, NestJS, TypeScript
- Baza danych SQL (np. MySQL)
- Integracja z grą przez scraping i automatyzację przeglądarki
- Dokumentacja API w Swagger

## Użytkownicy

- Zalogowani użytkownicy (autoryzacja przez Clerk)
- Każdy użytkownik widzi tylko swoje dane

## Przypadki użycia

- Użytkownik włącza automatyzację budowy/scavengingu dla wybranej wioski
- Użytkownik dodaje budynek do kolejki budowy
- System automatycznie realizuje budowę zgodnie z kolejką
- Użytkownik monitoruje status wiosek i kolejek przez API
