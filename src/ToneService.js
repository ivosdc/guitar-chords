import {NOTES} from "./GuitarChordsService";

let steps = 5;
export let width = steps * (NOTES.length + 6);
export let height = steps * (NOTES.length + 6);

export function drawChordTones(chord_canvas, tones) {
    clearCanvas(chord_canvas);
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

function clearCanvas(chord_canvas) {
    let ctx = chord_canvas.getContext("2d");
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, width, height);
}
