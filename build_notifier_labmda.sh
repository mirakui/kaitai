#!/bin/bash -xe

rm -rf lambda/notifier
rm -f lambda/notifier.zip

mkdir -p lambda/notifier

npx tsc
cp -r build/* lambda/notifier/
cp package.notifier.json lambda/notifier/package.json

cd lambda/notifier
yarn install --prod

cd ..
zip -r notifier.zip notifier