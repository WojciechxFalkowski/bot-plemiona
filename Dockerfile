FROM node:22.18.0

WORKDIR /app

# Kopiowanie plików package.json i package-lock.json
COPY package.json package-lock.json ./

# Instalacja zależności (bez NODE_ENV=production, żeby zainstalować devDependencies potrzebne do builda)
RUN npm install
RUN npx playwright install
RUN npx playwright install-deps
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
