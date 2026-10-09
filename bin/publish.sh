#!/bin/bash

# Build and publish a Docker image for one workspace.
# Usage: ./bin/publish.sh <app> [tag] [extra-tag...]
# Example: ./bin/publish.sh masoncards v1.0.0 production
# If no tag is provided, the current git commit hash is used.
#
# Set REGISTRY_USERNAME and REGISTRY_PASSWORD to log in non-interactively.
# Set PUSH_IMAGE=false to build without pushing.
#
# THIS IS A HACKED NON MONOREPO VERSION FOR LEGACY PURPOSES ONLY --CLP

set -euo pipefail

APP=${1:?usage: publish.sh <app> [tag] [extra-tag...]}

# Use provided tag or default to current git commit hash
TAG=${2:-$(git rev-parse HEAD)}

# Remaining args are additional tags
shift $(($# >= 2 ? 2 : 1))
EXTRA_TAGS=("$@")

REGISTRY="registry.speechanddebate.org"
IMAGE="${REGISTRY}/nsda/${APP}"

ALL_TAGS=("${TAG}" "${EXTRA_TAGS[@]}")

# Build from the monorepo root so npm workspaces resolve the @speechanddebate/* aliases
cd "$(dirname "$0")/.."

if [[ ! -f "./Dockerfile" ]]; then
  echo "No Dockerfile for '${APP}'" >&2
  exit 1
fi

TAG_ARGS=()
for t in "${ALL_TAGS[@]}"; do
  TAG_ARGS+=(-t "${IMAGE}:${t}")
  echo "Building ${IMAGE}:${t}"
done

docker build \
  --build-arg NODE_ENV=production \
  --build-arg APP_VERSION="${TAG}" \
  -f "./Dockerfile" \
    "${TAG_ARGS[@]}" \
  .

if [[ "${PUSH_IMAGE:-true}" != "true" ]]; then
  echo "PUSH_IMAGE is not true, skipping push"
  exit 0
fi

echo "Logging in to Docker registry ${REGISTRY}..."
if [[ -n "${REGISTRY_PASSWORD:-}" ]]; then
  echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY}" --username "${REGISTRY_USERNAME}" --password-stdin
else
  docker login "${REGISTRY}"
fi

for t in "${ALL_TAGS[@]}"; do
  echo "Pushing ${IMAGE}:${t}..."
  docker push "${IMAGE}:${t}"
done

echo "Successfully published ${IMAGE} (${ALL_TAGS[*]})"
