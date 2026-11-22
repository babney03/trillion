#!/usr/bin/env python3
"""Voice QA: transcribe every spoken line with Whisper and compare it with the script.

    /opt/tts/bin/python cartoons/kit/tools/asr_check.py <episode_dir>

Reads out/.voice/*.f32 (48 kHz mono, the exact audio placed in the film) via the line list that
the voice pass leaves in out/.voice/lines.json. Uses Whisper small.en (base.en mis-hears one-word clips). Flags lines whose words differ from the script (so a
mispronounced name or a garbled word is caught without anyone listening).
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

ep = sys.argv[1]
cache = os.path.join(ep, "out", ".voice")
lines = json.load(open(os.path.join(cache, "lines.json")))
model = WhisperModel("small.en", device="cpu", compute_type="int8")  # base.en guesses wildly on one-word clips
NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}
# Whisper spells interjections inconsistently ("uh-oh" -> "uso", "mmm" -> "hmm"): don't score them
INTERJ = {"uh", "oh", "uhoh", "uso", "um", "hmm", "mm", "mmm", "aw", "aww", "yay", "woo", "wow", "ooh", "ah", "ha", "hooray"}
norm = lambda s: [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ")).split() if w not in INTERJ]


def wer(ref, hyp):
    d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        d[i][0] = i
    for j in range(len(hyp) + 1):
        d[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]))
    return d[-1][-1] / max(1, len(ref))


bad = 0
for ln in lines:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", "48000", "-ac", "1", "-i", os.path.join(cache, ln["file"]), "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x16 = np.frombuffer(raw, dtype=np.float32)
    segs, _ = model.transcribe(x16, language="en", beam_size=5, initial_prompt="Pip and Biscuit.")
    hyp = " ".join(s.text for s in segs).strip()
    e = wer(norm(ln["text"]), norm(hyp))
    flag = "OK " if e <= 0.25 else "BAD"
    bad += e > 0.25
    print(f"  {flag} {ln['who']:9s} wer {e:4.2f}  script: \"{ln['text']}\"  heard: \"{hyp}\"")
print(f"voice check: {len(lines) - bad}/{len(lines)} lines clear")
sys.exit(1 if bad else 0)
