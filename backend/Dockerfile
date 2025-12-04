# ============================================
# Calcio SQL Backend - Dockerfile
# ============================================

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files from backend
COPY backend/src ./src

# Copy frontend from root
COPY frontend ./frontend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
