#!/bin/bash

DIST="dist/drive-app"
DIST_ASSETS="$DIST/assets"

clean_file() {
    file=$1
    if [ -f "$file" ]; then
        rm "$file"
    fi
}

npm run build-app-drive-prod

mkdir -p $DIST_ASSETS
rm -rf $DIST_ASSETS/*
cp -r assets/* $DIST_ASSETS/
cp dist/assets/schemio.app.drive.js $DIST_ASSETS/
clean_file $DIST_ASSETS/schemio.app.js

cp html/index-drive.html $DIST/index.html