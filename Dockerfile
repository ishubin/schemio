FROM node:17 as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY src ./src
COPY assets ./assets
COPY webpack.* ./
COPY all-tests.js ./
COPY test ./test
COPY .babelrc ./

RUN npm test

RUN npm run build-app-prod
RUN npm run build


#===============================================

FROM node:17-bullseye-slim

WORKDIR /usr/bin/app

RUN groupadd  app && useradd --gid app --shell /bin/bash --create-home app

USER app

COPY assets /usr/bin/app/assets
COPY conf /usr/bin/app/conf
COPY html /usr/bin/app/html
COPY --from=build /usr/src/app/node_modules /usr/bin/app/node_modules
COPY --from=build /usr/src/app/dist/assets/*.js /usr/bin/app/assets/
COPY --from=build /usr/src/app/dist/server /usr/bin/app/server

ENTRYPOINT [ "node", "server/server.js" ]