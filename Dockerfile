FROM node:22.18.0

WORKDIR /app

# Kopiowanie plików package.json i package-lock.json
COPY package.json package-lock.json ./

# Instalacja zależności (bez NODE_ENV=production, żeby zainstalować devDependencies potrzebne do builda)
RUN npm install
# App uses only chromium.launch (see browser.utils.ts); skip firefox/webkit to shrink image and build time
RUN npx playwright install --with-deps chromium
# Kopiowanie całego kodu źródłowego
COPY . .

# Budowanie aplikacji w trybie produkcyjnym
RUN npm run build

# NODE_ENV=production + usunięcie devDependencies
ENV NODE_ENV=production
RUN npm prune --production

# Przebudowanie bcrypt
RUN npm rebuild bcrypt --build-from-source

# Uruchomienie aplikacji w trybie produkcyjnym
CMD ["node", "dist/src/main.js"]
