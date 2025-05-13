FROM node:18-slim

LABEL org.opencontainers.image.title="TemplateBot"
LABEL org.opencontainers.image.description="GitHub App for propagating template repository changes"
LABEL org.opencontainers.image.source="https://github.com/yourusername/templatebot"

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Default to port 3000
ENV PORT=3000

# Run as non-root user for better security
USER node

CMD ["npm", "start"]