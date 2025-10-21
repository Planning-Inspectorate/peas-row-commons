# Stage 1/2 - Builder
FROM node:22-alpine AS base

#RUN apk update

ARG GIT_SHA

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

COPY packages ./packages
COPY apps/app-2 ./apps/app-2

RUN npm ci --loglevel notice --workspace=peas-row-commons-app-2 --ignore-scripts

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

RUN npm run build --workspace=peas-row-commons-app-2
RUN npm run db-generate

# --------------------------------

# Stage 2/2 - App run
FROM base

ARG GIT_SHA

WORKDIR /usr/src/app/apps/app-2

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

# TODO: Perhaps use `RUN npm ci --production` to shrink the size of the container

EXPOSE 8080

ENTRYPOINT npm run start
