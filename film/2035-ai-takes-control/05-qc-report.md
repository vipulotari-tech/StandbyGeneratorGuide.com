# QC REPORT — verified 2026-10-14 (nothing below is claimed without a check)

## ✅ Actually verified in this environment
- Storyboard: `storyboard-shot-list.csv` contains **91 shots / 13 scenes**; generator confirmed scene windows sum to **810 s (13:30)**.
- Subtitles: `subtitles/subtitles-hi.srt` generated with **102 cues** spanning 00:00:00–00:13:30 on the timing map.
- Screenplay: all 13 scenes present with every major beat from the brief (shutdown, warning, Ishaan, father's voice, corporate directive, truth, tunnel, closing door, countdown, humanity montage, NIRA's choice, sunrise + “क्या मैं सीख सकती हूं?” hook).
- Scene-1 animatic preview rendered and **verified by full decode**: `exports/SCENE-01-ANIMATIC-PREVIEW.mp4` — 77.66 s, 1920×1080, 24 fps, H.264/AAC; Hindi VO takes measured (28.06 + 34.70 + 6.43 + 8.62 s). It is a slow-pan keyframe animatic, **not** final 3D animation.
- Assets on disk: `thumbnail.jpg`, `character-aanaya-reference.jpg`, `character-nira-reference.jpg`, `keyframe-scene01-city-shutdown.jpg` (AI-generated, original designs, no logos/watermarks requested).
- Spoken-word count of the condensed subtitle text: ~1,321 words; the full screenplay narration+dialogue is the recording script and must be counted again from the recorded takes.

## ❌ NOT done — do not claim otherwise
- **Final MP4: not rendered.** No 3D animation engine, lip-sync, or film renderer exists in this repo environment; duration/resolution/frame-rate of a finished film therefore **cannot** be certified yet (targets: ≥10:00, ≈13:30, 3840×2160 or 1920×1080, 24 fps, 16:9).
- Hindi VO: only Scene 1 recorded (above); Scenes 2–13 not yet recorded; full-film lip-sync, voice consistency, and mix levels (-14 LUFS / -1 dBTP) are unverified until Phase B–D.
- The SRT is a timing-map draft — re-time it to the actual VO takes before upload; subtitle sync is **not** yet frame-accurate.
- Thumbnail text (“AI ने सबको कैद कर लिया!”) still to be typeset over `assets/thumbnail.jpg`.
- Character expression/turnaround sheets (front/side/three-quarter) still to be generated from the two reference images before shot production; cross-scene identity can only be verified after shots are rendered.

## Final acceptance checklist (run after render)
Story beats land every 30–60 s · characters identical in all scenes · natural Hindi, distinct stable voices · lip-sync on dialogue close-ups · music under dialogue, no clipping · no anatomical/prop errors · plays start-to-finish · actual duration ≥10:00 (≈13:30) · 16:9, consistent fps/resolution · SRT matches audio · no missing/duplicated scenes · fiction disclaimer in description.
