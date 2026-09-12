# BMW X4 F26 studio · asset notices

## Vehicle model

`x4-f26-2016.glb` was supplied by the site owner: a publicly downloadable GTA San Andreas vehicle
mod converted locally to glTF and corrected against BMW's published F26 drawings.

- Source listing: https://www.gtaall.com/gta-san-andreas/cars/232956-bmw-x4-f26.html
- The archive credits **Santa Claus | MTA CAR**. **No clear standalone commercial or
  redistribution licence accompanies it**, and contributor credit does not establish the underlying
  rights. The original author's plate mesh is retained in the model as visible attribution.
- BMW, X4 and xDrive marks belong to BMW AG. This page is a personal, non-commercial educational
  display, published at the site owner's direction, and will be taken down on request from any
  rights holder.

### What was changed from the source

Recorded in `model-provenance.json` and `x4-f26-2016.validation.json`:
dimensions corrected to BMW's July 2014 figures (4.671 m long, 1.881 m body width, 1.624 m high,
2.810 m wheelbase, 861 mm front and 1000 mm rear overhang), body width measured separately from
mirrors and both mirrors moved inboard 24 mm; wheels and tyres uniformly scaled to a 351.5 mm
nominal radius and grounded; a duplicate interior assembly removed (51,056 triangles, each verified
present in the retained assembly); the missing game lamp texture replaced with PBR materials while
keeping the original lamp geometry; the xDrive35d door lettering removed and a single vehicle-left
oval exhaust added to match the xDrive20i layout.

### Remaining limitations

The source carries M Sport bodywork and its own wheel design, so the exact stock xDrive20i bumper,
wheel, upholstery, steering side and optional equipment are **not** claimed to match any specific
car. The exhaust outlet and connector are approximate reconstructions. Game materials were adapted
to physically based rendering, so appearance is a reconstruction rather than CAD. The part
explosion separates visual meshes and is not a service procedure.

## Lighting environments

Shared Poly Haven CC0 HDRIs in `assets/studio/environments/` (see `assets/gt3/NOTICES.md`).
The HDR files bundled in the supplied package were **not** used, because their rights are unverified.
