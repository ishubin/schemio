#!/bin/bash

# make sure the electron-icon-maker is installed: https://www.npmjs.com/package/electron-icon-maker

electron-icon-maker --input=design/app-icons/schemio-app-icon.png --output=design/app-icons/
cp design/app-icons/icons/win/icon.ico design/app-icons/icons/all/.
cp design/app-icons/icons/mac/icon.icns design/app-icons/icons/all/.
cp design/app-icons/icons/png/1024x1024.png design/app-icons/icons/all/icon.png
