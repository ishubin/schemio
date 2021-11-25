#!/bin/bash

set -e

PROJECT_DIR=$(pwd)

function echo_section() {
    echo "--------------------------------------------"
    echo $1
    echo "--------------------------------------------"
}

function readVersion() {
    echo -n "Type new version: "
    read NEW_VERSION
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


CURRENT_VERSION=$(cat package.json | jq -r .version)

echo "Current version is: $CURRENT_VERSION"

NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

echo -n "Proposed new version: $NEW_VERSION [Y/n] ? "
read ANSWER

if echo "$ANSWER" | grep -iq '[Nn]o*'  ;then 
    readVersion
fi

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


echo_section "Building docker container"
# changing package version to hardcoded value so that docker build does not rebuild all layers
cat package.json | jq ".version=\"0.1.1\"" > tmp && mv tmp package.json
DOCKER_CONTAINER="schemio:$NEW_VERSION"
PUBLIC_DOCKER_TAG="binshu/schemio:$NEW_VERSION"
docker build -t "$DOCKER_CONTAINER" .
docker tag "$DOCKER_CONTAINER" "$PUBLIC_DOCKER_TAG"


echo_section "Updating package.json"
cat package.json | jq ".version=\"$NEW_VERSION\"" > tmp && mv tmp package.json
git add package.json
git commit -m "Updated version to $NEW_VERSION"
git push

echo_section "Creating a git tag for version: $NEW_VERSION"
NEW_TAG="v$NEW_VERSION"
git tag "$NEW_TAG"
git push origin --tags

echo_section "Publishing release on GitHub"

gh release create $NEW_TAG dist/release/*.zip --title "Released version $NEW_VERSION"


echo_section "Done"
echo "You can push docker container to docker hub now using the following command:"
echo ""
echo "   docker login --username=binshu && docker push $PUBLIC_DOCKER_TAG"