# TWDatabase Module

Integracja z TWDatabase (twdatabase.online) – pobieranie planu fejków i automatyczne wysyłanie.

## Endpoint

- `GET /api/tw-database/visit-attack-planner?headless=false` – scrape tabeli, zapis do DB, wysyłanie fejków na Plemiona

## Zmienne środowiskowe

| Zmienna | Opis |
|--------|------|
| `TW_DATABASE_LOGIN` | Login do TWDatabase |
| `TW_DATABASE_PASSWORD` | Hasło do TWDatabase |
| `PLEMIONA_USERNAME` | Użytkownik Plemiona (do logowania) |

## Konfiguracja metod fejków

Plik [`config/fejk-methods.json`](../../config/fejk-methods.json) definiuje dwie metody:

- **method1** (buziak): 50 spy + siege, gdy wioska ma ≥500 zwiadowców
- **method2** (off): 16 axe + 16 light + 4 siege

Pole `siegeUnits` określa kolejność sprawdzania (ram przed catapult lub odwrotnie). Można edytować plik bez przebudowy.

## Flow

1. Logowanie do TWDatabase
2. Scraping tabeli Attack Planner
3. Filtrowanie fejków (SPÓŹNIONY / teraz)
4. Zapis do `tw_database_attacks`
5. Logowanie do Plemiona i wybór świata
6. Dla każdego fejka: nawigacja → odczyt dostępnych jednostek → wybór metody (1 lub 2) → wybór siege (ram/catapult) → wypełnienie → atak → potwierdzenie
7. Aktualizacja statusu w DB (SENT / FAILED)
