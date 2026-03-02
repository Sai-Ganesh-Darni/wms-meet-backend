# Use lightweight Node image
FROM node:20-bookworm

# Set working directory inside container
WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy rest of the backend source code
COPY . .

# Expose backend port
EXPOSE 4000

# Start backend in dev mode
CMD ["npm", "run", "dev"]
