<script>
    import {afterUpdate} from 'svelte';
    import {ChordBox} from 'vexchords';

    export let tuning = ["E", "A", "D", "G", "B", "E"];
    $: tuning = typeof tuning === 'string' ? JSON.parse(tuning) : tuning;
    export let fingering = ['X', 'X', 'X', 'X', 'X', 'X'];
    $: fingering = typeof fingering === 'string' ? JSON.parse(fingering) : fingering;
    export let strings = ['X', 'X', 'X', 'X', 'X', 'X'];
    $: strings = typeof strings === 'string' ? JSON.parse(strings) : strings;
    export let position = 0;

    let chordElement;

    afterUpdate(drawChord)

    function drawChord() {
        chordElement.innerHTML = '';
        let calculatedPosition = position || getPositionFromFrets(strings);
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
        svgElement.setAttribute("width", "100%");
        svgElement.setAttribute("height", "100%");
    }

    function adjustFrets(frets, position) {
        return frets.map((fret) => {
            const fretInt = Number(fret);
            let first_fred = 0;
            if (position > 0) {
                first_fred = 1;
            }
            return fret !== 'X' ? fretInt - position + first_fred : fret;
        });
    }

    function getChord(fingering, frets) {
        return frets.map((fret, i) => {
            const fingerFormatted = isNaN(fingering[i]) || fret === 0 ? 'X' : fingering[i];
            return [frets.length - i, fret, fingerFormatted];
        });
    }

    function getPositionFromFrets(frets) {
        const filteredFrets = frets.map((string) => {
            if (string !== 'X') {
                return string;
            }
        }).filter(Boolean);
        return Math.min(...filteredFrets) === Infinity ? 0 : Math.min(...filteredFrets);
    }
</script>

<div bind:this={chordElement}></div>
