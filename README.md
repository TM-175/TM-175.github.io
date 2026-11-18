# Tanay Mishra’s portfolio

A self-contained static website for TM-175.github.io. The homepage, project pages, fonts, and artwork all live in this directory.

## Preview locally

Open `index.html` directly, or run `python3 -m http.server 8000 --bind 127.0.0.1` from this directory and visit `http://127.0.0.1:8000/`.

## GitHub Pages

Use the contents of this directory as the root of the `TM-175/TM-175.github.io` repository. Select **Settings → Pages → Deploy from a branch**, choose the branch containing these files, then choose **/(root)**. The site needs no package installation or build command. [GitHub’s publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Editing

- Edit the introduction, research, experience, and project summaries in `index.html`. The six project write-ups live in `projects/`.
- Edit layout and typography in `assets/site.css`. The animation controls and project index view live in `assets/site.js`.
- The Pittsburgh circuit uses a transparent background, a prop atlas, and a 48-heading car sprite sheet. Its route and sprite coordinates are in `assets/circuit-data.js`. The homepage includes a still illustration for browsers with JavaScript disabled.
- Deviate and Velocity Dash use Tanay’s product screenshots. The track analysis and InkTex visuals are illustrations. The licenses for the self-hosted Inter and IBM Plex Mono fonts are in `assets/fonts/`.
