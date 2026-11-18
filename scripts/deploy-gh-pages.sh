#!/usr/bin/env bash
# Deploy manual alternativo: publica dist/ en la rama gh-pages.
# Se usa sólo si no está disponible el workflow de GitHub Actions.
set -euo pipefail
npm run build
cd dist
touch .nojekyll
git init -q -b gh-pages
git add -A
git commit -q -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Publicado en la rama gh-pages."
