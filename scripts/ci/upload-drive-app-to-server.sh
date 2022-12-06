#!/bin/bash

set -e

mkdir -p ~/.ssh/
echo "$DRIVE_SERVER_KEY" > ~/.ssh/driveserver.key
sudo chmod 600 ~/.ssh/driveserver.key

rsync -r -e "ssh -i ~/.ssh/driveserver.key -o StrictHostKeyChecking=no" dist/drive-app "$DRIVE_SERVER_USER@$DRIVE_SERVER_HOST:$DRIVE_SERVER_PATH"