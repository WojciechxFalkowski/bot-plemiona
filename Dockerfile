FROM node:20.11.1 AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
RUN npx playwright install
RUN npx playwright install-deps
COPY . .

FROM base AS build
RUN npm run build

FROM build AS test
CMD ["npm", "test"]

FROM build AS prod
RUN npm prune --production
RUN npm rebuild bcrypt --build-from-source
CMD ["node", "dist/src/main.js"]
