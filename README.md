# rsshub-routes-tempoco

Tempo.co route for RSSHub

## Usage in docker-compose

First, clone it to the location of your `docker-compose.yml`

```sh
git clone git@github.com:chickenzord/rsshub-routes-tempoco.git
```

Edit your `docker-compose.yml` accordingly:

```yaml
services:
  rsshub:
    container_name: rsshub
    image: ghcr.io/diygod/rsshub:latest
    restart: always
    command:
    - bash
    - -c
    - npm run build && npm run start
    environment:
      - NODE_ENV=production
    volumes:
      - ./rsshub-routes-tempoco:/app/lib/routes/tempoco:ro
```

- `command`: The official docker image only use `npm run start` need to rebuild the routes by running `npm run build` beforehand.
- `volumes`: Mount the cloned route repository in `/app/lib/routes`

## Development

Clone in your RSSHub working directory

```
git clone https://github.com/chickenzord/rsshub-routes-tempoco.git lib/routes/tempoco
```
