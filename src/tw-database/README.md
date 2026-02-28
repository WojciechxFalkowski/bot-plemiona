# TWDatabase Module

Integracja z TWDatabase (twdatabase.online) – pobieranie planu ataków i automatyczne wysyłanie fejków oraz buziaków (Burzak).

## Automatyczne uruchamianie

Integracja jest zbudowana w orkiestrator crawlera. Włącz w ustawieniach orkiestratora (frontend: Ustawienia → Orkiestrator) dla danego serwera. Wymaga zapisania loginu i hasła – są przechowywane per serwer, zaszyfrowane w DB.

## Endpointy

- `GET /api/tw-database/visit-attack-planner?serverId=217&headless=false` – ręczne wyzwolenie; opcjonalnie `serverId` (domyślnie pierwszy aktywny); `headless` domyślnie z `NODE_ENV`
- `POST /api/crawler-orchestrator/:serverId/trigger-tw-database` – ręczne wyzwolenie dla serwera

## Zmienne środowiskowe

| Zmienna | Opis |
|--------|------|
| `TW_DATABASE_LOGIN` | Login do TWDatabase (fallback gdy brak w ustawieniach per serwer) |
| `TW_DATABASE_PASSWORD` | Hasło do TWDatabase (fallback) |
| `ENCRYPTION_KEY` | Klucz AES-256 (64 hex) – do szyfrowania haseł w ustawieniach; wymagany do zapisu credentials w UI |
| `PLEMIONA_USERNAME` | Użytkownik Plemiona (do logowania) |

## Obsługiwane typy ataków

- **Fejk** – ataki z etykietą zawierającą "fejk" (np. "Wyślij fejk (1 z 3)")
- **Burzak (buziak)** – ataki niszczące budynek, etykieta zawiera "Burzak" (np. "Burzak (Wojsko-0, Katapulty-50 Zagroda)")

## Konfiguracja metod fejków

Plik [`config/fejk-methods.json`](../../config/fejk-methods.json) definiuje dwie metody:

- **method1** (buziak): 50 spy + siege, gdy wioska ma ≥500 zwiadowców
- **method2** (off): 16 axe + 16 light + 4 siege

Pole `siegeUnits` określa kolejność sprawdzania (ram przed catapult lub odwrotnie). Można edytować plik bez przebudowy. Do każdego fejka dodawane jest min. 5 zwiadowców (gdy dostępne).

## Konfiguracja buziaków (Burzak)

Burzak wysyła katapulty + topornicy (ta sama liczba co katapult) + opcjonalnie 5 zwiadowców. Reguła 90%: przy braku jednostek akceptowane jest min. 90% wymaganej liczby. Budynek docelowy (Kuźnia, Zagroda, Ratusz itd.) jest wybierany z etykiety i ustawiany na ekranie potwierdzenia ataku.

## Flow

1. Logowanie do TWDatabase
2. Scraping tabeli Attack Planner
3. Filtrowanie ataków fejk i Burzak (SPÓŹNIONY / teraz)
4. Zapis do `tw_database_attacks`
5. Clear sent – zaznaczenie wysłanych w TWDatabase (start i koniec)
6. Logowanie do Plemiona i wybór świata
7. Dla każdego ataku:
   - **Fejk**: nawigacja → odczyt jednostek → wybór metody (1 lub 2) → wypełnienie → atak → potwierdzenie
   - **Burzak**: nawigacja → odczyt jednostek → wypełnienie (katapulty + topornicy + zwiadowcy) → atak → wybór budynku → potwierdzenie
8. Aktualizacja statusu w DB (SENT / FAILED)
