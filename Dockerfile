# Build stage
FROM node:20.11.1-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:20.11.1-alpine

WORKDIR /app

# Set NODE_ENV to production for optimized runtime
ENV NODE_ENV=production

# Copy package files from build stage
COPY package*.json ./

# Install only production dependencies and rebuild bcrypt if needed
RUN npm ci --only=production && \
    npm rebuild bcrypt --build-from-source

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Run application
CMD ["node", "dist/main.js"]
