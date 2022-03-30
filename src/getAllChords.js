const NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const REQUEST_CHORDS_LIKE = "https://api.uberchord.com/v1/chords?nameLike=";

export async function getAllChords() {
    let chords = {};
    let counter = 0;
    for (let i = 0; i < NOTES.root.length; i++) {
    await fetch(REQUEST_CHORDS_LIKE + NOTES.root[i])
        .then(async (result) => {
            let table = await result.json();
            chords[NOTES.root[i]] = table;
            counter += table.length;
        })
        .catch((err) => {
            console.error(err)
        })
    }
    return chords;
}
