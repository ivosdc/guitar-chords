import {NOTES, NOTES_SHARP} from './NoteService'

let half_step = 5;
export let width = 100;
export let height = half_step * (NOTES.length * 2);
export let backgroundColor = "rgba(255, 255, 255, 0)";
export let color = "#333";

export function drawChordTones(chord_canvas, tones, show_chord_stacked) {
    try {
        clearCanvas(chord_canvas);
        let ctx = chord_canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        drawBox(ctx, 0, height / 2 - 4 * half_step, half_step / 2, height / 2 + 4 * half_step);
        drawLine(ctx, height / 2 - 4 * half_step, 0, width);
        drawLine(ctx, height / 2 - 2 * half_step, 0, width);
        drawLine(ctx, height / 2, 0, width);
        drawLine(ctx, height / 2 + 2 * half_step, 0, width);
        drawLine(ctx, height / 2 + 4 * half_step, 0, width);
        if (tones !== '') {
            let tone = tones.split(',');
            let y = height;
            tone.forEach((toneString, index) => {
                y = getTonePos(toneString, index, y);
                let pos = show_chord_stacked ? (width / 2) : (width / tone.length) * (index + 1) - ((width / tone.length) / 2);
                drawTone(ctx, toneString, pos, y)
            })
        }
    } catch (err) {
        console.log(err)
    }
}

function drawBox(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
    ctx.fill();
}

function getTonePos(tone, index, last_pos) {
    let y = NOTES.indexOf(tone) === -1 ? NOTES_SHARP.indexOf(tone) : NOTES.indexOf(tone);
    let pos = height / 2 + (NOTES.length / 2 * half_step) - y * half_step;
    if (pos > last_pos) {
        pos = pos - (half_step * NOTES.length);
    }
    if ((tone.substring(0, 1) === 'B' || tone.substring(0, 1) === 'A') && index === 0) {
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
    try {
        let ctx = chord_canvas.getContext("2d");
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
    } catch (err) {
        console.log(err);
    }
}
