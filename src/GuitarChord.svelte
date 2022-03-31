<script>
    import {onMount, afterUpdate} from 'svelte';
    import {ChordBox} from 'vexchords';

    export let tuning = ["E", "A", "D", "G", "B", "E"];
    $: tuning = typeof tuning === 'string' ? JSON.parse(tuning) : tuning;
    export let fingering = ['X', '3', '2', 'X', '1', 'X'];
    $: fingering = typeof fingering === 'string' ? JSON.parse(fingering) : fingering;
    export let strings = ['X', '3', '2', '0', '1', '0'];
    $: strings = typeof strings === 'string' ? JSON.parse(strings) : strings;
    export let position = 0;
    export let scale = '50%';

    let chordElement;


    onMount(drawChord)
    afterUpdate(drawChord)

    function drawChord() {
        chordElement.innerHTML = '';
        const calculatedPosition = position || getPositionFromFrets(strings);
        const adjustedFrets = adjustFrets(strings, calculatedPosition);
        let chordbox = new ChordBox(chordElement, {
            defaultColor: '#666',
            bgColor: '#666',
            labelColor: '#1A1A1A',
            fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
            fontWeight: 'lighter',
            labelWeight: 'lighter',
        });
        chordbox.draw({
            chord: getChord(fingering, adjustedFrets),
            tuning,
            position: calculatedPosition,
        });
        const svgElement = chordElement.querySelector(`svg`);
        svgElement.setAttribute("viewBox", "0 10 100 100");
        svgElement.setAttribute("width", scale);
        svgElement.setAttribute("height", scale);
    }


    function adjustFrets(frets, position) {
        return frets.map((fret) => {
            const fretInt = Number(fret);
            return fret ? fretInt - position + 1 : fret;
        });
    }

    function getChord(fingering, frets) {
        return frets.map((fret, i) => {
            const fingerFormatted =
                fingering[i] === "X" || fret === 0 ? null : fingering[i];
            return [frets.length - i, fret, fingerFormatted];
        });
    }

    function getPositionFromFrets(frets) {
        const filteredFrets = frets.map((string) => Number(string)).filter(Boolean);
        return filteredFrets.length ? Math.min(...filteredFrets) : 0;
    }
</script>

<div bind:this={chordElement}></div>
