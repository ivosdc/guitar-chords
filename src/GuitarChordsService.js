import CHORDS from './GuitarChordsJson';
import {ChordBox} from "vexchords";

export const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export let tuning = ["E", "A", "D", "G", "B", "E"];



export let empty_chord = [{
    chordName: '',
    enharmonicChordName: '',
    fingering: 'X X X X X X',
    strings: 'X X X X X X',
    tones: ''
}];

export function getChords(note) {
    let chords = empty_chord;
    if (note !== '') {
        chords = CHORDS[note];
    }
    return chords;
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

function getTunePositions(tuning) {
    let tuningPositions = [];
    tuning.forEach((note) => {
        tuningPositions.push(NOTES.indexOf(note))
    })
    return tuningPositions;
}

function getStringNotes(strings, tuning) {
    const tunePosition = getTunePositions(tuning);
    let notes = [];
    strings.forEach((tune, index) =>{
        if (tune !== 'X') {
            tune = (tunePosition[index] + parseInt(tune)) % NOTES.length - 1;
            tune = NOTES[tune + 1];
        } else {
            tune = '-';
        }
        notes.push(tune);
    })
    return notes;
}

export function drawChord(chordElement, strings, fingering, tuning) {
    chordElement.innerHTML = '';
    let calculatedPosition = 0 || getPositionFromFrets(strings);
    const adjustedFrets = adjustFrets(strings, calculatedPosition);
    let chordbox = new ChordBox(chordElement, {
        defaultColor: '#666',
        bgColor: '#666',
        strokeColor: '#DDD',
        stringColor: '#AAA',
        fretColor: '#999',
        labelColor: '#666',
        fontFamily: 'Calibri, Candara, Arial, Helvetica, sans-serif'
    });
    let barres = JSON.parse(JSON.stringify(fingering));
    chordbox.draw({
        barres: getBarres(barres.reverse(), adjustedFrets),
        chord: getChord(fingering, adjustedFrets),
        position: calculatedPosition,
        tuning: getStringNotes(strings, tuning)
    });
    const svgElement = chordElement.querySelector(`svg`);
    svgElement.setAttribute("viewBox", "0 10 100 100");
    svgElement.setAttribute("width", "100%");
    svgElement.setAttribute("height", "100%");
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

export function getChordName(chord) {
    let enharmonicChordName = chord.enharmonicChordName.split(',').join('');
    let chordName = chord.chordName.split(',').join('');
    return enharmonicChordName === chordName ? chordName : enharmonicChordName + ' ' + chordName;
}

export function getBaseNoteName(base_note) {
    let chords = getChords(base_note);
    return getChordName(chords[0]);
}



