#!/bin/bash

cd /www/masoncards
git pull
/usr/bin/docker compose -f docker-compose.staging.yml up --build --detach

