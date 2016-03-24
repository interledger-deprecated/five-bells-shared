#!/bin/bash

set -ex pipefail

npmPublish() {
  npm publish
}

currentVersion() {
  grep version <package.json | sed 's/[^0-9.]*\([0-9.]*\).*/\1/' | head -n 1
}

currentProject() {
  npm ls --depth=-1 | head -1 | cut -f 1 -d " " | sed 's/@.*//'
}

checkVersion() {
  local gitTag
  gitTag=$(git describe --tags)

  if [ "v$(currentVersion)" != "$gitTag" ]; then
    echo 'Current tag does not match package version. Skipping npm publish'
    exit 0
  fi
}

checkIsPublished() {
  if [ -n "$(npm info "$(currentProject)"@"$(currentVersion)")" ]; then
    echo 'Already published. Skipping npm publish'
    exit 0
  fi
}

checkVersion
checkIsPublished
npmPublish
