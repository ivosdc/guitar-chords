import {NOTES} from "./GuitarChordsService";

let half_step = 5;
export let width = 100;
export let height = half_step * (NOTES.length * 2);

export function drawChordTones(chord_canvas, tones) {
    clearCanvas(chord_canvas);
    let ctx = chord_canvas.getContext("2d");
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2 - 4 * half_step);
    ctx.lineTo(half_step / 2, height / 2 - 4 * half_step);
    ctx.lineTo(half_step / 2, height / 2 + 4 * half_step);
    ctx.lineTo(0, height / 2 + 4 * half_step);
    ctx.lineTo(0, height / 2 - 4 * half_step);
    ctx.stroke();
    ctx.closePath();
    ctx.fill();
    drawLine(ctx, height / 2 - 4 * half_step, 0, width);
    drawLine(ctx, height / 2 - 2 * half_step, 0, width);
    drawLine(ctx, height / 2, 0, width);
    drawLine(ctx, height / 2 + 2 * half_step, 0, width);
    drawLine(ctx, height / 2 + 4 * half_step, 0, width);
    if (tones !== '') {
        let tone = tones.split(',');
        let y = height;
        tone.forEach((toneString, index) => {
            y = getOffset(toneString, index, y);
            let pos = width / tone.length;
            drawTone(ctx, toneString, pos * (index + 1) - (pos / 2), y)
        })
    }
}

function getOffset(tone, index, last_pos) {
    const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let y = NOTES.indexOf(tone) === -1 ? sharp.indexOf(tone) : NOTES.indexOf(tone);
    let pos = height / 2 + (NOTES.length / 2 * half_step) - y * half_step;
    if (pos > last_pos) {
        pos = pos - (half_step * NOTES.length);
    }
    if ((tone.substring(0,1) === 'B' || tone.substring(0,1) === 'A') && index === 0) {
        pos = pos + (half_step * NOTES.length);
    }
    return pos;
}

function drawTone(ctx, tone, offset, pos) {
    ctx.beginPath();
    ctx.ellipse(offset, pos, half_step + 1, half_step - 1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.fill();
    setNoteLine(ctx, offset, pos);
}

function setNoteLine(ctx, x, y) {
    let middle = height / 2 / half_step;
    let total_even = middle % 2 === 0;
    let y_even = (y / half_step) % 2 === 0;

    function isMiddleLine() {
        return (y_even === total_even) && (y / half_step < (middle - 5) || y / half_step > (middle + 5));
    }

    function isUpperLine() {
        return (y_even !== total_even) && (y / half_step < (middle - 5));
    }

    function isLowerLine() {
        return (y_even !== total_even) && (y / half_step > (middle + 5));
    }

    let line = (half_step + 1) * 2;
    ctx.beginPath();
    y = isMiddleLine() ? y : isUpperLine() ? y + half_step : isLowerLine() ? y - half_step : -1;
    if (y !== -1) {
        drawLine(ctx, y, x - line, x + line);
    }
    ctx.stroke();
    ctx.closePath();
}

function drawLine(ctx, y, from, to) {
    ctx.beginPath();
    ctx.moveTo(from, y);
    ctx.lineTo(to, y);
    ctx.stroke();
    ctx.closePath();
}

function clearCanvas(chord_canvas) {
    let ctx = chord_canvas.getContext("2d");
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, width, height);
}
