const CHORDS = {
  C: [
    {
      strings: 'X 3 2 0 1 0',
      fingering: 'X 3 2 X 1 X',
      chordName: 'C,,,',
      enharmonicChordName: 'C,,,',
      voicingID: '9223372036855826559',
      tones: 'C,E,G'
    },
    {
      strings: 'X 3 5 5 4 3',
      fingering: 'X 1 3 4 2 1',
      chordName: 'C,m,,',
      enharmonicChordName: 'C,m,,',
      voicingID: '9223372036959802495',
      tones: 'C,Eb,G'
    },
    {
      strings: 'X 3 2 3 1 0',
      fingering: 'X 3 2 4 1 X',
      chordName: 'C,,7,',
      enharmonicChordName: 'C,,7,',
      voicingID: '9223372036855924863',
      tones: 'C,E,G,Bb'
    },
    {
      strings: 'X 3 5 4 5 3',
      fingering: 'X 1 3 2 4 1',
      chordName: 'C,maj,7,',
      enharmonicChordName: 'C,maj,7,',
      voicingID: '9223372036960818303',
      tones: 'C,E,G,B'
    },
    {
      strings: 'X 3 5 3 4 3',
      fingering: 'X 1 3 1 2 1',
      chordName: 'C,m,7,',
      enharmonicChordName: 'C,m,7,',
      voicingID: '9223372036959736959',
      tones: 'C,Eb,G,Bb'
    },
    {
      strings: 'X 3 5 X X X',
      fingering: 'X 1 3 X X X',
      chordName: 'C,,5,',
      enharmonicChordName: 'C,,5,',
      voicingID: '9223372037928490111',
      tones: 'C,G'
    },
    {
      strings: 'X 3 4 2 4 X',
      fingering: 'X 2 3 1 4 X',
      chordName: 'C,dim,7,',
      enharmonicChordName: 'C,dim,7,',
      voicingID: '9223372037899227263',
      tones: 'C,Eb,Gb,A'
    },
    {
      strings: 'X 3 4 3 4 X',
      fingering: 'X 1 3 2 4 X',
      chordName: 'C,m,7b5,',
      enharmonicChordName: 'C,m,7b5,',
      voicingID: '9223372037899260031',
      tones: 'C,Eb,Gb,Bb'
    },
    {
      strings: 'X 3 X 0 5 5',
      fingering: 'X 1 X X 3 4',
      chordName: 'C,,6,',
      enharmonicChordName: 'C,,6,',
      voicingID: '9223372037027822719',
      tones: 'C,E,G,A'
    },
    {
      strings: 'X 3 5 2 4 X',
      fingering: 'X 2 4 1 3 X',
      chordName: 'C,m,6,',
      enharmonicChordName: 'C,m,6,',
      voicingID: '9223372037899228287',
      tones: 'C,Eb,G,A'
    }
  ],
  Db: [
    {
      strings: 'X 4 3 1 2 1',
      fingering: 'X 4 3 1 2 1',
      chordName: 'Db,,,',
      enharmonicChordName: 'C#,,,',
      voicingID: '9223372036890463391',
      tones: 'Db,F,Ab'
    },
    {
      strings: 'X 4 6 6 5 4',
      fingering: 'X 1 3 4 2 1',
      chordName: 'Db,m,,',
      enharmonicChordName: 'C#,m,,',
      voicingID: '9223372036994439327',
      tones: 'C#,E,G#'
    },
    {
      strings: 'X 4 6 4 6 4',
      fingering: 'X 1 3 1 4 1',
      chordName: 'Db,,7,',
      enharmonicChordName: 'C#,,7,',
      voicingID: '9223372036995422367',
      tones: 'Db,F,Ab,B'
    },
    {
      strings: 'X 4 6 5 6 4',
      fingering: 'X 1 3 2 4 1',
      chordName: 'Db,maj,7,',
      enharmonicChordName: 'C#,maj,7,',
      voicingID: '9223372036995455135',
      tones: 'Db,F,Ab,C'
    },
    {
      strings: 'X 4 2 1 0 0',
      fingering: 'X 4 2 1 X X',
      chordName: 'Db,m,7,',
      enharmonicChordName: 'C#,m,7,',
      voicingID: '9223372036854810783',
      tones: 'C#,E,G#,B'
    },
    {
      strings: 'X 4 6 X X X',
      fingering: 'X 1 3 X X X',
      chordName: 'Db,,5,',
      enharmonicChordName: 'C#,,5,',
      voicingID: '9223372037928491167',
      tones: 'C#,G#'
    },
    {
      strings: 'X 4 5 3 5 X',
      fingering: 'X 2 3 1 4 X',
      chordName: 'Db,dim,7,',
      enharmonicChordName: 'C#,dim,7,',
      voicingID: '9223372037900309663',
      tones: 'C#,E,G,A#'
    },
    {
      strings: 'X 4 2 0 0 X',
      fingering: 'X 4 2 X X X',
      chordName: 'Db,m,7b5,',
      enharmonicChordName: 'C#,m,7b5,',
      voicingID: '9223372037894965407',
      tones: 'C#,E,G,B'
    },
    {
      strings: 'X 4 6 6 6 6',
      fingering: 'X 1 3 3 3 3',
      chordName: 'Db,,6,',
      enharmonicChordName: 'C#,,6,',
      voicingID: '9223372037062596767',
      tones: 'Db,F,Ab,Bb'
    },
    {
      strings: 'X 4 6 3 5 X',
      fingering: 'X 2 4 1 3 X',
      chordName: 'Db,m,6,',
      enharmonicChordName: 'C#,m,6,',
      voicingID: '9223372037900310687',
      tones: 'C#,E,G#,A#'
    }
  ],
  D: [
    {
      strings: 'X X 0 2 3 2',
      fingering: 'X X X 1 3 2',
      chordName: 'D,,,',
      enharmonicChordName: 'D,,,',
      voicingID: '9223372036925096959',
      tones: 'D,F#,A'
    },
    {
      strings: 'X X 0 2 3 1',
      fingering: 'X X X 2 3 1',
      chordName: 'D,m,,',
      enharmonicChordName: 'D,m,,',
      voicingID: '9223372036891542527',
      tones: 'D,F,A'
    },
    {
      strings: 'X X 0 2 1 2',
      fingering: 'X X X 2 1 3',
      chordName: 'D,,7,',
      enharmonicChordName: 'D,,7,',
      voicingID: '9223372036922999807',
      tones: 'D,F#,A,C'
    },
    {
      strings: 'X X 0 2 2 2',
      fingering: 'X X X 2 3 4',
      chordName: 'D,maj,7,',
      enharmonicChordName: 'D,maj,7,',
      voicingID: '9223372036924048383',
      tones: 'D,F#,A,C#'
    },
    {
      strings: 'X X 0 2 1 1',
      fingering: 'X X X 2 1 1',
      chordName: 'D,m,7,',
      enharmonicChordName: 'D,m,7,',
      voicingID: '9223372036889445375',
      tones: 'D,F,A,C'
    },
    {
      strings: 'X X 0 2 X X',
      fingering: 'X X X 2 X X',
      chordName: 'D,,5,',
      enharmonicChordName: 'D,,5,',
      voicingID: '9223372037927535615',
      tones: 'D,A'
    },
    {
      strings: 'X X 0 1 0 1',
      fingering: 'X X X 1 X 2',
      chordName: 'D,dim,7,',
      enharmonicChordName: 'D,dim,7,',
      voicingID: '9223372036888364031',
      tones: 'D,F,Ab,B'
    },
    {
      strings: 'X X 0 1 1 1',
      fingering: 'X X X 1 1 1',
      chordName: 'D,m,7b5,',
      enharmonicChordName: 'D,m,7b5,',
      voicingID: '9223372036889412607',
      tones: 'D,F,Ab,C'
    },
    {
      strings: 'X X 0 2 0 2',
      fingering: 'X X X 2 X 3',
      chordName: 'D,,6,',
      enharmonicChordName: 'D,,6,',
      voicingID: '9223372036921951231',
      tones: 'D,F#,A,B'
    },
    {
      strings: 'X X 0 2 0 1',
      fingering: 'X X X 2 X 1',
      chordName: 'D,m,6,',
      enharmonicChordName: 'D,m,6,',
      voicingID: '9223372036888396799',
      tones: 'D,F,A,B'
    }
  ],
  Eb: [
    {
      strings: 'X 6 5 3 4 3',
      fingering: 'X 4 3 1 2 1',
      chordName: 'Eb,,,',
      enharmonicChordName: 'D#,,,',
      voicingID: '9223372036959737055',
      tones: 'Eb,G,Bb'
    },
    {
      strings: 'X X 1 3 4 2',
      fingering: 'X X 1 3 4 2',
      chordName: 'Eb,m,,',
      enharmonicChordName: 'D#,m,,',
      voicingID: '9223372036926179327',
      tones: 'Eb,Gb,Bb'
    },
    {
      strings: 'X X 1 3 2 3',
      fingering: 'X X 1 3 2 4',
      chordName: 'Eb,,7,',
      enharmonicChordName: 'D#,,7,',
      voicingID: '9223372036957636607',
      tones: 'Eb,G,Bb,Db'
    },
    {
      strings: 'X X 1 3 3 3',
      fingering: 'X X 1 2 3 4',
      chordName: 'Eb,maj,7,',
      enharmonicChordName: 'D#,maj,7,',
      voicingID: '9223372036958685183',
      tones: 'Eb,G,Bb,D'
    },
    {
      strings: 'X X 1 3 2 2',
      fingering: 'X X 1 4 2 3',
      chordName: 'Eb,m,7,',
      enharmonicChordName: 'D#,m,7,',
      voicingID: '9223372036924082175',
      tones: 'Eb,Gb,Bb,Db'
    },
    {
      strings: 'X X 1 3 X X',
      fingering: 'X X 1 3 X X',
      chordName: 'Eb,,5,',
      enharmonicChordName: 'D#,,5,',
      voicingID: '9223372037927569407',
      tones: 'Eb,Bb'
    },
    {
      strings: 'X X 1 2 1 2',
      fingering: 'X X 1 3 2 4',
      chordName: 'Eb,dim,7,',
      enharmonicChordName: 'D#,dim,7,',
      voicingID: '9223372036923000831',
      tones: 'Eb,Gb,A,C'
    },
    {
      strings: 'X X 1 2 2 2',
      fingering: 'X X 1 2 3 4',
      chordName: 'Eb,m,7b5,',
      enharmonicChordName: 'D#,m,7b5,',
      voicingID: '9223372036924049407',
      tones: 'Eb,Gb,A,Db'
    },
    {
      strings: 'X X 1 3 1 3',
      fingering: 'X X 1 3 1 4',
      chordName: 'Eb,,6,',
      enharmonicChordName: 'D#,,6,',
      voicingID: '9223372036956588031',
      tones: 'Eb,G,Bb,C'
    },
    {
      strings: 'X X 1 3 1 2',
      fingering: 'X X 1 3 1 2',
      chordName: 'Eb,m,6,',
      enharmonicChordName: 'D#,m,6,',
      voicingID: '9223372036923033599',
      tones: 'Eb,Gb,Bb,C'
    }
  ],
  E: [
    {
      strings: '0 2 2 1 0 0',
      fingering: 'X 2 3 1 X X',
      chordName: 'E,,,',
      enharmonicChordName: 'E,,,',
      voicingID: '9223372036854810688',
      tones: 'E,G#,B'
    },
    {
      strings: '0 2 2 0 0 0',
      fingering: 'X 2 3 X X X',
      chordName: 'E,m,,',
      enharmonicChordName: 'E,m,,',
      voicingID: '9223372036854777920',
      tones: 'E,G,B'
    },
    {
      strings: '0 2 0 1 0 0',
      fingering: 'X 2 X 1 X X',
      chordName: 'E,,7,',
      enharmonicChordName: 'E,,7,',
      voicingID: '9223372036854808640',
      tones: 'E,G#,B,D'
    },
    {
      strings: '0 X 2 4 4 4',
      fingering: 'X X 1 2 3 4',
      chordName: 'E,maj,7,',
      enharmonicChordName: 'E,maj,7,',
      voicingID: '9223372036993321952',
      tones: 'E,G#,B,D#'
    },
    {
      strings: '0 2 0 0 0 0',
      fingering: 'X 2 X X X X',
      chordName: 'E,m,7,',
      enharmonicChordName: 'E,m,7,',
      voicingID: '9223372036854775872',
      tones: 'E,G,B,D'
    },
    {
      strings: '0 2 X X X X',
      fingering: 'X 2 X X X X',
      chordName: 'E,,5,',
      enharmonicChordName: 'E,,5,',
      voicingID: '9223372037928516672',
      tones: 'E,B'
    },
    {
      strings: '0 X 2 3 2 3',
      fingering: 'X X 1 3 2 4',
      chordName: 'E,dim,7,',
      enharmonicChordName: 'E,dim,7,',
      voicingID: '9223372036957637600',
      tones: 'E,G,Bb,C#'
    },
    {
      strings: '0 X 0 3 3 3',
      fingering: 'X X X 2 3 4',
      chordName: 'E,m,7b5,',
      enharmonicChordName: 'E,m,7b5,',
      voicingID: '9223372036958684128',
      tones: 'E,G,Bb,D'
    },
    {
      strings: '0 X 2 4 2 4',
      fingering: 'X X 1 3 1 4',
      chordName: 'E,,6,',
      enharmonicChordName: 'E,,6,',
      voicingID: '9223372036991224800',
      tones: 'E,G#,B,C#'
    },
    {
      strings: '0 2 2 0 2 X',
      fingering: 'X 2 3 X 4 X',
      chordName: 'E,m,6,',
      enharmonicChordName: 'E,m,6,',
      voicingID: '9223372037897062464',
      tones: 'E,G,B,C#'
    }
  ],
  F: [
    {
      strings: '1 3 3 2 1 1',
      fingering: '1 3 4 2 1 1',
      chordName: 'F,,,',
      enharmonicChordName: 'F,,,',
      voicingID: '9223372036889447521',
      tones: 'F,A,C'
    },
    {
      strings: '1 3 3 1 1 1',
      fingering: '1 3 4 1 1 1',
      chordName: 'F,m,,',
      enharmonicChordName: 'F,m,,',
      voicingID: '9223372036889414753',
      tones: 'F,Ab,C'
    },
    {
      strings: '1 3 1 2 4 1',
      fingering: '1 3 1 2 4 1',
      chordName: 'F,,7,',
      enharmonicChordName: 'F,,7,',
      voicingID: '9223372036892591201',
      tones: 'F,A,C,Eb'
    },
    {
      strings: '1 X 2 2 1 0',
      fingering: '1 X 3 4 2 X',
      chordName: 'F,maj,7,',
      enharmonicChordName: 'F,maj,7,',
      voicingID: '9223372036855892961',
      tones: 'F,A,C,E'
    },
    {
      strings: '1 3 1 1 1 1',
      fingering: '1 3 1 1 1 1',
      chordName: 'F,m,7,',
      enharmonicChordName: 'F,m,7,',
      voicingID: '9223372036889412705',
      tones: 'F,Ab,C,Eb'
    },
    {
      strings: '1 3 X X X X',
      fingering: '1 3 X X X X',
      chordName: 'F,,5,',
      enharmonicChordName: 'F,,5,',
      voicingID: '9223372037928516705',
      tones: 'F,C'
    },
    {
      strings: '1 X 0 1 0 X',
      fingering: '1 X X 3 X X',
      chordName: 'F,dim,7,',
      enharmonicChordName: 'F,dim,7,',
      voicingID: '9223372037894996961',
      tones: 'F,Ab,B,D'
    },
    {
      strings: '1 X 1 1 0 1',
      fingering: '1 X 2 3 X 4',
      chordName: 'F,m,7b5,',
      enharmonicChordName: 'F,m,7b5,',
      voicingID: '9223372036888365025',
      tones: 'F,Ab,B,Eb'
    },
    {
      strings: '1 X 0 2 1 X',
      fingering: '1 X X 4 3 X',
      chordName: 'F,,6,',
      enharmonicChordName: 'F,,6,',
      voicingID: '9223372037896078305',
      tones: 'F,A,C,D'
    },
    {
      strings: '1 X 0 1 1 X',
      fingering: '1 X X 3 4 X',
      chordName: 'F,m,6,',
      enharmonicChordName: 'F,m,6,',
      voicingID: '9223372037896045537',
      tones: 'F,Ab,C,D'
    }
  ],
  Gb: [
    {
      strings: '2 4 4 3 2 2',
      fingering: '1 3 4 2 1 1',
      chordName: 'Gb,,,',
      enharmonicChordName: 'F#,,,',
      voicingID: '9223372036924084354',
      tones: 'Gb,Bb,Db'
    },
    {
      strings: '2 4 4 2 2 2',
      fingering: '1 3 4 1 1 1',
      chordName: 'Gb,m,,',
      enharmonicChordName: 'F#,m,,',
      voicingID: '9223372036924051586',
      tones: 'F#,A,C#'
    },
    {
      strings: '2 4 2 3 5 2',
      fingering: '1 3 1 2 4 1',
      chordName: 'Gb,,7,',
      enharmonicChordName: 'F#,,7,',
      voicingID: '9223372036927228034',
      tones: 'F#,A#,C#,E'
    },
    {
      strings: '2 X 3 3 2 X',
      fingering: '1 X 3 4 2 X',
      chordName: 'Gb,maj,7,',
      enharmonicChordName: 'F#,maj,7,',
      voicingID: '9223372037897162722',
      tones: 'Gb,Bb,Db,F'
    },
    {
      strings: '2 4 2 2 2 2',
      fingering: '1 3 1 1 1 1',
      chordName: 'Gb,m,7,',
      enharmonicChordName: 'F#,m,7,',
      voicingID: '9223372036924049538',
      tones: 'F#,A,C#,E'
    },
    {
      strings: '2 4 X X X X',
      fingering: '1 3 X X X X',
      chordName: 'Gb,,5,',
      enharmonicChordName: 'F#,,5,',
      voicingID: '9223372037928516738',
      tones: 'F#,C#'
    },
    {
      strings: '2 X 1 2 1 X',
      fingering: '2 X 1 4 1 X',
      chordName: 'Gb,dim,7,',
      enharmonicChordName: 'F#,dim,7,',
      voicingID: '9223372037896079330',
      tones: 'F#,A,C,D#'
    },
    {
      strings: '2 X 2 2 1 0',
      fingering: '2 X 3 4 1 X',
      chordName: 'Gb,m,7b5,',
      enharmonicChordName: 'F#,m,7b5,',
      voicingID: '9223372036855892962',
      tones: 'F#,A,C,E'
    },
    {
      strings: '2 X 1 3 2 X',
      fingering: '2 X 1 4 3 X',
      chordName: 'Gb,,6,',
      enharmonicChordName: 'F#,,6,',
      voicingID: '9223372037897160674',
      tones: 'Gb,Bb,Db,Eb'
    },
    {
      strings: '2 X 1 2 2 X',
      fingering: '2 X 1 3 4 X',
      chordName: 'Gb,m,6,',
      enharmonicChordName: 'F#,m,6,',
      voicingID: '9223372037897127906',
      tones: 'F#,A,C#,D#'
    }
  ],
  G: [
    {
      strings: '3 2 0 0 3 3',
      fingering: '2 1 X X 3 4',
      chordName: 'G,,,',
      enharmonicChordName: 'G,,,',
      voicingID: '9223372036958584899',
      tones: 'G,B,D'
    },
    {
      strings: '3 5 5 3 3 3',
      fingering: '1 3 4 1 1 1',
      chordName: 'G,m,,',
      enharmonicChordName: 'G,m,,',
      voicingID: '9223372036958688419',
      tones: 'G,Bb,D'
    },
    {
      strings: '3 2 0 0 0 1',
      fingering: '3 2 X X X 1',
      chordName: 'G,,7,',
      enharmonicChordName: 'G,,7,',
      voicingID: '9223372036888330307',
      tones: 'G,B,D,F'
    },
    {
      strings: '3 X 4 4 3 X',
      fingering: '1 X 3 4 2 X',
      chordName: 'G,maj,7,',
      enharmonicChordName: 'G,maj,7,',
      voicingID: '9223372037898245091',
      tones: 'G,B,D,F#'
    },
    {
      strings: '3 5 3 3 3 3',
      fingering: '1 3 1 1 1 1',
      chordName: 'G,m,7,',
      enharmonicChordName: 'G,m,7,',
      voicingID: '9223372036958686371',
      tones: 'G,Bb,D,F'
    },
    {
      strings: '3 5 X X X X',
      fingering: '1 3 X X X X',
      chordName: 'G,,5,',
      enharmonicChordName: 'G,,5,',
      voicingID: '9223372037928516771',
      tones: 'G,D'
    },
    {
      strings: '3 X 2 3 2 X',
      fingering: '2 X 1 4 1 X',
      chordName: 'G,dim,7,',
      enharmonicChordName: 'G,dim,7,',
      voicingID: '9223372037897161699',
      tones: 'G,Bb,Db,E'
    },
    {
      strings: '3 X 3 3 2 X',
      fingering: '2 X 3 4 1 X',
      chordName: 'G,m,7b5,',
      enharmonicChordName: 'G,m,7b5,',
      voicingID: '9223372037897162723',
      tones: 'G,Bb,Db,F'
    },
    {
      strings: '3 X 0 0 0 0',
      fingering: '3 X X X X X',
      chordName: 'G,,6,',
      enharmonicChordName: 'G,,6,',
      voicingID: '9223372036854776803',
      tones: 'G,B,D,E'
    },
    {
      strings: '3 X 2 3 3 X',
      fingering: '2 X 1 3 4 X',
      chordName: 'G,m,6,',
      enharmonicChordName: 'G,m,6,',
      voicingID: '9223372037898210275',
      tones: 'G,Bb,D,E'
    }
  ],
  Ab: [
    {
      strings: '4 6 6 5 4 4',
      fingering: '1 3 4 2 1 1',
      chordName: 'Ab,,,',
      enharmonicChordName: 'G#,,,',
      voicingID: '9223372036993358020',
      tones: 'Ab,C,Eb'
    },
    {
      strings: '4 6 6 4 4 4',
      fingering: '1 3 4 1 1 1',
      chordName: 'Ab,m,,',
      enharmonicChordName: 'G#,m,,',
      voicingID: '9223372036993325252',
      tones: 'G#,B,D#'
    },
    {
      strings: '4 6 4 5 7 4',
      fingering: '1 3 1 2 4 1',
      chordName: 'Ab,,7,',
      enharmonicChordName: 'G#,,7,',
      voicingID: '9223372036996501700',
      tones: 'Ab,C,Eb,Gb'
    },
    {
      strings: '4 X 5 5 4 X',
      fingering: '1 X 3 4 2 X',
      chordName: 'Ab,maj,7,',
      enharmonicChordName: 'G#,maj,7,',
      voicingID: '9223372037899327460',
      tones: 'Ab,C,Eb,G'
    },
    {
      strings: '4 6 4 4 4 4',
      fingering: '1 3 1 1 1 1',
      chordName: 'Ab,m,7,',
      enharmonicChordName: 'G#,m,7,',
      voicingID: '9223372036993323204',
      tones: 'G#,B,D#,F#'
    },
    {
      strings: '4 6 X X X X',
      fingering: '1 3 X X X X',
      chordName: 'Ab,,5,',
      enharmonicChordName: 'G#,,5,',
      voicingID: '9223372037928516804',
      tones: 'G#,D#'
    },
    {
      strings: '4 X 3 4 3 X',
      fingering: '2 X 1 4 1 X',
      chordName: 'Ab,dim,7,',
      enharmonicChordName: 'G#,dim,7,',
      voicingID: '9223372037898244068',
      tones: 'G#,B,D,F'
    },
    {
      strings: '4 X 4 4 3 X',
      fingering: '2 X 3 4 1 X',
      chordName: 'Ab,m,7b5,',
      enharmonicChordName: 'G#,m,7b5,',
      voicingID: '9223372037898245092',
      tones: 'G#,B,D,F#'
    },
    {
      strings: '4 X 3 5 4 X',
      fingering: '2 X 1 4 3 X',
      chordName: 'Ab,,6,',
      enharmonicChordName: 'G#,,6,',
      voicingID: '9223372037899325412',
      tones: 'Ab,C,Eb,F'
    },
    {
      strings: '4 X 3 4 4 X',
      fingering: '2 X 1 3 4 X',
      chordName: 'Ab,m,6,',
      enharmonicChordName: 'G#,m,6,',
      voicingID: '9223372037899292644',
      tones: 'G#,B,D#,F'
    }
  ],
  A: [
    {
      strings: 'X 0 2 2 2 0',
      fingering: 'X X 2 3 4 X',
      chordName: 'A,,,',
      enharmonicChordName: 'A,,,',
      voicingID: '9223372036856940575',
      tones: 'A,C#,E'
    },
    {
      strings: 'X 0 2 2 1 0',
      fingering: 'X X 2 3 1 X',
      chordName: 'A,m,,',
      enharmonicChordName: 'A,m,,',
      voicingID: '9223372036855891999',
      tones: 'A,C,E'
    },
    {
      strings: 'X 0 2 0 2 0',
      fingering: 'X X 2 X 3 X',
      chordName: 'A,,7,',
      enharmonicChordName: 'A,,7,',
      voicingID: '9223372036856875039',
      tones: 'A,C#,E,G'
    },
    {
      strings: 'X 0 2 2 2 4',
      fingering: 'X X 1 1 1 3',
      chordName: 'A,maj,7,',
      enharmonicChordName: 'A,maj,7,',
      voicingID: '9223372036991158303',
      tones: 'A,C#,E,G#'
    },
    {
      strings: 'X 0 2 0 1 0',
      fingering: 'X X 2 X 1 X',
      chordName: 'A,m,7,',
      enharmonicChordName: 'A,m,7,',
      voicingID: '9223372036855826463',
      tones: 'A,C,E,G'
    },
    {
      strings: 'X 0 2 X X X',
      fingering: 'X X 2 X X X',
      chordName: 'A,,5,',
      enharmonicChordName: 'A,,5,',
      voicingID: '9223372037928486943',
      tones: 'A,E'
    },
    {
      strings: 'X 0 4 5 4 X',
      fingering: 'X X 1 3 2 X',
      chordName: 'A,dim,7,',
      enharmonicChordName: 'A,dim,7,',
      voicingID: '9223372037899325471',
      tones: 'A,C,Eb,F#'
    },
    {
      strings: 'X 0 1 0 1 X',
      fingering: 'X X 1 X 2 X',
      chordName: 'A,m,7b5,',
      enharmonicChordName: 'A,m,7b5,',
      voicingID: '9223372037896012831',
      tones: 'A,C,Eb,G'
    },
    {
      strings: 'X 0 2 2 2 2',
      fingering: 'X X 1 1 1 1',
      chordName: 'A,,6,',
      enharmonicChordName: 'A,,6,',
      voicingID: '9223372036924049439',
      tones: 'A,C#,E,F#'
    },
    {
      strings: 'X 0 4 5 5 X',
      fingering: 'X X 1 2 3 X',
      chordName: 'A,m,6,',
      enharmonicChordName: 'A,m,6,',
      voicingID: '9223372037900374047',
      tones: 'A,C,E,F#'
    }
  ],
  Bb: [
    {
      strings: 'X 1 3 3 3 1',
      fingering: 'X 1 2 3 4 1',
      chordName: 'Bb,,,',
      enharmonicChordName: 'A#,,,',
      voicingID: '9223372036891577407',
      tones: 'Bb,D,F'
    },
    {
      strings: 'X 1 3 3 2 1',
      fingering: 'X 1 3 4 2 1',
      chordName: 'Bb,m,,',
      enharmonicChordName: 'A#,m,,',
      voicingID: '9223372036890528831',
      tones: 'Bb,Db,F'
    },
    {
      strings: 'X 1 3 1 3 1',
      fingering: 'X 1 3 1 4 1',
      chordName: 'Bb,,7,',
      enharmonicChordName: 'A#,,7,',
      voicingID: '9223372036891511871',
      tones: 'Bb,D,F,Ab'
    },
    {
      strings: 'X 1 3 2 3 1',
      fingering: 'X 1 3 2 4 1',
      chordName: 'Bb,maj,7,',
      enharmonicChordName: 'A#,maj,7,',
      voicingID: '9223372036891544639',
      tones: 'Bb,D,F,A'
    },
    {
      strings: 'X 1 3 1 2 1',
      fingering: 'X 1 3 1 2 1',
      chordName: 'Bb,m,7,',
      enharmonicChordName: 'A#,m,7,',
      voicingID: '9223372036890463295',
      tones: 'Bb,Db,F,Ab'
    },
    {
      strings: 'X 1 3 X X X',
      fingering: 'X 1 3 X X X',
      chordName: 'Bb,,5,',
      enharmonicChordName: 'A#,,5,',
      voicingID: '9223372037928487999',
      tones: 'Bb,F'
    },
    {
      strings: 'X 1 2 0 2 X',
      fingering: 'X 1 2 X 3 X',
      chordName: 'Bb,dim,7,',
      enharmonicChordName: 'A#,dim,7,',
      voicingID: '9223372037897062463',
      tones: 'Bb,Db,E,G'
    },
    {
      strings: 'X 1 2 1 2 X',
      fingering: 'X 1 3 2 4 X',
      chordName: 'Bb,m,7b5,',
      enharmonicChordName: 'A#,m,7b5,',
      voicingID: '9223372037897095231',
      tones: 'Bb,Db,E,Ab'
    },
    {
      strings: 'X 1 3 0 3 X',
      fingering: 'X 1 3 X 4 X',
      chordName: 'Bb,,6,',
      enharmonicChordName: 'A#,,6,',
      voicingID: '9223372037898112063',
      tones: 'Bb,D,F,G'
    },
    {
      strings: 'X 1 3 0 2 X',
      fingering: 'X 1 4 X 3 X',
      chordName: 'Bb,m,6,',
      enharmonicChordName: 'A#,m,6,',
      voicingID: '9223372037897063487',
      tones: 'Bb,Db,F,G'
    }
  ],
  B: [
    {
      strings: 'X 2 4 4 4 2',
      fingering: 'X 1 2 3 4 1',
      chordName: 'B,,,',
      enharmonicChordName: 'B,,,',
      voicingID: '9223372036926214239',
      tones: 'B,D#,F#'
    },
    {
      strings: 'X 2 4 4 3 2',
      fingering: 'X 1 3 4 2 1',
      chordName: 'B,m,,',
      enharmonicChordName: 'B,m,,',
      voicingID: '9223372036925165663',
      tones: 'B,D,F#'
    },
    {
      strings: 'X 2 4 2 4 2',
      fingering: 'X 1 3 1 4 1',
      chordName: 'B,,7,',
      enharmonicChordName: 'B,,7,',
      voicingID: '9223372036926148703',
      tones: 'B,D#,F#,A'
    },
    {
      strings: 'X 2 4 3 4 2',
      fingering: 'X 1 3 2 4 1',
      chordName: 'B,maj,7,',
      enharmonicChordName: 'B,maj,7,',
      voicingID: '9223372036926181471',
      tones: 'B,D#,F#,A#'
    },
    {
      strings: 'X 2 0 2 0 2',
      fingering: 'X 2 X 3 X 4',
      chordName: 'B,m,7,',
      enharmonicChordName: 'B,m,7,',
      voicingID: '9223372036921950303',
      tones: 'B,D,F#,A'
    },
    {
      strings: 'X 2 4 X X X',
      fingering: 'X 1 3 X X X',
      chordName: 'B,,5,',
      enharmonicChordName: 'B,,5,',
      voicingID: '9223372037928489055',
      tones: 'B,F#'
    },
    {
      strings: 'X 2 3 1 3 X',
      fingering: 'X 2 3 1 4 X',
      chordName: 'B,dim,7,',
      enharmonicChordName: 'B,dim,7,',
      voicingID: '9223372037898144863',
      tones: 'B,D,F,G#'
    },
    {
      strings: 'X 2 3 2 3 X',
      fingering: 'X 1 3 2 4 X',
      chordName: 'B,m,7b5,',
      enharmonicChordName: 'B,m,7b5,',
      voicingID: '9223372037898177631',
      tones: 'B,D,F,A'
    },
    {
      strings: 'X 2 1 1 0 2',
      fingering: 'X 3 1 2 X 4',
      chordName: 'B,,6,',
      enharmonicChordName: 'B,,6,',
      voicingID: '9223372036921918559',
      tones: 'B,D#,F#,G#'
    },
    {
      strings: 'X 2 4 1 3 X',
      fingering: 'X 2 4 1 3 X',
      chordName: 'B,m,6,',
      enharmonicChordName: 'B,m,6,',
      voicingID: '9223372037898145887',
      tones: 'B,D,F#,G#'
    }
  ]
}

export default CHORDS;
