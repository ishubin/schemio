#!/bin/bash

set -e

mkdir -p ~/.ssh/
echo "$DRIVE_SERVER_KEY" > ~/.ssh/driveserver.key
sudo chmod 600 ~/.ssh/driveserver.key

rsync -e "ssh -o StrictHostKeyChecking=no" dist/drive-app "$DRIVE_SERVER_ENDPOINT"