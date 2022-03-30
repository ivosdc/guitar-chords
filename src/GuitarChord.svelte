<script>
    import {onMount} from 'svelte';
    import CHORDS from './all-chords-chart';
    import {ChordBox} from 'vexchords';

    let chordElement;
    export let tuning = ["E", "A", "D", "G", "B", "E"];
    export let fingering = ['X', '3', '2', 'X', '1', 'X'];
    export let frets = ['X', '3', '2', '0', '1', '0'];
    export let position = 0;
    export let scale = '50%';


    onMount(drawChord)

    function drawChord() {
        const calculatedPosition = position || getPositionFromFrets(frets);
        const adjustedFrets = adjustFrets(frets, calculatedPosition);
        let chordbox = new ChordBox(chordElement, {
            defaultColor: '#666',
            bgColor: '#1A1A1A',
            labelColor: '#1A1A1A',
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

    function displayName(chordDataName) {
        return chordDataName.split(',').join('');
    }

    function getChords(note) {
        note = note.substring(0, 1);
        let chords = CHORDS[note];
        return chords;
    }

</script>

<div bind:this={chordElement}></div>
