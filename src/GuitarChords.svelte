<script>
    import {drawGuitarChord} from './drawGuitarChord';
    import {afterUpdate} from 'svelte';
    import {drawChordTones, width, height} from "./drawChordTones";
    import {icon_play, icon_music} from './AssetService';
    import * as Tone from 'tone';

    import {
        NOTES, NOTES_SHARP, tuning, empty_chord,
        getChords,
        getStringNotes,
        setSharpNotes,
        getChordName,
        getBaseNoteName
    } from './ChordsNotesService'

    let note = '';
    export let chord = empty_chord[0];
    $: chord = typeof chord === 'string' ? JSON.parse(chord) : chord;
    export let show_chord_selector = true;
    $: show_chord_selector = typeof show_chord_selector === 'string' ? JSON.parse(show_chord_selector) : show_chord_selector;
    export let chamber_tone = 440;

    function getFrequenz(note) {
        const max_octaves = 5;
        const octave = Math.pow(2, max_octaves - (parseInt(note.slice(-1)) + 1));
        const offset_half_tone = Math.pow(2, 1 / NOTES.length);
        let halfTonesFromA = getHalfTonesFromA(note);
        return chamber_tone / (octave * Math.pow(offset_half_tone, halfTonesFromA));
    }

    function getHalfTonesFromA(note) {
        const A = 9;
        let indexNote = NOTES.indexOf(note.substring(0, note.length - 1));
        if (indexNote === -1) {
            indexNote = NOTES_SHARP.indexOf(note.substring(0, note.length - 1));
        }
        return (A - indexNote);
    }

    function setBaseNote(base_note) {
        note = base_note;
    }

    function setChord(selected_chord) {
        chord = selected_chord;
    }

    function initChords(note) {
        let chords = getChords(note);
        setChord(chords[0]);
        if (chords[0].chordName !== '') {
            icon_play_music = icon_play;
        }
        return chords;
    }

    let show_chord_stacked = false;
    let note_chords;
    $: note_chords = initChords(note);

    let left_hand = false;
    let tune;
    $: tune = setTune(left_hand);

    function setTune(left_handed) {
        let tuningDisplay = JSON.parse(JSON.stringify(tuning));
        if (left_handed) {
            tuningDisplay.reverse();
        }
        return tuningDisplay;
    }

    let fingering;
    $: fingering = getFingering(chord, left_hand);
    let strings;
    $: strings = getStrings(chord, left_hand);

    function reverse(str) {
        return Array.from(str).reverse().join('');
    }

    function getFingering(chord, left_hand) {
        let fingers = chord.fingering;
        if (left_hand) {
            fingers = reverse(fingers);
        }
        return fingers.split(' ')
    }


    function getStrings(chord, left_hand) {
        let strings = chord.strings;
        if (left_hand) {
            strings = reverse(strings);
        }
        return strings.split(' ')
    }

    let chordElement;
    let chord_canvas;

    afterUpdate(() => {
        drawGuitarChord(chordElement, strings, fingering, tune);
        drawChordTones(chord_canvas, chord.tones, 'rgba(0, 0, 0, 0)', '#A1A1A1', show_chord_stacked);
    })

    function toggleStackedView() {
        show_chord_stacked = !show_chord_stacked;
        drawChordTones(chord_canvas, chord.tones, 'rgba(0, 0, 0, 0)', '#A1A1A1', show_chord_stacked);
    }

    function toggleLeftRight() {
        left_hand = !left_hand;
    }


    let icon_play_music = '';

    function playChord() {
        icon_play_music = icon_music;
        let tones = setSharpNotes(chord.tones).split(',');
        let delay = 0;
        let octave = 3;
        let index = 0;
        let lasttone = '';
        for (let tone of tones) {
            if (!show_chord_stacked) {
                delay += 0.3
            }
            if (index === 1 && octave === 2 && NOTES_SHARP.indexOf(tone) > 6) {
                octave++;
            }
            if (index > 0 && NOTES_SHARP.indexOf(tone) < NOTES_SHARP.indexOf(lasttone)) {
                octave++;
            }
            if (index === 0 && NOTES_SHARP.indexOf(tone) > 6) {
                octave--;
            }
            const synth = new Tone.Synth().toDestination();
            const now = Tone.now();
            synth.triggerAttackRelease(getFrequenz(tone + octave), 0.3, now + delay);
            lasttone = tone;
            index++;
        }
        setTimeout(() => {
            icon_play_music = icon_play;
        }, 1500)
    }
</script>

<div class="notes-menu">
    {#if show_chord_selector}
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
    {/if}
    <div class="chord-header">
        <div class="chord-name">{getChordName(chord)}</div>
        <div class="chord-notes">
            <div class="chord-guitar-notes">
                {#each getStringNotes(strings, tune, true) as tone}
                    <div class="chord-guitar-note">{tone}</div>
                {/each}
            </div>
            {#if JSON.stringify(getStringNotes(strings, tune, true)) !== JSON.stringify(getStringNotes(strings, tune, false))}
                <div class="chord-guitar-notes">
                    {#each getStringNotes(strings, tune, false) as tone}
                        <div class="chord-guitar-note">{tone}</div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
    <div class="chord-visualized">
        <div class="tones">
            <div class="tones-canvas" on:click={toggleStackedView}>
                <canvas bind:this={chord_canvas} width={width} height={height}>
                </canvas>
            </div>
            <div class="play-chord" on:click={playChord}>{@html icon_play_music}</div>
            <div class="tones-name">{setSharpNotes(chord.tones)}</div>
        </div>
        <div class="chord">
            <div bind:this={chordElement}></div>
        </div>
    </div>
    <div class="left-right-toggle">
        <div class="left-right-bar">
            <div class="dummy">
            </div>
            <div class="left-right-button" on:click={toggleLeftRight}>
                {#if left_hand}
                    &#10229; L-hand &#10229;
                {:else}
                    &#10230; R-hand &#10230;
                {/if}
            </div>
        </div>
    </div>
</div>
<style>
    .play-chord {
        display: flex;
        align-items: flex-start;
        justify-content: center;
    }

    .left-right-toggle {
        width: 100vw;
        display: flex;
        align-items: flex-start;
        justify-content: center;
    }

    .left-right-bar {
        display: grid;
        grid-template-columns: 150px 200px;
    }

    .left-right-button {
        text-align: center;
        cursor: pointer;
        color: #999999;
    }

    .tones-canvas {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        cursor: pointer;
    }

    .tones-name {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        font-weight: normal;
        font-size: medium;
        padding-top: 4px;
    }

    .chord-header {
        display: grid;
        grid-template-columns: 150px 200px;
        color: #999;
        border-top: 1px solid #999;
        width: 100vw;
        justify-content: center;
        padding-top: 0.5em;
        height: 50px;
    }

    .chord-name {
        text-align: center;
        font-size: x-large;
        font-weight: bolder;
        display: flex;
        flex-direction: column;
        max-width: min-content;
    }

    .chord-notes {
        padding-left: 10px;
    }

    .chord-guitar-notes {
        display: grid;
        grid-template-columns: 25px 25px 25px 25px 25px 25px;
        padding-left: 20px;
        align-items: center;
    }

    .chord-guitar-note {
        text-align: center;
        width: available;
        font-size: x-large;
        font-weight: normal;
        font-family: monospace;
    }

    .chord-visualized {
        display: grid;
        grid-template-columns: 150px 200px;
        width: 100vw;
        justify-content: center;
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
        border-top: 1px solid #999;
    }

    .tones {
        font-size: large;
        color: #999;
        display: grid;
        grid-template-columns: auto;
        margin-top: 2em;
        height: available;
        width: available;
    }

    .scroll-row {
        display: flex;
        overflow: auto;
        border: none;
        width: available;
        width: -moz-available;
        width: -webkit-fill-available;
        height: 70px;
    }

    .content-row {
        display: flex;
        flex-wrap: nowrap;
        border: none;
        width: fit-content;
        margin: 0.5em auto;
    }

    .chord {
        width: available;
        display: flex;
        justify-content: flex-start;
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
        box-shadow: -1px 1px 4px -1px rgba(0, 0, 0, 0.4);
    }

    .button-selected {
        border: 1px solid #1A1A1A;
        color: #fff;
        background-color: #999;
        box-shadow: none;
    }
</style>