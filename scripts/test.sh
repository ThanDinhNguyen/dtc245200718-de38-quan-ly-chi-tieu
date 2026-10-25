#!/bin/sh
set -eu
. "$(dirname -- "$0")/common.sh"
dc exec -T -e BASE_URL=http://nginx:8080 app npm test
