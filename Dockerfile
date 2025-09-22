# Use Node.js 20.19.0
FROM node:20.19.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci
COPY . .

RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]