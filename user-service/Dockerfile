FROM node:18

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

EXPOSE 8001

# Start in dev mode
CMD ["npm", "run", "dev"]
