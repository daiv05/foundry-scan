FROM node:24-alpine AS base

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 7110

CMD ["npm", "run", "dev"]
