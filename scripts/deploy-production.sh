#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/multiple}"
APP_NAME="${APP_NAME:-thoughtgrid}"
BRANCH="${BRANCH:-main}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Git repository not found: $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing $APP_DIR/.env" >&2
  exit 1
fi

git -C "$APP_DIR" fetch origin "$BRANCH"
git -C "$APP_DIR" reset --hard "origin/$BRANCH"

npm --prefix "$APP_DIR" ci
npm --prefix "$APP_DIR/app" ci
npm --prefix "$APP_DIR" run db:generate

(
  cd "$APP_DIR"
  npx prisma migrate deploy
)

npm --prefix "$APP_DIR" run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  NODE_ENV=production pm2 reload "$APP_NAME" --update-env
else
  NODE_ENV=production pm2 start "$APP_DIR/server.js" --name "$APP_NAME" --cwd "$APP_DIR" --time
fi

pm2 save
