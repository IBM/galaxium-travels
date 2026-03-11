#!/bin/sh
set -e

# Replace environment variables in JavaScript files at runtime
# This allows changing API URL without rebuilding the image
if [ -n "$VITE_API_URL" ]; then
    echo "Injecting VITE_API_URL: $VITE_API_URL"
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i.bak "s|VITE_API_URL_PLACEHOLDER|$VITE_API_URL|g" {} \; -exec rm {}.bak \;
fi

# Execute the CMD
exec "$@"
