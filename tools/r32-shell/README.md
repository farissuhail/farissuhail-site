# R32 shell builder

Regenerates `assets/r32/golf-r32-mk5-2006-shell.glb` from stunner2211's Thingiverse STLs
(thing:2973517, CC BY-NC-SA 3.0 — see `assets/r32/NOTICES.md`).

```
npm init -y && npm i three@0.185.1
node build-r32.mjs <folder containing body.stl and wheel.stl> ../../assets/r32/golf-r32-mk5-2006-shell.glb
```

Tunable zones (glass band, grille, intake, lamps, wheel positions) are the `P` object at the top of the script.
