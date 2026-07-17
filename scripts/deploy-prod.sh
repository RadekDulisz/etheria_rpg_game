#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/rpg-project}"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env. Deployment stopped."
  exit 1
fi

cd "$APP_DIR"

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps