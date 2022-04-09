import fetch from 'node-fetch';
//const fetch = require('node-fetch');
const NOTES = ["C", "Db","D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const REQUEST_CHORDS_LIKE = "https://api.uberchord.com/v1/chords?nameLike=";

async function getAllChords() {
    let chords = {};
    let counter = 0;
    for (let i = 0; i < NOTES.length; i++) {
        await fetch(REQUEST_CHORDS_LIKE + NOTES[i])
            .then(async (result) => {
                let table = await result.json();
                chords[NOTES[i]] = table;
                counter += table.length;
            })
            .catch((err) => {
                console.error(err)
            })
    }
    console.log(chords)
    return chords;
}
getAllChords();