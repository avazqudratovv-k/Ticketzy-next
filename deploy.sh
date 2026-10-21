#!/bin/bash
set -e

# PRODUCTION
cd "$(dirname "$0")"

BRANCH=master

git reset --hard
git checkout "$BRANCH"
git pull origin "$BRANCH"

# The container builds the site when it starts, so recreate it to pick up the new code
docker compose up -d --force-recreate
