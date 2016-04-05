#!/bin/bash

set -e
set -o pipefail

getCurrentVersion() {
  grep version <package.json | sed 's/[^0-9.]*\([0-9.]*\).*/\1/' | head -n 1
}

getCurrentProject() {
  npm ls --depth=-1 | head -1 | cut -f 1 -d " " | sed 's/@.*//'
}

getLatestTag() {
  git describe --abbrev=0 --tags
}

getCommitHash() {
  git rev-list -n 1 "$1"
}

checkHeadIsLatestTag() {
  if [ "$(getCommitHash HEAD)" != "$(getCommitHash "$(getLatestTag)")" ]; then
    echo 'HEAD does not match latest tag. Skipping npm publish'
    exit 0
  fi
}

checkCurrentVersionIsLatestTag() {
  if [ "v$(getCurrentVersion)" != "$(getLatestTag)" ]; then
    echo 'Current tag does not match package version. Skipping npm publish'
    exit 0
  fi
}

checkIsNotPublished() {
  if [ -n "$(npm info "$(getCurrentProject)"@"$(getCurrentVersion)")" ]; then
    echo 'Already published. Skipping npm publish'
    exit 0
  fi
}

npmPublish() {
  mv npmrc-env .npmrc
  npm publish
}

checkHeadIsLatestTag
checkCurrentVersionIsLatestTag
checkIsNotPublished
npmPublish
