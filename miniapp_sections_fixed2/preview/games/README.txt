Add new games:
- Put game mount script into preview/games/<key>/<key>.mount.js and assets into preview/games/<key>/assets/
- Register game in runtime by assigning window.GAMES.<key> = { title, mount(host, ctx){... return cleanup} }
- Add a block in app/templates.js similar to flappyGame but with data-game-play="<key>"
