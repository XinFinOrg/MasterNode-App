FROM node:16.16.0-alpine

LABEL maintainer="admin@xinfin.network"

WORKDIR /app

COPY package*.json ./

RUN apk --no-cache add \
      bash \
      git \
      curl \
      build-base \
      libffi-dev \
      openssl-dev \
      bzip2-dev \
      zlib-dev \
      readline-dev \
      sqlite-dev \
    && curl https://pyenv.run | bash \
    && export PATH="/root/.pyenv/bin:$PATH" \
    && eval "$(pyenv init -)" \
    && eval "$(pyenv virtualenv-init -)" \
    && pyenv install 2.7.18 3.9.0 \
    && pyenv global 3.9.0 2.7.18 \
    && npm install --legacy-peer-deps
COPY . .

RUN mkdir -p build/contracts \
    && mv abis/* build/contracts/ \
    && npm run build \
    && rm -rf node_modules \
    && npm install --production --legacy-peer-deps

ENTRYPOINT ["npm"]  

CMD ["start"]
