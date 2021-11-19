#!/bin/bash

set -e

function echo_section() {
    echo "--------------------------------------------"
    echo $1
    echo "--------------------------------------------"
}


function readVersion() {
    echo -n "Type new version: "
    read NEW_VERSION
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

echo_section "Building server part"
npm run build

echo_section "Building app"
npm run build-app-prod

echo_section "Building component"
npm run build-component-prod

echo_section "Building static app"
npm run build-ui-static-app-prod


echo_section "Updating package.json"
cat package.json | jq ".version=\"$NEW_VERSION\"" > tmp && mv tmp package.json
git add package.json
git commit -m "Updated version to $NEW_VERSION"
git push

echo_section "Creating a git tag for version: $NEW_VERSION"
NEW_TAG="v$NEW_VERSION"
git tag "$NEW_TAG"
git push origin --tags