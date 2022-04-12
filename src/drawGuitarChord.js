import {ChordBox} from "vexchords";

export function drawGuitarChord(chordElement, strings, fingering, tuning) {
    chordElement.innerHTML = '';
    let calculatedPosition = 0 || getPositionFromFrets(strings);
    const adjustedFrets = adjustFrets(strings, calculatedPosition);
    let chordBox = new ChordBox(chordElement, {
        defaultColor: '#666',
        bgColor: '#666',
        strokeColor: '#DDD',
        stringColor: '#AAA',
        fretColor: '#999',
        labelColor: '#666',
        fontFamily: 'Calibri, Candara, Arial, Helvetica, sans-serif'
    });
    let fingering_reverse = JSON.parse(JSON.stringify(fingering)).reverse();
    chordBox.draw({
        barres: getBarres(fingering_reverse, adjustedFrets),
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

function getChord(fingering, frets) {
    return frets.map((fret, i) => {
        const fingerFormatted = isNaN(fingering[i]) || fret === 0 ? ' ' : fingering[i];
        return [frets.length - i, fret, fingerFormatted];
    });
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

function getPositionFromFrets(frets) {
    const filteredFrets = frets.map((string) => {
        if (string !== 'X') {
            return string;
        }
    }).filter(Boolean);
    return Math.min(...filteredFrets) === Infinity ? 0 : Math.min(...filteredFrets);
}
