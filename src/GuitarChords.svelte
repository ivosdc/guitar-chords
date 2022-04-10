<script>
    import {
        drawChord,
        setFingering,
        setStrings,
        getChordName,
        getBaseNoteName,
        getChords,
        empty_chord
    } from './GuitarChordsService';
    import {afterUpdate} from 'svelte';

    export let note = '';
    let chord = empty_chord[0];

    let tuning = ["E", "A", "D", "G", "B", "E"];
    let NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

    let note_chords;
    $: note_chords = initChords(note);
    let fingering;
    $: fingering = setFingering(chord);
    let strings;
    $: strings = setStrings(chord);
    let chordElement;

    afterUpdate(() => {
        drawChord(chordElement, strings, fingering, tuning)
    })

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