#!/bin/bash
# Fabrique les démos MP3 (~32 s) et les spectrogrammes avant/après à partir des WAV rendus.
set -e; cd /workspace/neon-quebec/audio-demo; W=wav
for who in before after; do
  ffmpeg -y -loglevel error \
    -ss 2 -t 5 -i $W/$who-titre.wav -ss 18 -t 6 -i $W/$who-vq.wav -ss 18 -t 5 -i $W/$who-sr.wav -ss 18 -t 5 -i $W/$who-lm.wav \
    -ss 18 -t 5 -i $W/$who-pt.wav -ss 11 -t 6 -i $W/$who-boss.wav -ss 3 -t 5 -i $W/$who-boutique.wav \
    -filter_complex "[0][1]acrossfade=d=0.4[a];[a][2]acrossfade=d=0.4[b];[b][3]acrossfade=d=0.4[c];[c][4]acrossfade=d=0.4[d];[d][5]acrossfade=d=0.4[e];[e][6]acrossfade=d=0.4,afade=t=out:st=34:d=1.5[o]" \
    -map "[o]" $W/$who-demo.wav
  ffmpeg -y -loglevel error -i $W/$who-demo.wav -codec:a libmp3lame -b:a 160k remparts-neon-$who.mp3
  ffmpeg -y -loglevel error -i $W/$who-demo.wav -lavfi "showspectrumpic=s=1400x500:legend=1:scale=log:fscale=log:color=intensity:start=30:stop=16000" spectrogramme-$who.png
done
ls -la /workspace/neon-quebec/audio-demo/*.mp3 /workspace/neon-quebec/audio-demo/*.png
