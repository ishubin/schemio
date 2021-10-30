#/bin/bash


for file in $(find src -type f -name '*.js'); do
    if ! grep -q Mozilla "$file"
    then
        echo "Adding license header to $file"
        cat .license.header.js $file > tmp.file && mv tmp.file $file
    fi
done
