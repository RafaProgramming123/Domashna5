FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production
COPY . .

FROM base AS test
RUN npm install
RUN npm test

FROM base AS release
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]

