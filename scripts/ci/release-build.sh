#!/bin/bash

set -e

NEW_VERSION=$1
PROJECT_DIR=$(pwd)

git config --global user.name 'Ivan Shubin'
git config --global user.email 'ivan.ishubin@gmail.com'


function echo_section() {
    echo "--------------------------------------------"
    echo $1
    echo "--------------------------------------------"
}

function copy_doc_files() {
    cp $PROJECT_DIR/README.md .
    cp $PROJECT_DIR/LICENSE .
}

function copy_project_file() {
    cp -r "$PROJECT_DIR/$1" .
}

function copy_standard_assets() {
    copy_project_file dist/assets/schemio-standalone.js
    copy_project_file assets/schemio-standalone.html
    copy_project_file assets/schemio-standalone.css
    copy_project_file assets/main.css
    copy_project_file assets/css
    copy_project_file assets/images
    copy_project_file assets/webfonts
}


echo "Going to use new version: $NEW_VERSION"

echo_section "Running tests"
npm test

echo "Cleaning dists folder"
rm -rf dists/*

echo_section "Building app"
npm run build-app-prod

echo_section "Building component"
npm run build-component-prod

echo_section "Building static app"
npm run build-ui-static-app-prod


echo_section "Building release assets"

mkdir -p dist/release
rm -rf dist/release/*


BIN_FOLDER_NAME="schemio-$NEW_VERSION"
BIN_FOLDER_PATH="$PROJECT_DIR/dist/release/$BIN_FOLDER_NAME"
mkdir "$BIN_FOLDER_PATH"
cd "$BIN_FOLDER_PATH"
copy_doc_files
copy_project_file dist/assets/schemio.js
copy_standard_assets
copy_project_file html/index.html
cd $PROJECT_DIR/dist/release
zip -9 -r "schemio-$NEW_VERSION.zip" $BIN_FOLDER_NAME


cd $PROJECT_DIR
BIN_FOLDER_NAME="schemio-static-$NEW_VERSION"
BIN_FOLDER_PATH="$PROJECT_DIR/dist/release/$BIN_FOLDER_NAME"
mkdir "$BIN_FOLDER_PATH"
cd "$BIN_FOLDER_PATH"
copy_doc_files
copy_project_file dist/assets/schemio.app.static.js
copy_standard_assets
cp $PROJECT_DIR/html/index-static.html $BIN_FOLDER_PATH/index.html
cd $PROJECT_DIR/dist/release
zip -9 -r "schemio-static-$NEW_VERSION.zip" $BIN_FOLDER_NAME
cd $PROJECT_DIR


echo_section "Building drive app for prod"
./build-drive-app.sh

cat package.json | jq ".version=\"$NEW_VERSION\"" > tmp && mv tmp package.json
git add package.json
git commit -m "Updated version to $NEW_VERSION"
git push

echo_section "Creating a git tag for version: $NEW_VERSION"
NEW_TAG="v$NEW_VERSION"
git tag "$NEW_TAG"
git push origin --tags