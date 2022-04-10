<script>
    import {getChords, empty_chord} from './GuitarChordsService';
    import {afterUpdate} from 'svelte';
    import {ChordBox} from 'vexchords';

    let tuning = ["E", "A", "D", "G", "B", "E"];
    let position = 0;

    let chordElement;

    afterUpdate(drawChord)

    function drawChord() {
        chordElement.innerHTML = '';
        let calculatedPosition = position || getPositionFromFrets(strings);
        const adjustedFrets = adjustFrets(strings, calculatedPosition);
        let chordbox = new ChordBox(chordElement, {
            defaultColor: '#666',
            bgColor: '#666',
            strokeColor: '#DDD',
            stringColor: '#AAA',
            fretColor: '#999',
            labelColor: '#666',
            fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
            fontWeight: 'lighter',
            labelWeight: 'lighter',
        });
        let barres = JSON.parse(JSON.stringify(fingering));
        chordbox.draw({
            barres: getBarres(barres.reverse(), adjustedFrets),
            chord: getChord(fingering, adjustedFrets),
            position: calculatedPosition,
            tuning
        });
        const svgElement = chordElement.querySelector(`svg`);
        svgElement.setAttribute("viewBox", "0 10 100 100");
        svgElement.setAttribute("width", "100%");
        svgElement.setAttribute("height", "100%");
    }

    function getBarres(fingering, frets) {
        let fret = JSON.parse(JSON.stringify(frets));
        fret.reverse();
        let barres = [];
        fingering.forEach((finger, index) => {
            let sibling = getSibling(finger, index, fingering);
            if (sibling !== -1) {
                barres.push({fromString: sibling, toString: index + 1, fret: fret[index]});
            }
        })

        return barres;
    }

    function getSibling(finger, index, fingering) {
        return isNaN(finger) ? -1 : fingering.lastIndexOf(finger) === index ? -1 : fingering.lastIndexOf(finger) + 1;
    }

    function adjustFrets(frets, position) {
        return frets.map((fret) => {
            const fretInt = Number(fret);
            let first_fred = 0;
            if (position > 0) {
                first_fred = 1;
            }
            return fret !== 'X' ? fretInt - position + first_fred : fret.toLowerCase();
        });
    }

    function getChord(fingering, frets) {
        return frets.map((fret, i) => {
            const fingerFormatted = isNaN(fingering[i]) || fret === 0 ? ' ' : fingering[i];
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


    export let note = '';
    let note_chords;
    let chord = empty_chord[0];
    $: note_chords = initChords(note);

    function initChords(note) {
        let chords = getChords(note);
        chord = chords[0];
        return chords;
    }

    let NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    let fingering;
    $: fingering = setFingering(chord);
    let strings;
    $: strings = setStrings(chord);

    function getChordName(chord) {
        let enharmonicChordName = chord.enharmonicChordName.split(',').join('');
        let chordName = chord.chordName.split(',').join('');
        return enharmonicChordName === chordName ? chordName : enharmonicChordName + ' ' + chordName;
    }

    function setFingering(chord) {
        return chord.fingering.split(' ');
    }

    function setStrings(chord) {
        return chord.strings.split(' ');
    }

    function setBaseNote(base_note) {
        note = base_note;
    }

    function setChord(selected_chord) {
        chord = selected_chord;
    }

    function getBaseNoteName(base_note) {
        let chords = getChords(base_note);
        return getChordName(chords[0]);
    }
</script>

<div class="notes-menu">

    <div class="scroll-row">
        <div class="content-row">
            {#each NOTES as base_note}
                <div class="button"
                     class:button-selected={base_note === note}
                     on:click={()=>{setBaseNote(base_note)}}>
                    {getBaseNoteName(base_note)}
                </div>
            {/each}
        </div>
    </div>
    <div class="scroll-row">
        <div class="content-row">
            {#if getChordName(note_chords[0]) !== ''}
                {#each note_chords as note_chord}
                    <div class="button"
                         class:button-selected={getChordName(note_chord) === getChordName(chord)}
                         on:click={()=>{setChord(note_chord)}}>
                        {getChordName(note_chord).split(' ')[0]}
                        {#if getChordName(note_chord).split(' ')[1] !== undefined}
                            <br/>
                            {getChordName(note_chord).split(' ')[1]}
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>
    </div>
    <div class="chord-visualized">
        <div class="tones">
            {chord.tones}
        </div>
        <div class="chord">
            <div bind:this={chordElement}></div>
        </div>
    </div>
</div>
<style>

    .notes-menu {
        display: flex;
        align-items: center;
        flex-direction: column;
        width: 100vw;
        height: available;
        height: -moz-available;
        height: -webkit-fill-available;
    }

    .chord-visualized {
        width: fit-content;
        display: flex;
    }

    .tones {
        font-family: Verdana, Arial, Helvetica, sans-serif;
        font-size: large;
        color: #999;
        width: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .scroll-row {
        display: flex;
        overflow: auto;
        border: none;
        width: available;
        width: -moz-available;
        width: -webkit-fill-available;
        height: 70px;
        border-top: 1px solid #999;
    }

    .content-row {
        display: flex;
        flex-wrap: nowrap;
        border: none;
        width: fit-content;
        margin: 0.5em auto;
    }

    .chord {
        width: 180px;
        display: flex;
        align-items: center;
    }

    .button {
        border: 1px solid #999;
        border-radius: 5px;
        color: #999;
        font-family: Verdana, Arial, Helvetica, sans-serif;
        font-weight: normal;
        font-size: small;
        cursor: pointer;
        padding: 0.2rem 1em;
        margin: 0 2px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        max-width: min-content;
        height: 2.5em;
    }

    .button-selected {
        border: 1px solid #1A1A1A;
        color: #1A1A1A;
        background-color: #999;
    }
</style>