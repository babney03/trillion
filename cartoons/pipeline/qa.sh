#!/usr/bin/env bash
# QA gate: every video must pass this before it is uploaded.
#   pipeline/qa.sh path/to/video.mp4
# Checks: vertical 9:16, >= 720px wide, 10-180 s (YouTube Shorts limit), has audio,
# loudness -16..-12 LUFS, true peak <= -1 dBTP, something moves in the first second.
# Writes <video>.sheet.png (16 frames) for a visual review (Claude reads it to catch AI glitches:
# morphing faces, extra limbs, outfit changes, text artifacts).
set -euo pipefail
f="${1:?usage: qa.sh video.mp4}"
fail=0
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }

IFS=x read -r W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$f")
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | head -1)
echo "QA $f  (${W}x${H}, ${DUR}s)"

ratio=$(awk -v w="$W" -v h="$H" 'BEGIN{printf "%.3f", w/h}')
awk -v r="$ratio" 'BEGIN{exit !(r>0.55 && r<0.58)}' && ok "aspect 9:16 ($ratio)" || bad "aspect is $ratio, need 9:16 (0.5625)"
[ "$W" -ge 720 ] && ok "width ${W}px" || bad "width ${W}px < 720"
awk -v d="$DUR" 'BEGIN{exit !(d>=10 && d<=180)}' && ok "duration ${DUR}s" || bad "duration ${DUR}s outside 10-180s"

if [ -n "$HAS_A" ]; then
  ok "has audio"
  LOUD=$(ffmpeg -nostats -hide_banner -i "$f" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{i=$2} s&&/Peak:/{p=$2} END{print i, p}')
  read -r LUFS TP <<<"$LOUD"
  awk -v l="$LUFS" 'BEGIN{exit !(l>=-16 && l<=-12)}' && ok "loudness ${LUFS} LUFS" || bad "loudness ${LUFS} LUFS (target -14; fix with assemble.sh)"
  awk -v p="$TP" 'BEGIN{exit !(p<=-1.0)}' && ok "true peak ${TP} dBTP" || bad "true peak ${TP} dBTP > -1.0"
else
  bad "no audio stream"
fi

# motion in the first second (hook): mean absolute frame difference over frames 1-30
MOTION=$(ffmpeg -v error -t 1 -i "$f" -vf "scale=160:-2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null | awk -F= '/YAVG/{s+=$2;n++} END{if(n) printf "%.2f", s/n; else print 0}')
awk -v m="$MOTION" 'BEGIN{exit !(m>=0.4)}' && ok "first-second motion ${MOTION}" || bad "first second is too still (${MOTION}); open on movement"

ffmpeg -v error -y -i "$f" -vf "fps=16/${DUR},scale=200:-2,tile=8x2:padding=4:color=white" -frames:v 1 "${f%.*}.sheet.png"
ok "contact sheet ${f%.*}.sheet.png (review it for glitches)"

[ "$fail" -eq 0 ] && echo "PASS" || { echo "FAIL"; exit 1; }
