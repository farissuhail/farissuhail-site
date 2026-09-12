# Original approximate Sharan 2012 reference cabin

Created 2026-09-12 for the user's local Volkswagen Sharan 7N reference studio.

`sharan-2012-reference-cabin.glb` is original procedural geometry created for this task. It is a simplified visual approximation, not Volkswagen factory CAD or an extracted game interior. No third-party mesh, texture, font or source code is embedded. The generator, `build_cabin.py`, uses only the Python standard library and includes an independent preview renderer.

## Reference and interpretation

The visual reference is Volkswagen's official Sharan archive, specifically the 2011 interior photographs **DB2011AU00943** and **DB2011AU00944**:

https://www.volkswagen-newsroom.com/en/images/albums/sharan-archive-2133


The seating arrangement is 2+3+2. Seat cushions, backrests, side bolsters and headrests use softened, tapered geometry with separate center inserts, headrest posts and subtle piping. Door inner panels have layered trim, armrests, handles and lower pockets. Seats remain separate named mesh parts.

Dimensions and locations are inferred reference proportions supplied for this task, not measured seat or cabin drawings. Pedals, roof liner, complete belts, sliding-door mechanisms, hidden structural parts and exact OEM surface details are omitted. The front headrest and instrument proportions, seat contours and control positions are illustrative. This asset should be labeled **“Approximate seven-seat reference cabin”** when shown to the user.

## Integration

- Metres, Y up, +Z forward, +X toward the vehicle's left side.
- Vehicle left is the right side of an image viewed head-on from the front. The steering wheel is at X +0.38.
- Front seat cushion centers: X ±0.38, Y 0.65, Z +0.40.
- Second-row centers: X +0.50 / 0 / -0.50, Y 0.675, Z -0.50.
- Third-row centers: X ±0.32, Y 0.59, Z -1.35.
- Cabin floor interior width is 1.48 m; molded door panels extend to X ±0.7925 m.
- Maximum height is 1.4675 m, below the requested 1.74 m exterior roof.
- The asset has no animations, textures or external dependencies.
- Every mesh and node includes `extras.component = "cabin"` and `extras.approximate = true`.
- Root node records seating, units and coordinate conventions. Mesh names identify their intended parts in plain English.

Recreate the GLB and front preview with `python build_cabin.py`. Add `--rear-preview` to create a rear-facing preview showing the dashboard. Both modes write identical geometry.

The unrelated exterior mod's provenance and permissions are separate from this original cabin. This file does not make a licensing assertion about that exterior asset.