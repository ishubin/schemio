#!/bin/bash

latestTag=`git tag | sort -V -r | head -n 1`

if [[ ! -n "$latestTag" ]]; then
    >&2 echo "Can't find latest git tag"
    exit 1
fi

git log --pretty=format:"%s" HEAD...$latestTag


