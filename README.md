# Four Seasons, Three Minds

The beauty of spring, summer, autumn and winter, imagined three times by three AI models across 2026.

| Tab | Model | Made |
| --- | --- | --- |
| i | Gemini | April 2026 |
| ii | Codex (GPT-6 Astra) | November 2026 |
| iii | Claude Fable 5.2 | November 2026 |

Each tab shows one model's version of the same idea: a branch that grows, blossoms, turns and goes quiet under snow. When you switch tabs, the new version opens on the season you were already looking at, so you can compare the three models season by season.

## Music

`music.js` composes the score live in the browser with the Web Audio API, so the site has no audio files.

Each season has its own chord progression with smooth voice leading, played on a soft felt piano:

- **Spring**: D major, rising broken chords, harp glissandi and birdsong
- **Summer**: F major, warm syncopated chords and a swell of strings
- **Autumn**: A minor, slow falling arpeggios, wind
- **Winter**: E minor, sparse notes with celesta doubling and snow wind

The melody grows from one four-note motif shared by all four seasons. The engine remembers the melody it composed. Each time the progression comes round, it plays the theme again, varies it slightly, or leaves a cycle out to breathe. A slow "breath" curve shapes density and loudness, and the tempo drifts by a few percent, so the music never feels quantised. When the season changes, the music crossfades. Moving the pointer quickly across a scene adds a soft celesta note.

There are two arrangements: `new SeasonMusic('piano')` (the default) and `new SeasonMusic('strings')`, which carries the piano on a string section.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. The pages use JavaScript modules, so they have to be served over HTTP; opening `index.html` directly from disk won't work.

## Files

- `index.html`: intro screen (the Jvision logo as a window onto the seasons), tabs and music controls
- `music.js`: the generative score
- `gemini/`: static port of the original React + Tailwind component. The scene code is unchanged.
- `codex/`, `claude/`: the original static sites
- `vendor/three.js`: Three.js r170, MIT licence (see `vendor/THREE-LICENSE.txt`)
