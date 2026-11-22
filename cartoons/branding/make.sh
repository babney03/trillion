#!/usr/bin/env bash
# Render the channel art: branding/banner.png (2560x1440) and branding/avatar.png (1080x1080)
set -e
here="$(cd "$(dirname "$0")" && pwd)"; kit="$here/../kit"
for kind in banner avatar; do
  d="$here/.build-$kind"; mkdir -p "$d/kit"
  cp -r "$kit/engine" "$d/"; cp "$kit/lib/"*.js "$d/kit/"; cp "$here/src/film.js" "$d/"
  fmt=$([ $kind = banner ] && echo "[2560, 1440]" || echo "'1:1'")
  cat > "$d/score.js" <<SC
(function(){const node=typeof require!=='undefined';const U=node?require('./engine/util'):globalThis.U;
const FORMAT=$fmt;const [W,H]=U.formatSize(FORMAT);const S={FPS:30,FORMAT,W,H,SAFE:U.safeArea(W,H),DURATION:1,markers:{}};
if(node)module.exports=S;else globalThis.SCORE=S;})();
SC
  sed -e 's#<script src="voice-lengths.js"></script>##' -e 's#<script src="kit/score-kit.js"></script>##' -e 's#<script src="kit/actors.js"></script>##' -e 's#<script src="kit/sets.js"></script>#<script src="kit/sets.js"></script>#' -e 's#<script src="kit/film.js"></script>#<script src="film.js"></script>#' -e 's#<!--CUSTOM-->##' "$kit/template/index.html" > "$d/index.html"
  (cd "$d" && node engine/render.js stills 0.5 >/dev/null && cp out/stills/t_000.50.png "$here/$kind.png")
  rm -rf "$d"
  echo "wrote branding/$kind.png"
done
