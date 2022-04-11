<script>
    import {
        drawGuitarChord,
        getChordName,
        getBaseNoteName,
        getChords,
        empty_chord
    } from './drawGuitarChord';
    import {afterUpdate} from 'svelte';
    import {drawChordTones, width, height} from "./drawChordTones";
    import {NOTES, tuning} from './NoteService'

    export let note = '';
    let chord = empty_chord[0];
    export let tune = tuning;


    function setBaseNote(base_note) {
        note = base_note;
    }

    function setChord(selected_chord) {
        chord = selected_chord;
    }

    function initChords(note) {
        let chords = getChords(note);
        setChord(chords[0]);
        return chords;
    }

    let show_chord_stacked = false;
    let note_chords;
    $: note_chords = initChords(note);
    let fingering;
    $: fingering = chord.fingering.split(' ');
    let strings;
    $: strings = chord.strings.split(' ');

    let chordElement;
    let chord_canvas;

    afterUpdate(() => {
        drawGuitarChord(chordElement, strings, fingering, tune);
        drawChordTones(chord_canvas, chord.tones, 'rgba(0, 0, 0, 0)', '#A1A1A1', show_chord_stacked);
    })

    function toggleStackedView() {
        show_chord_stacked = !show_chord_stacked;
        drawChordTones(chord_canvas, chord.tones, 'rgba(0, 0, 0, 0)', '#A1A1A1',  show_chord_stacked);
    }

</script>

<div class="notes-menu">

    <div class="scroll-row">
        <div class="content-row">
            {#each NOTES as base_note}
                <div class="chord-button"
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
                    <div class="chord-button"
                         class:button-selected={getChordName(note_chord) === getChordName(chord)}
                         on:click={()=>{setChord(note_chord)}}>
                        {getChordName(note_chord)}
                    </div>
                {/each}
            {/if}
        </div>
    </div>
    <div class="chord-header">
        <span class="chord-name">{getChordName(chord)}</span>
        <span class="chord-tuning">{tuning.join(' ')}</span>
    </div>
    <div class="chord-visualized">
        <div class="tones">
            <div class="tones-canvas" on:click={toggleStackedView}>
                <canvas bind:this={chord_canvas} width={width} height={height}>
                </canvas>
            </div>
            <div class="tones-name">{chord.tones}</div>
        </div>
        <div class="chord">
            <div bind:this={chordElement}></div>
        </div>
    </div>
</div>
<style>

    .tones-canvas {
        display: flex;
        align-items: center;
        cursor: pointer;
    }

    .tones-name {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: normal;
        font-size: medium;
        padding-bottom: 2px;
    }

    .chord-header {
        display: grid;
        grid-template-columns: 100px 200px;
        color: #999;
        height: 2.5em;
    }

    .chord-name {
        text-align: left;
        align-items: flex-start;
        font-weight: bold;
        font-size: x-large;
        display: flex;
        flex-direction: column;
        max-width: min-content;
        height: 2.5em;
    }

    .chord-tuning {
        text-align: center;
        align-items: center;
        font-family: monospace;
        font-weight: bolder;
        padding-left: 0.45em;
        padding-top: 0.5em;
        font-size: 1.8em;
        letter-spacing: -0.05em;
    }

    .notes-menu {
        display: flex;
        align-items: center;
        flex-direction: column;
        width: 100vw;
        height: available;
        height: -moz-available;
        height: -webkit-fill-available;
        font-family: Calibri, Candara, Arial, Helvetica, sans-serif;
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
        display: grid;
        grid-template-columns: auto;
        margin-top: 2em;
        height: available;
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
        width: 200px;
        display: flex;
        align-items: center;
    }

    .chord-button {
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