<script>
    import {
        drawChord,
        getChordName,
        getBaseNoteName,
        getChords,
        NOTES,
        tuning,
        empty_chord
    } from './GuitarChordsService';
    import {afterUpdate} from 'svelte';

    export let note = '';
    let chord = empty_chord[0];
    export let tune = tuning;

    let note_chords;
    $: note_chords = initChords(note);
    let fingering;
    $: fingering = chord.fingering.split(' ');
    let strings;
    $: strings = chord.strings.split(' ');

    let chordElement;

    afterUpdate(() => {
        drawChord(chordElement, strings, fingering, tune);
        drawChordTones(chord.tones);
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

    let chord_canvas;
    let steps = 5;
    let width = steps * (NOTES.length + 6);
    let height = steps * (NOTES.length + 6);

    function drawChordTones(tones) {
        clearCanvas();
        let ctx = chord_canvas.getContext("2d");
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.beginPath();
        ctx.moveTo(0, height / 2 - 4 * steps);
        ctx.lineTo(steps, height / 2 - 4 * steps);
        ctx.lineTo(steps, height / 2 + 4 * steps);
        ctx.lineTo(0, height / 2 + 4 * steps);
        ctx.lineTo(0, height / 2 - 4 * steps);
        ctx.stroke();
        ctx.closePath();
        ctx.fill();
        drawLine(ctx, height / 2 - 4 * steps);
        drawLine(ctx, height / 2 - 2 * steps);
        drawLine(ctx, height / 2);
        drawLine(ctx, height / 2 + 2 * steps);
        drawLine(ctx, height / 2 + 4 * steps);
        if (tones !== '') {
            let tone = tones.split(',');
            tone.forEach((toneString, index) => {
                drawTone(ctx, toneString, index + 1)
            })
        }
    }

    function drawTone(ctx, tone, index) {
        let offset_left = 10;
        const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        let y = NOTES.indexOf(tone) === -1 ? sharp.indexOf(tone) : NOTES.indexOf(tone);
        let pos = height - (y + 3) * steps;
        if (tone.substring(0,1) === 'C' && index > 1) {
            pos = pos - (steps * NOTES.length);
        }
        if (tone.substring(0,1) === 'B' && index <= 1) {
            pos = pos + (steps * NOTES.length);
        }
        ctx.beginPath();
        ctx.ellipse(offset_left + index * steps * 3, pos, 6, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
        ctx.fill();
    }

    function drawLine(ctx, y) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.closePath();
    }

    function clearCanvas() {
        let ctx = chord_canvas.getContext("2d");
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(0, 0, width, height);
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
            <div class="tones-canvas">
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
        justify-content: center;
        height: 60px;
    }

    .tones-name {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-top: 1em;
    }

    .chord-header {
        display: grid;
        grid-template-columns: 100px 200px;
        font-family: Verdana, Arial, Helvetica, sans-serif;
        color: #999;
        height: 2em;
    }

    .chord-name {
        text-align: left;
        align-items: flex-start;
        font-weight: normal;
        font-size: 1em;
        border-bottom: 1px solid #999;
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
        height: min-content;
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