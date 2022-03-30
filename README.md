Made with Svelte.

# Guitar-chord-tab-svg
- Web-component: `<guitar-chord></guitar-chord>`

[Try out live example](https://ivosdc.github.io/guitar-chord/dist "Guitar tuner Example")

or include into your website.
```html
<head>
    ...
    <script defer src='https://ivosdc.github.io/guitar-chord/dist/build/guitar-chord.js'></script>
</head>
<body>
<guitar-chord></guitar-chord>
```

## Parameter
-    export let tuning = ["E", "A", "D", "G", "B", "E"];
-    export let fingering = ['X', '3', '2', 'X', '1', 'X'];
-    export let frets = ['X', '3', '2', '0', '1', '0'];
-    export let position = 0;
-    export let scale = '50%';

