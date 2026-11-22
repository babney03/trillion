#!/usr/bin/env bash
# Assemble AI clips (and optional music bed / end card) into one upload-ready Short.
#   pipeline/assemble.sh out.mp4 clip1.mp4 [clip2.mp4 ...] [--music bed.wav] [--music-gain 0.25] [--endcard card.png] [--endcard-s 2]
# - scales every clip to cover 1080x1920 (centre crop, so near-9:16 AI clips get no bars) @30fps, keeps each clip's own audio (AI clips carry sound)
# - optional music bed mixed under the clips at --music-gain
# - optional still end card (silent) after the last clip
# - normalizes to -14 LUFS / -1.5 dBTP (YouTube's playback loudness) and writes faststart MP4
set -euo pipefail
out="${1:?usage: assemble.sh out.mp4 clip1.mp4 [clip2.mp4 ...] [--music bed.wav] [--endcard card.png]}"; shift
clips=(); music=""; mgain="0.25"; card=""; cards="2"
while [ $# -gt 0 ]; do
  case "$1" in
    --music) music="$2"; shift 2;;
    --music-gain) mgain="$2"; shift 2;;
    --endcard) card="$2"; shift 2;;
    --endcard-s) cards="$2"; shift 2;;
    *) clips+=("$1"); shift;;
  esac
done
[ ${#clips[@]} -gt 0 ] || { echo "no clips"; exit 1; }

inputs=(); filt=""; n=0
for c in "${clips[@]}"; do
  inputs+=(-i "$c")
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$c" | grep -q .; then
    afilt="[$n:a]aresample=48000,aformat=channel_layouts=stereo[a$n];"
  else
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$c")
    afilt="anullsrc=r=48000:cl=stereo,atrim=0:$d[a$n];"
  fi
  filt+="[$n:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,setsar=1,format=yuv420p[v$n];$afilt"
  n=$((n+1))
done
if [ -n "$card" ]; then
  inputs+=(-loop 1 -t "$cards" -i "$card")
  filt+="[$n:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,setsar=1,format=yuv420p[v$n];anullsrc=r=48000:cl=stereo,atrim=0:$cards[a$n];"
  n=$((n+1))
fi
cat=""; for i in $(seq 0 $((n-1))); do cat+="[v$i][a$i]"; done
filt+="${cat}concat=n=$n:v=1:a=1[v][a0];"
if [ -n "$music" ]; then
  inputs+=(-i "$music")
  filt+="[$n:a]aresample=48000,volume=$mgain[bed];[a0][bed]amix=inputs=2:duration=first:dropout_transition=0[a1];[a1]loudnorm=I=-14:TP=-1.5:LRA=11[a]"
else
  filt+="[a0]loudnorm=I=-14:TP=-1.5:LRA=11[a]"
fi
ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filt" -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$out"
echo "wrote $out ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")s)"
