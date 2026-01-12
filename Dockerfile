FROM node:lts-alpine
WORKDIR /
COPY . .
RUN npm install
# RUN npm run build
CMD ["node","./dist/index.js"]