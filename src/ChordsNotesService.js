import CHORDS from './GuitarChordsJson';

export const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const tuning = ["E", "A", "D", "G", "B", "E"];


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

export function setSharpNotes(notes) {
    let sharps = [];
    notes.split(',').forEach((noteName)=>{
        let pos = NOTES.indexOf(noteName);
        if (pos === -1) {
            pos = NOTES_SHARP.indexOf(noteName);
        }
        sharps.push(NOTES_SHARP[pos]);
    })
    return sharps.join(',');
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

export function getStringNotes(strings, tuning, sharp) {
    const tunePosition = getTunePositions(tuning);
    let notes = [];
    strings.forEach((tune, index) =>{
        if (tune !== 'X') {
            tune = (tunePosition[index] + parseInt(tune)) % NOTES.length - 1;
            tune = sharp ? NOTES_SHARP[tune + 1] : NOTES[tune + 1];
        } else {
            tune = '-';
        }
        notes.push(tune);
    })
    return notes;
}

function getTunePositions(tuning) {
    let tuningPositions = [];
    tuning.forEach((note) => {
        tuningPositions.push(NOTES.indexOf(note))
    })
    return tuningPositions;
}
