#/bin/bash

LICENSE_KEYWORD="Mozilla"


for file in $(find src -type f -name '*.js'); do
    if ! grep -q "$LICENSE_KEYWORD" "$file"
    then
        echo "Adding license header to $file"
        cat .license.header.js $file > tmp.file && mv tmp.file $file
    fi
done

for file in $(find src -type f -name '*.vue'); do
    if ! grep -q "$LICENSE_KEYWORD" "$file"
    then
        echo "Adding license header to $file"
        cat .license.header.vue $file > tmp.file && mv tmp.file $file
    fi
done
