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
    <div class="notes-row">
        {#each NOTES as base_note}
            <div class="note-button"
                 class:button-selected={base_note === note}
                 on:click={()=>{setBaseNote(base_note)}}>
                {getBaseNoteName(base_note)}
            </div>
        {/each}
    </div>
    <div class="chords-row">
        {#if getChordName(note_chords[0]) !== ''}
            {#each note_chords as note_chord}
                <div class="chord-button"
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
    <div class="chord">
        <div bind:this={chordElement}></div>
    </div>
    <span class="tones">{chord.tones}</span>
</div>
<style>
    .notes-menu {
        display: flex;
        align-items: center;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .tones {
        font-family: Verdana, Arial, Helvetica, sans-serif;
        font-size: large;
        color: #333;
    }

    .notes-row {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        border: none;
        width: 100vw;
        gap: 0.2rem;
        margin-bottom: 0.5rem;
    }

    .chords-row {
        display: grid;
        grid-template-columns: auto auto auto auto auto;
        border: none;
        width: fit-content;
        height: 81px;
        gap: 0.2rem;
    }

    .chord {
        width: 200px;
        display: flex;
        align-items: center;
    }

    .note-button {
        border: 1px solid #999;
        border-radius: 5px;
        color: #999;
        width: fit-content;
        font-family: Verdana, Arial, Helvetica, sans-serif;
        font-weight: normal;
        font-size: small;
        cursor: pointer;
        padding: 0.2rem 0.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        max-width: min-content;
    }

    .chord-button {
        border: 1px solid #999;
        border-radius: 5px;
        color: #999;
        text-align: center;
        font-family: Verdana, Arial, Helvetica, sans-serif;
        font-weight: normal;
        font-size: small;
        cursor: pointer;
        padding: 0.2rem 0.3rem;
        width: available;
        margin-bottom: auto;
        margin-top: auto;
    }

    .button-selected {
        border: 1px solid #1A1A1A;
        color: #1A1A1A;
        background-color: #999;
    }


</style>