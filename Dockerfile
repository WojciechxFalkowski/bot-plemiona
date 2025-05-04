FROM node:20.11.1

# Ustawienie zmiennej środowiskowej NODE_ENV na produkcję
# ENV NODE_ENV production

# Kopiowanie plików package.json i package-lock.json
COPY package.json package-lock.json ./

# Instalacja zależności
RUN npm install
RUN npx playwright install
RUN npx playwright install-deps
# Kopiowanie całego kodu źródłowego
COPY . .

# Budowanie aplikacji w trybie produkcyjnym
RUN npm run build

# Pruning development dependencies
RUN npm prune --production

# Przebudowanie bcrypt
RUN npm rebuild bcrypt --build-from-source

# Uruchomienie aplikacji w trybie produkcyjnym
CMD ["node", "dist/src/main.js"]
