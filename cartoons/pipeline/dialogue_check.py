#!/usr/bin/env python3
"""Hear what an AI-generated clip actually says (its voices are generated with the video, not scripted).

    /opt/tts/bin/python cartoons/pipeline/dialogue_check.py clip.mp4 "No! It's mine!" "Let's take turns, Biscuit!"

Prints Whisper's timed transcript of the clip and, for each expected line, whether it was heard
(all its words present, in order, ignoring punctuation and interjections). Exit code 1 if a line is missing.
"""
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

clip, expected = sys.argv[1], sys.argv[2:]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", clip, "-map", "0:a:0", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)
model = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = model.transcribe(audio, language="en", beam_size=5, vad_filter=True)
INTERJ = {"uh", "oh", "um", "hmm", "mm", "aw", "yay", "woo", "wow", "ooh", "ah", "ha", "haha", "hooray"}
norm = lambda s: [w for w in re.sub(r"[^a-z0-9' ]", "", s.lower().replace("-", " ")).split() if w not in INTERJ]
heard = []
for s in segs:
    print(f"  {s.start:5.2f}-{s.end:5.2f}  {s.text.strip()}")
    heard += norm(s.text)
missing = 0
for line in expected:
    want, i = norm(line), 0
    for w in heard:
        if i < len(want) and w == want[i]:
            i += 1
    ok = i == len(want)
    missing += not ok
    print(f"  {'OK ' if ok else 'MISSING'} \"{line}\"")
sys.exit(1 if missing else 0)
