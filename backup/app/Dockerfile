FROM node:22-alpine

EXPOSE 3011

# Create app directory
WORKDIR /opt/app

# Install app dependencies
COPY package*.json .
ENV NODE_ENV=production

RUN npm install

COPY . .

# RUN npm remove @shopify/app @shopify/cli
RUN npm run build





