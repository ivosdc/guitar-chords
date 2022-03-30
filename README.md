Made with Svelte.

# <guitar-chord />
- Web-component: `<guitar-chord></guitar-chord>`

Renders a SVG based on `fingering` and `strings`.

[Try out live example](https://ivosdc.github.io/guitar-chord/dist "Guitar tuner Example")

or include into your website.
```html
<head>
    ...
    <script defer src='https://ivosdc.github.io/guitar-chord/dist/build/guitar-chord.js'></script>
</head>
<body>
<guitar-chord id="guitar-chord"></guitar-chord>
<script>
    let guitarChord = document.getElementById('guitar-chord');

    guitarChord.setAttribute('shadowed', 'true');
    guitarChord.setAttribute('fingering', JSON.stringify('X 3 5 5 4 3'.split(' ')));
    guitarChord.setAttribute('strings', JSON.stringify('X 1 3 4 2 1'.split(' ')));

</script>
```

## Parameter
-    export let tuning = ["E", "A", "D", "G", "B", "E"];
-    export let fingering = ['X', '3', '2', 'X', '1', 'X'];
-    export let strings = ['X', '3', '2', '0', '1', '0'];
-    export let position = 0;
-    export let scale = '50%';

