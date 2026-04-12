#!/bin/sh
set -eu

exec /app/lib/io.github.ShaunRoselt.Calculator/Calculator/Calculator --no-sandbox "$@"