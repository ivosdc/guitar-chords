import CHORDS from './GuitarChordsJson';

export let empty_chord = [{
    chordName: '',
    fingering: 'X X X X X X',
    strings: 'X X X X X X'
}];

export function getChords(note) {
    let chords = empty_chord;
    if (note !== '') {
        chords = CHORDS[note];
    }
    return chords;
}
