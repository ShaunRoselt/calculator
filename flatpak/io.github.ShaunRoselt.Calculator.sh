#!/bin/sh
set -eu

exec "/app/lib/io.github.ShaunRoselt.Calculator/Roselt Calculator/calculator" --no-sandbox "$@"
