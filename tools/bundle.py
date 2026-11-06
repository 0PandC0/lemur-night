"""Optional: build a single self-contained HTML file (code + font inlined) into dist/lemur-night.html.
Handy for uploading to itch.io or anywhere that wants one file. Needs Node:  npm i esbuild"""
import base64, os, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
js = subprocess.run(["npx", "esbuild", "src/main.js", "--bundle", "--format=iife", "--minify"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
font = base64.b64encode(open(os.path.join(ROOT, "assets/fonts/silkscreen.woff2"), "rb").read()).decode()
css = open(os.path.join(ROOT, "style.css")).read().replace('url("assets/fonts/silkscreen.woff2")', f'url(data:font/woff2;base64,{font})')
html = open(os.path.join(ROOT, "index.html")).read()
import re
html = re.sub(r'  <(link rel="(preload|manifest|icon|apple-touch-icon)"|meta name="(apple-mobile|mobile-web)|!-- iPhone)[^\n]*\n', "", html)
html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
html = html.replace('<script type="module" src="src/main.js"></script>', f"<script>{js}</script>")
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist/lemur-night.html"), "w").write(html)
print("dist/lemur-night.html", len(html) // 1024, "KB")
