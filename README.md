# Tanay Mishra’s portfolio

A self-contained static website for TM-175.github.io. The homepage, project pages, fonts, and artwork all live in this directory.

## Preview locally

Open `index.html` directly, or run `python3 -m http.server 8000 --bind 127.0.0.1` from this directory and visit `http://127.0.0.1:8000/`.

## GitHub Pages

Use the contents of this directory as the root of the `TM-175/TM-175.github.io` repository. Select **Settings → Pages → Deploy from a branch**, choose the branch containing these files, then choose **/(root)**. The site needs no package installation or build command. [GitHub’s publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Editing

- Edit the introduction, research, experience, and project summaries in `index.html`. The six project write-ups live in `projects/`.
- Edit layout and typography in `assets/site.css`. The animation controls and project index view live in `assets/site.js`.
- The Pittsburgh circuit has two locally rendered maps. Landmark names, coordinates, descriptions, and animation frames are in `assets/circuit-data.js`. The route captions and playback controls are in `assets/site.js`. Each view includes a standalone still image.
- Deviate and Velocity Dash use Tanay’s product screenshots. The track analysis and InkTex visuals are illustrations. The licenses for the self-hosted Inter and IBM Plex Mono fonts are in `assets/fonts/`.

## Pittsburgh circuit geography

The downtown miniature spans the Golden Triangle and North Shore. Its fictional car loop uses 6th Street, the Roberto Clemente Bridge, Federal Street, East General Robinson Street, Anderson Street, the Rachel Carson Bridge, 9th Street, and Fort Duquesne Boulevard.

The campus miniature is drawn at a larger scale in Oakland. Its car follows the Sweepstakes course from Margaret Morrison and Tech streets through Schenley Park to the finish on Frew Street. The illustrated run restarts on Tech Street. Start and finish markings are approximate. [CMU Buggy Alumni Association course description](https://cmubuggy.org/news/reference/course/) · [Official CMU campus map](https://www.cmu.edu/sites/default/files/cmu-visit-site-files/2025-08/campus-map.pdf)

Both scenes use locally projected building footprints, mapped street centerlines, and river or lawn boundaries from OpenStreetMap. Terrain elevations shape the ground relief. Building heights use mapped values where available and estimates elsewhere. Landmarks, windows, bridge superstructures, and the red car are drawn at pixel-art scale.

Map data © OpenStreetMap contributors, available under the Open Database License. The route geometry and map-derived landmark positions in `assets/circuit-data.js` are available under the same license. [OpenStreetMap attribution and license](https://www.openstreetmap.org/copyright)

United States terrain data courtesy of the U.S. Geological Survey, via Mapzen Terrain Tiles, accessed November 18, 2026. [Terrain Tiles dataset](https://registry.opendata.aws/terrain-tiles/) · [Terrain attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
