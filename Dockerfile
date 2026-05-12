# Build stage: pulls the full toolchain, installs dev deps, produces the bundle.
FROM node:20.18.0-alpine AS build

LABEL maintainer="admin@xinfin.network"
WORKDIR /app

# Non-root build user to keep the filesystem layout predictable.
RUN apk --no-cache add \
      bash \
      git \
      curl \
      python3 \
      build-base \
      libffi-dev \
      openssl-dev

COPY package*.json ./
# `--ignore-scripts` skips the native rebuild of legacy transitive deps
# (`sha3@1.x`, `keccak`, etc.) whose `binding.gyp` is incompatible with newer
# `node-gyp`/Node 20. The runtime path of this app uses pure-JS hashing, so the
# missing native bindings don't affect functionality. Without this flag the
# Docker build aborts during `npm install` on Alpine.
RUN npm install --legacy-peer-deps --ignore-scripts

COPY . .
RUN mkdir -p build/contracts \
    && cp abis/*.json build/contracts/ \
    && npm run build

# Runtime stage: only production dependencies + built artifacts. This removes
# the build toolchain and dev-only packages from the final image, shrinking
# both attack surface and image size.
FROM node:20.18.0-alpine AS runtime

LABEL maintainer="admin@xinfin.network"
WORKDIR /app

# Create an unprivileged user to run the app and hand it ownership of WORKDIR
# up-front so every subsequent step (npm install, mkdir tmp/sslcert, the
# COPY --chown directives) can run as that user. This keeps the container
# rootless from this point on AND avoids a final `chown -R` over the
# multi-million-file node_modules tree, which on overlay filesystems can
# easily take 10+ minutes per layer (CodeRabbit #49 — comment vs. behaviour
# mismatch in the previous revision).
RUN addgroup -S masternode && adduser -S masternode -G masternode \
    && chown masternode:masternode /app

USER masternode

COPY --from=build --chown=masternode:masternode /app/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts \
    && npm cache clean --force

COPY --from=build --chown=masternode:masternode /app/build ./build
COPY --from=build --chown=masternode:masternode /app/abis ./abis
COPY --from=build --chown=masternode:masternode /app/apis ./apis
COPY --from=build --chown=masternode:masternode /app/app ./app
COPY --from=build --chown=masternode:masternode /app/commands ./commands
COPY --from=build --chown=masternode:masternode /app/config ./config
COPY --from=build --chown=masternode:masternode /app/contracts ./contracts
COPY --from=build --chown=masternode:masternode /app/docs ./docs
COPY --from=build --chown=masternode:masternode /app/helpers ./helpers
COPY --from=build --chown=masternode:masternode /app/middlewares ./middlewares
COPY --from=build --chown=masternode:masternode /app/models ./models
COPY --from=build --chown=masternode:masternode /app/validators ./validators
COPY --from=build --chown=masternode:masternode /app/abis.js ./abis.js
COPY --from=build --chown=masternode:masternode /app/cmd.js ./cmd.js
COPY --from=build --chown=masternode:masternode /app/crawl.js ./crawl.js
COPY --from=build --chown=masternode:masternode /app/elect.js ./elect.js
COPY --from=build --chown=masternode:masternode /app/helpers.js ./helpers.js
COPY --from=build --chown=masternode:masternode /app/index.js ./index.js
COPY --from=build --chown=masternode:masternode /app/index-prod.html ./index.html

RUN mkdir -p /app/tmp /app/sslcert

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "index.js"]
