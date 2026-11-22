#!/usr/bin/env python3
"""Batch text-to-speech with Kokoro (free, offline after the first model download).

    /opt/tts/bin/python cartoons/kit/tools/tts.py jobs.json CACHE_DIR

jobs.json: [{"id", "text", "voice", "speed", "pitch", "check", "alts": [...]}, ...]
Writes CACHE_DIR/<id>.wav (24 kHz mono) for every job that isn't cached yet. The model loads once per run.

Clarity check: short lines ("Four!", "Bye-bye!") are where TTS mumbles. For jobs with check=true the
script tries the natural reading first, then slower / re-punctuated readings, then any `alts` spellings,
pitch-shifts each like the final mix will, and keeps the first one Whisper hears as the right words.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

jobs = json.load(open(sys.argv[1]))
cache = sys.argv[2]
os.makedirs(cache, exist_ok=True)
todo = [j for j in jobs if not os.path.exists(os.path.join(cache, j["id"] + ".wav"))]
if not todo:
    print(f"tts: all {len(jobs)} lines cached")
    sys.exit(0)

import warnings
warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf
from kokoro import KPipeline

pipes = {}
asr = None
NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}
norm = lambda s: [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ")).split()]


def speak(text, voice, speed):
    lang = voice[0]
    if lang not in pipes:
        pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    chunks = [np.asarray(r.audio) for r in pipes[lang](text, voice=voice, speed=speed)]
    return np.concatenate(chunks) if chunks else np.zeros(2400, dtype=np.float32)


def heard(audio, pitch):
    global asr
    if asr is None:
        from faster_whisper import WhisperModel
        asr = WhisperModel("small.en", device="cpu", compute_type="int8")
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        sf.write(a, audio, 24000)
        r = 2 ** (pitch / 12)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", f"asetrate={24000 * r},aresample=16000,atempo={1 / r:.5f}", "-ac", "1", b], check=True)
        y, _ = sf.read(b, dtype="float32")
    segs, _ = asr.transcribe(y, language="en", beam_size=5)
    return " ".join(s.text for s in segs).strip()


for j in todo:
    v, sp, text = j["voice"], float(j.get("speed", 1.0)), j["text"]
    audio, note = None, ""
    if j.get("check"):
        want = norm(j.get("expect", text))
        base = text.rstrip("!.?")
        # prefer takes that keep the natural pace (timing matters: counts land on the beat), slow down last
        cands = [(text, sp), (base + ".", sp)] + [(alt, sp) for alt in j.get("alts", [])] + [(text, sp * 0.88), (base + ".", sp * 0.88)]
        cands += [(alt, sp * 0.88) for alt in j.get("alts", [])] + [(text, sp * 0.78), (base + "!", sp * 0.72), (base + "?", sp * 0.72)]
        try:
            for i, (t, s) in enumerate(cands):
                a = speak(t, v, s)
                h = heard(a, j.get("pitch", 0))
                if all(w in norm(h) for w in want):
                    audio = a
                    note = "" if i == 0 else f"  (clearer take: \"{t}\" at speed {s:.2f})"
                    break
            if audio is None:
                note = "  (! no take was heard clearly; kept the natural one)"
        except Exception as e:  # Whisper missing: just use the natural reading
            note = f"  (clarity check skipped: {e})"
    if audio is None:
        audio = speak(text, v, sp)
    sf.write(os.path.join(cache, j["id"] + ".wav"), audio, 24000)
    print(f"tts: {j['id']}  {len(audio) / 24000:.2f}s  {v}  \"{text}\"{note}")
