import CHORDS from './GuitarChordsJson';

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
