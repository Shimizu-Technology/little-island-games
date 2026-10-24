import type { ReadingScene } from "../../kit/reading";
export type Tale = { id: string; pace: "easy" | "medium" | "hard"; title: string; skill: string; pages: { text: string; scene: ReadingScene }[]; questions: { text: string; prompt: string; scenes: ReadingScene[]; difference: string[] }[] };
export const STORIES: Tale[] = [
  {
    "id": "tale-0",
    "pace": "easy",
    "title": "The cat and the hat",
    "skill": "read.short-a",
    "pages": [
      {
        "text": "The cat is on the mat.",
        "scene": {
          "subject": "cat",
          "object": "mat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The dog has a hat.",
        "scene": {
          "subject": "dog",
          "object": "hat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The hat is on the cat.",
        "scene": {
          "subject": "cat",
          "object": "hat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat can nap in the hat.",
        "scene": {
          "subject": "cat",
          "object": "hat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The dog can nap on the mat.",
        "scene": {
          "subject": "dog",
          "object": "mat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat and the dog nap.",
        "scene": {
          "subject": "cat",
          "object": "mat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The cat is on the mat.",
        "scenes": [
          {
            "subject": "cat",
            "object": "mat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "mat",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "mat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "dog"
        ],
        "prompt": "Where is the cat?"
      },
      {
        "text": "The cat is in the hat.",
        "scenes": [
          {
            "subject": "cat",
            "object": "hat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "hat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "hat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "dog"
        ],
        "prompt": "Where is the cat?"
      }
    ]
  },
  {
    "id": "tale-1",
    "pace": "easy",
    "title": "A pig in a tub",
    "skill": "read.short-i",
    "pages": [
      {
        "text": "The pig is in the tub.",
        "scene": {
          "subject": "pig",
          "object": "tub",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sun is hot.",
        "scene": {
          "subject": "sun",
          "object": "hut",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The pig can get wet.",
        "scene": {
          "subject": "pig",
          "object": "tub",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The hen is on the rug.",
        "scene": {
          "subject": "hen",
          "object": "rug",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The hen can get in the tub.",
        "scene": {
          "subject": "hen",
          "object": "tub",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The pig and the hen get wet.",
        "scene": {
          "subject": "pig",
          "object": "tub",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The pig is in the tub.",
        "scenes": [
          {
            "subject": "pig",
            "object": "tub",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "pig",
            "object": "tub",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "tub",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the pig?"
      },
      {
        "text": "The hen is on the rug.",
        "scenes": [
          {
            "subject": "hen",
            "object": "rug",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "hen",
            "object": "rug",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "rug",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "cat"
        ],
        "prompt": "Where is the hen?"
      }
    ]
  },
  {
    "id": "tale-2",
    "pace": "easy",
    "title": "The net",
    "skill": "read.short-o",
    "pages": [
      {
        "text": "The dog has a net.",
        "scene": {
          "subject": "dog",
          "object": "net",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The net is on the log.",
        "scene": {
          "subject": "net",
          "object": "log",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat can tug the net.",
        "scene": {
          "subject": "cat",
          "object": "net",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The dog can tug the net.",
        "scene": {
          "subject": "dog",
          "object": "net",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The net is in the mud.",
        "scene": {
          "subject": "net",
          "object": "mud",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat and the dog dig.",
        "scene": {
          "subject": "dog",
          "object": "mud",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The dog has a net.",
        "scenes": [
          {
            "subject": "dog",
            "object": "net",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "net",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the dog have?"
      },
      {
        "text": "The dog has a net.",
        "scenes": [
          {
            "subject": "dog",
            "object": "net",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "net",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the dog tug?"
      }
    ]
  },
  {
    "id": "tale-3",
    "pace": "easy",
    "title": "A cup for a bug",
    "skill": "read.short-u",
    "pages": [
      {
        "text": "The bug is in the cup.",
        "scene": {
          "subject": "bug",
          "object": "cup",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cup is on the mat.",
        "scene": {
          "subject": "cup",
          "object": "mat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat can tip the cup.",
        "scene": {
          "subject": "cat",
          "object": "cup",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bug is on the rug.",
        "scene": {
          "subject": "bug",
          "object": "rug",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cat can sit on the mat.",
        "scene": {
          "subject": "cat",
          "object": "mat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bug can nap on the rug.",
        "scene": {
          "subject": "bug",
          "object": "rug",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The bug is in the cup.",
        "scenes": [
          {
            "subject": "bug",
            "object": "cup",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bug",
            "object": "cup",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "cup",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the bug?"
      },
      {
        "text": "The bug is on the rug.",
        "scenes": [
          {
            "subject": "bug",
            "object": "rug",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bug",
            "object": "rug",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "rug",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "cat"
        ],
        "prompt": "Where is the bug?"
      }
    ]
  },
  {
    "id": "tale-4",
    "pace": "medium",
    "title": "The crab and the shell",
    "skill": "read.blend-start",
    "pages": [
      {
        "text": "The crab is on the rock.",
        "scene": {
          "subject": "crab",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The fish is in the pond.",
        "scene": {
          "subject": "fish",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab has a shell.",
        "scene": {
          "subject": "crab",
          "object": "shell",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The shell is in the sand.",
        "scene": {
          "subject": "shell",
          "object": "sand",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The fish can splash.",
        "scene": {
          "subject": "fish",
          "object": "pond",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab can clap and grin.",
        "scene": {
          "subject": "crab",
          "object": "rock",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The crab is on the rock.",
        "scenes": [
          {
            "subject": "crab",
            "object": "rock",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "rock",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "rock",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "cat"
        ],
        "prompt": "Where is the crab?"
      },
      {
        "text": "The shell is in the sand.",
        "scenes": [
          {
            "subject": "shell",
            "object": "sand",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "shell",
            "object": "sand",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "sand",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the shell?"
      }
    ]
  },
  {
    "id": "tale-5",
    "pace": "medium",
    "title": "A snug ship",
    "skill": "read.digraph-ck",
    "pages": [
      {
        "text": "The duck is in the ship.",
        "scene": {
          "subject": "duck",
          "object": "ship",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The frog is on the rock.",
        "scene": {
          "subject": "frog",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The frog can jump in the ship.",
        "scene": {
          "subject": "frog",
          "object": "ship",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The duck has a dish.",
        "scene": {
          "subject": "duck",
          "object": "dish",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The dish is in the ship.",
        "scene": {
          "subject": "dish",
          "object": "ship",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The duck and the frog sing.",
        "scene": {
          "subject": "duck",
          "object": "ship",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The duck is in the ship.",
        "scenes": [
          {
            "subject": "duck",
            "object": "ship",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "ship",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "ship",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the duck?"
      },
      {
        "text": "The duck has a dish.",
        "scenes": [
          {
            "subject": "duck",
            "object": "dish",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "dish",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the duck have?"
      }
    ]
  },
  {
    "id": "tale-6",
    "pace": "medium",
    "title": "The ring in the sand",
    "skill": "read.short-e",
    "pages": [
      {
        "text": "The hen has a ring.",
        "scene": {
          "subject": "hen",
          "object": "ring",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The ring is in the sand.",
        "scene": {
          "subject": "ring",
          "object": "sand",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab can dig.",
        "scene": {
          "subject": "crab",
          "object": "sand",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab has the ring.",
        "scene": {
          "subject": "crab",
          "object": "ring",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The hen can sing.",
        "scene": {
          "subject": "hen",
          "object": "sand",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab and the hen sing a song.",
        "scene": {
          "subject": "hen",
          "object": "sand",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The hen has a ring.",
        "scenes": [
          {
            "subject": "hen",
            "object": "ring",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "hen",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "ring",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the hen have?"
      },
      {
        "text": "The crab has a ring.",
        "scenes": [
          {
            "subject": "crab",
            "object": "ring",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "ring",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the crab have?"
      }
    ]
  },
  {
    "id": "tale-7",
    "pace": "medium",
    "title": "The best nest",
    "skill": "read.digraph-ck",
    "pages": [
      {
        "text": "The duck has a nest.",
        "scene": {
          "subject": "duck",
          "object": "nest",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The nest is on the rock.",
        "scene": {
          "subject": "nest",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The frog can rest in the nest.",
        "scene": {
          "subject": "frog",
          "object": "nest",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The duck can swim in the pond.",
        "scene": {
          "subject": "duck",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The frog can jump in the pond.",
        "scene": {
          "subject": "frog",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The duck and the frog rest.",
        "scene": {
          "subject": "duck",
          "object": "nest",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The duck has a nest.",
        "scenes": [
          {
            "subject": "duck",
            "object": "nest",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "nest",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the duck have?"
      },
      {
        "text": "The duck is in the pond.",
        "scenes": [
          {
            "subject": "duck",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "pond",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "frog",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "frog"
        ],
        "prompt": "Where is the duck?"
      }
    ]
  },
  {
    "id": "tale-8",
    "pace": "hard",
    "title": "A goat in a boat",
    "skill": "read.vowel-team-oa",
    "pages": [
      {
        "text": "The goat is in the boat.",
        "scene": {
          "subject": "goat",
          "object": "boat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sheep is on the road.",
        "scene": {
          "subject": "sheep",
          "object": "road",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The goat can sail to the sheep.",
        "scene": {
          "subject": "goat",
          "object": "boat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sheep has a cake.",
        "scene": {
          "subject": "sheep",
          "object": "cake",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The cake is in the boat.",
        "scene": {
          "subject": "cake",
          "object": "boat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The goat and the sheep eat the cake.",
        "scene": {
          "subject": "goat",
          "object": "boat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The goat is in the boat.",
        "scenes": [
          {
            "subject": "goat",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "goat",
            "object": "boat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the goat?"
      },
      {
        "text": "The sheep has a cake.",
        "scenes": [
          {
            "subject": "sheep",
            "object": "cake",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "sheep",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "cake",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the sheep have?"
      }
    ]
  },
  {
    "id": "tale-9",
    "pace": "hard",
    "title": "Rain on the sail",
    "skill": "read.vowel-team-oa",
    "pages": [
      {
        "text": "The toad is in the boat.",
        "scene": {
          "subject": "toad",
          "object": "boat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The rain is on the sail.",
        "scene": {
          "subject": "rain",
          "object": "boat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The toad has a coat.",
        "scene": {
          "subject": "toad",
          "object": "coat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bee is on the coat.",
        "scene": {
          "subject": "bee",
          "object": "coat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The toad can sail home.",
        "scene": {
          "subject": "toad",
          "object": "boat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bee can rest in the coat.",
        "scene": {
          "subject": "bee",
          "object": "coat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The toad is in the boat.",
        "scenes": [
          {
            "subject": "toad",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "toad",
            "object": "boat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the toad?"
      },
      {
        "text": "The bee is on the coat.",
        "scenes": [
          {
            "subject": "bee",
            "object": "coat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bee",
            "object": "coat",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "coat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "cat"
        ],
        "prompt": "Where is the bee?"
      }
    ]
  },
  {
    "id": "tale-10",
    "pace": "hard",
    "title": "A kite for the crab",
    "skill": "read.blend-start",
    "pages": [
      {
        "text": "The crab has a kite.",
        "scene": {
          "subject": "crab",
          "object": "kite",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The kite is on the rock.",
        "scene": {
          "subject": "kite",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The goat has a rope.",
        "scene": {
          "subject": "goat",
          "object": "rope",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab can take the rope.",
        "scene": {
          "subject": "crab",
          "object": "rope",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The kite can rise.",
        "scene": {
          "subject": "kite",
          "object": "rock",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The crab and the goat grin.",
        "scene": {
          "subject": "crab",
          "object": "rock",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The crab has a kite.",
        "scenes": [
          {
            "subject": "crab",
            "object": "kite",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "kite",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What does the crab have?"
      },
      {
        "text": "The crab has a rope.",
        "scenes": [
          {
            "subject": "crab",
            "object": "rope",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "hat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "rope",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "hat",
          "cat"
        ],
        "prompt": "What can the crab take?"
      }
    ]
  },
  {
    "id": "tale-11",
    "pace": "hard",
    "title": "The moon pool",
    "skill": "read.vowel-team-ea",
    "pages": [
      {
        "text": "The seal is in the pool.",
        "scene": {
          "subject": "seal",
          "object": "pool",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The moon is on the sea.",
        "scene": {
          "subject": "moon",
          "object": "sea",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sheep has a boat.",
        "scene": {
          "subject": "sheep",
          "object": "boat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sheep can see the seal.",
        "scene": {
          "subject": "sheep",
          "object": "boat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The seal can see the moon.",
        "scene": {
          "subject": "seal",
          "object": "pool",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The sheep and the seal see a star.",
        "scene": {
          "subject": "star",
          "object": "sea",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The seal is in the pool.",
        "scenes": [
          {
            "subject": "seal",
            "object": "pool",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "seal",
            "object": "pool",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "pool",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "cat"
        ],
        "prompt": "Where is the seal?"
      },
      {
        "text": "The sheep can see the seal.",
        "scenes": [
          {
            "subject": "sheep",
            "object": "seal",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "sheep",
            "object": "boat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "toad",
            "object": "seal",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "boat",
          "toad"
        ],
        "prompt": "What can the sheep see?"
      }
    ]
  }
];
