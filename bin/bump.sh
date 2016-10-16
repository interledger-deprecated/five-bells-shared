#!/usr/bin/env bash

# http://www.tldp.org/LDP/abs/html/options.html
set -eo pipefail

INCREMENT="$1"

# http://stackoverflow.com/questions/1593051/how-to-programmatically-determine-the-current-checked-out-git-branch
checkOnMaster() {
  local branch_name
  branch_name="$(git symbolic-ref HEAD 2>/dev/null)"
  if [ "${branch_name}" = "refs/heads/master" ]; then
    printf "On master. Good to go.\n\n"
  else
    echo "Need to be on master to proceed."
    exit 1
  fi
}

# http://stackoverflow.com/questions/3258243/check-if-pull-needed-in-git
syncAndCheckWithRemote() {
  echo "Checking local is up to date with remote..."
  git remote update
  local mine
  local remote
  local base
  mine="$(git rev-parse @)"
  remote="$(git rev-parse "@{u}")"
  base="$(git merge-base @ "@{u}")"

  if [ "$mine" = "$remote" ]; then
    printf "Local branch up to date with master. Proceeding..\n\n"
  elif [ "$mine" = "$base" ]; then
    printf "Local not up to date. Need to pull.\n\n"
    read -rsp $'Press any key to continue... or CTRL+C to exit\n\n' -n1
  elif [ "$remote" = "$base" ]; then
    printf "Local is ahead of remote. Need to push.\n\n"
    exit 1
  else
    printf "Local diverged from remote\n\n"
    exit 1
  fi
}

checkChangesSinceCurrentVersion() {
  local currentVersion
  local changes
  currentVersion=$(npm view . version)
  changes=$(git --no-pager log v"$currentVersion".. --oneline --reverse)

  if [ "$INCREMENT" == "patch" ] || [ "$INCREMENT" == "minor" ]; then
    if echo "$changes" | grep --quiet BREAKING; then
      printf "There are breaking changes. Please bump the major version."
      exit 1
    fi
  fi

  if [ "$INCREMENT" == "patch" ]; then
    if echo "$changes" | grep --quiet FEATURE; then
      printf "There are new features. Please bump the major or minor version."
      exit 1
    fi
  fi

  printf "These are the changes since the last version\n\n"
  printf "%s\n\n" "$changes"
  read -rsp $'Press any key to continue... or CTRL+C to exit\n\n' -n1
}

unitTest() {
  npm test
}

checkCircleBuildStatus() {
  local circleApiResponse
  local status
  local projectName

  projectName=$(npm view . name)

  # Example API response
  # [{
  #   "previous_successful_build": null,
  #   "build_parameters": null,
  #   "reponame": "five-bells-ledger",
  #   "build_url": "https://circleci.com/gh/interledgerjs/five-bells-ledger/724",
  #   "failed": null,
  #   "branch": "master",
  #   "username": "interledger",
  #   "vcs_tag": null,
  #   "build_num": 724,
  #   "infrastructure_fail": false,
  #   "ssh_enabled": false,
  #   "committer_email": "alan@ripple.com",
  #   "previous": {
  #     "build_num": 723,
  #     "status": "fixed",
  #     "build_time_millis": 904645
  #   },
  #   "status": "running",
  #   "committer_name": "Alan Cohen",
  #   "dont_build": null,
  #   "lifecycle": "running",
  #   "no_dependency_cache": null,
  #   "stop_time": null,
  #   "build_time_millis": null,
  #   "vcs_url": "https://github.com/interledgerjs/five-bells-ledger",
  #   "author_email": "alan@ripple.com"
  #    ...
  # }]
  # See: https://circleci.com/docs/api#recent-builds-project-branch
  circleApiResponse=$(curl https://circleci.com/api/v1/project/interledger/"$projectName"/tree/master -H "Accept: application/json")

  status=$(echo "$circleApiResponse" | xargs -0 node -e "console.log(JSON.parse(process.argv[1])[0].status)")

  if [[ "$status" != "fixed" && "$status" != "success" ]]; then
    local buildUrl
    buildUrl=$(echo "$circleApiResponse" | xargs -0 node -e "console.log(JSON.parse(process.argv[1])[0].build_url)")
    printf "Build status is %s. Please check the build before proceeding.  %s\n\n" "$status" "$buildUrl"
    exit 1
  fi
}

# https://docs.npmjs.com/cli/version
versionCommitAndTag() {
  echo "Updating package.json..."
  case "$INCREMENT" in
    major)
      npm version major
      ;;
    minor)
      npm version minor
      ;;
    patch)
      npm version patch
      ;;
    *)
      echo "Usage npm run bump {major|minor|patch}"
      exit 1
  esac
}

pushCommitandTags() {
  printf "Pushing commit and tags...\n\n"
  git push --follow-tags
}

main() {
  checkOnMaster
  syncAndCheckWithRemote
  checkCircleBuildStatus
  checkChangesSinceCurrentVersion
  unitTest
  versionCommitAndTag
  pushCommitandTags
}

main
