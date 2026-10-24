import type { ReadingScene } from "../../kit/reading";
export type Tale = { id: string; pace: "easy" | "medium" | "hard"; title: string; skill: string; pages: { text: string; scene: ReadingScene }[]; questions: { text: string; prompt: string; scenes: ReadingScene[]; difference: string[] }[] };
export const STORIES: Tale[] = [
  {
    "id": "tale-0",
    "pace": "easy",
    "title": "The hat hop",
    "skill": "read.short-a",
    "pages": [
      {
        "text": "Cat has a big red hat.",
        "scene": {
          "subject": "cat",
          "object": "hat",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Pup sat on the mat.",
        "scene": {
          "subject": "dog",
          "object": "mat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Pup can hop and hop.",
        "scene": {
          "subject": "dog",
          "object": "mat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Hop, hop, hop! Pup hit the hat.",
        "scene": {
          "subject": "dog",
          "object": "hat",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "The red hat is on Pup!",
        "scene": {
          "subject": "hat",
          "object": "dog",
          "relation": "on",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Cat and Pup nap in the sun.",
        "scene": {
          "subject": "cat",
          "object": "sun",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The hat is on the dog.",
        "prompt": "Where is the red hat?",
        "scenes": [
          {
            "subject": "hat",
            "object": "dog",
            "relation": "on",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "hat",
            "object": "cat",
            "relation": "on",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "hat",
            "object": "dog",
            "relation": "under",
            "color": "red",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "cat",
          "under"
        ]
      },
      {
        "text": "The dog is on the mat.",
        "prompt": "Where did Pup sit?",
        "scenes": [
          {
            "subject": "dog",
            "object": "mat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "rug",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "cat",
            "object": "mat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "rug",
          "cat"
        ]
      }
    ]
  },
  {
    "id": "tale-1",
    "pace": "easy",
    "title": "Pig is hot",
    "skill": "read.short-u",
    "pages": [
      {
        "text": "The sun is hot. Pig is hot.",
        "scene": {
          "subject": "pig",
          "object": "sun",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Pig can get in the tub.",
        "scene": {
          "subject": "pig",
          "object": "tub",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Hen has a cup.",
        "scene": {
          "subject": "hen",
          "object": "cup",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Hen can dip the cup in the tub.",
        "scene": {
          "subject": "hen",
          "object": "tub",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Pig is wet. Hen is wet. Yes!",
        "scene": {
          "subject": "pig",
          "object": "tub",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Pig and Hen hug in the sun.",
        "scene": {
          "subject": "pig",
          "object": "hen",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The pig is in the tub.",
        "prompt": "Where is Pig?",
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
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "hen",
            "object": "tub",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "hen"
        ]
      },
      {
        "text": "The hen has a cup.",
        "prompt": "What has Hen got?",
        "scenes": [
          {
            "subject": "hen",
            "object": "cup",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "hen",
            "object": "mug",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "pig",
            "object": "cup",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "mug",
          "pig"
        ]
      }
    ]
  },
  {
    "id": "tale-2",
    "pace": "easy",
    "title": "Bug in a cup",
    "skill": "read.short-u",
    "pages": [
      {
        "text": "A bug sat on a rug.",
        "scene": {
          "subject": "bug",
          "object": "rug",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Cat ran to the rug.",
        "scene": {
          "subject": "cat",
          "object": "rug",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bug hid in a cup.",
        "scene": {
          "subject": "bug",
          "object": "cup",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Cat can tip the cup.",
        "scene": {
          "subject": "cat",
          "object": "cup",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Is the bug in the cup? Up, up, up!",
        "scene": {
          "subject": "bug",
          "object": "cat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The bug is on top of Cat. Hum, hum!",
        "scene": {
          "subject": "bug",
          "object": "cat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The bug is in the cup.",
        "prompt": "Where is the bug?",
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
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bug",
            "object": "box",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "box"
        ]
      },
      {
        "text": "The bug is on the cat.",
        "prompt": "Where can the bug hum?",
        "scenes": [
          {
            "subject": "bug",
            "object": "cat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bug",
            "object": "dog",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bug",
            "object": "cat",
            "relation": "under",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "dog",
          "under"
        ]
      }
    ]
  },
  {
    "id": "tale-3",
    "pace": "easy",
    "title": "Fox in a box",
    "skill": "read.short-o",
    "pages": [
      {
        "text": "Fox has a big box.",
        "scene": {
          "subject": "fox",
          "object": "box",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Fox can hop in the box.",
        "scene": {
          "subject": "fox",
          "object": "box",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Dog ran up to the box.",
        "scene": {
          "subject": "dog",
          "object": "box",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Is Fox in the box? Dog can not get Fox.",
        "scene": {
          "subject": "dog",
          "object": "box",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Pop! Fox is up on top of Dog!",
        "scene": {
          "subject": "fox",
          "object": "dog",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Dog and Fox run to the log.",
        "scene": {
          "subject": "dog",
          "object": "log",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The fox is in the box.",
        "prompt": "Where is Fox?",
        "scenes": [
          {
            "subject": "fox",
            "object": "box",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "fox",
            "object": "box",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "dog",
            "object": "box",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "dog"
        ]
      },
      {
        "text": "The fox is on the dog.",
        "prompt": "Fox is on top. On top of what?",
        "scenes": [
          {
            "subject": "fox",
            "object": "dog",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "fox",
            "object": "dog",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "fox",
            "object": "log",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "log"
        ]
      }
    ]
  },
  {
    "id": "tale-4",
    "pace": "medium",
    "title": "Crab and the snug shell",
    "skill": "read.digraph-sh",
    "pages": [
      {
        "text": "Crab is on a rock in the sand.",
        "scene": {
          "subject": "crab",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Crab has to get a shell.",
        "scene": {
          "subject": "crab",
          "object": "rock",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "This shell is big. It is not snug.",
        "scene": {
          "subject": "crab",
          "object": "shell",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "This shell is little. It is not snug.",
        "scene": {
          "subject": "crab",
          "object": "shell",
          "relation": "beside",
          "color": "coral",
          "size": "little"
        }
      },
      {
        "text": "This shell is just the best! Crab can hide in the shell.",
        "scene": {
          "subject": "crab",
          "object": "shell",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Fish can swim up. Crab and Fish clap and grin.",
        "scene": {
          "subject": "crab",
          "object": "fish",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The crab is in the shell.",
        "prompt": "Where can Crab hide?",
        "scenes": [
          {
            "subject": "crab",
            "object": "shell",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "shell",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "fish",
            "object": "shell",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "fish"
        ]
      },
      {
        "text": "The crab is on the rock.",
        "prompt": "Where was Crab?",
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
            "subject": "crab",
            "object": "sand",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "sand"
        ]
      }
    ]
  },
  {
    "id": "tale-5",
    "pace": "medium",
    "title": "The splash ship",
    "skill": "read.blend-start",
    "pages": [
      {
        "text": "Duck has a red ship.",
        "scene": {
          "subject": "duck",
          "object": "ship",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Frog can jump in the ship.",
        "scene": {
          "subject": "frog",
          "object": "ship",
          "relation": "in",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Duck and Frog sing a long song.",
        "scene": {
          "subject": "duck",
          "object": "frog",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Then, a big wave! Splash!",
        "scene": {
          "subject": "duck",
          "object": "ship",
          "relation": "in",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Frog is wet. Duck is wet. The ship is fine.",
        "scene": {
          "subject": "frog",
          "object": "ship",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "They sing the song with a splash, splash, splash.",
        "scene": {
          "subject": "duck",
          "object": "frog",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The frog is in the ship.",
        "prompt": "Where can Frog jump?",
        "scenes": [
          {
            "subject": "frog",
            "object": "ship",
            "relation": "in",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "frog",
            "object": "ship",
            "relation": "on",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "ship",
            "relation": "in",
            "color": "red",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "duck"
        ]
      },
      {
        "text": "Duck has a red ship.",
        "prompt": "What has Duck got?",
        "scenes": [
          {
            "subject": "duck",
            "object": "ship",
            "relation": "beside",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "ship",
            "relation": "beside",
            "color": "blue",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "boat",
            "relation": "beside",
            "color": "red",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "blue",
          "boat"
        ]
      }
    ]
  },
  {
    "id": "tale-6",
    "pace": "medium",
    "title": "The lost ring",
    "skill": "read.ng",
    "pages": [
      {
        "text": "Hen has a ring.",
        "scene": {
          "subject": "hen",
          "object": "ring",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Then the ring is lost in the sand.",
        "scene": {
          "subject": "ring",
          "object": "sand",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Hen is sad. Hen can not sing.",
        "scene": {
          "subject": "hen",
          "object": "sand",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Crab can dig and dig and dig.",
        "scene": {
          "subject": "crab",
          "object": "sand",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Crab has the ring!",
        "scene": {
          "subject": "crab",
          "object": "ring",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Hen can grin. Hen and Crab sing a long song.",
        "scene": {
          "subject": "hen",
          "object": "crab",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The ring is in the sand.",
        "prompt": "Where is the ring?",
        "scenes": [
          {
            "subject": "ring",
            "object": "sand",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "ring",
            "object": "sand",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "shell",
            "object": "sand",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "shell"
        ]
      },
      {
        "text": "The crab has the ring.",
        "prompt": "What has Crab got?",
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
            "object": "shell",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "hen",
            "object": "ring",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "shell",
          "hen"
        ]
      }
    ]
  },
  {
    "id": "tale-7",
    "pace": "medium",
    "title": "The best nest",
    "skill": "read.blend-end",
    "pages": [
      {
        "text": "Duck has a nest on a rock.",
        "scene": {
          "subject": "nest",
          "object": "rock",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Duck can swim in the pond.",
        "scene": {
          "subject": "duck",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Frog can hop in the nest to rest.",
        "scene": {
          "subject": "frog",
          "object": "nest",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Duck is back. Frog in the nest?",
        "scene": {
          "subject": "duck",
          "object": "nest",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Frog can jump in the pond. Plop!",
        "scene": {
          "subject": "frog",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Duck can rest in the nest. That is best.",
        "scene": {
          "subject": "duck",
          "object": "nest",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The frog is in the nest.",
        "prompt": "What was in the nest?",
        "scenes": [
          {
            "subject": "frog",
            "object": "nest",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "frog",
            "object": "nest",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "duck",
            "object": "nest",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "duck"
        ]
      },
      {
        "text": "The frog is in the pond.",
        "prompt": "Where can Frog jump?",
        "scenes": [
          {
            "subject": "frog",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "fish",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "frog",
            "object": "pond",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "fish",
          "beside"
        ]
      }
    ]
  },
  {
    "id": "tale-8",
    "pace": "hard",
    "title": "Goat and the cake boat",
    "skill": "read.vowel-team-oa",
    "pages": [
      {
        "text": "Goat can bake a cake.",
        "scene": {
          "subject": "goat",
          "object": "cake",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Goat and the cake sail in a boat.",
        "scene": {
          "subject": "goat",
          "object": "boat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Rain! The rain is on the sail.",
        "scene": {
          "subject": "rain",
          "object": "boat",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Goat has a coat for the cake.",
        "scene": {
          "subject": "goat",
          "object": "coat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Sheep is on the beach. The cake is not wet!",
        "scene": {
          "subject": "sheep",
          "object": "sand",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Goat and Sheep eat the cake in the boat.",
        "scene": {
          "subject": "goat",
          "object": "sheep",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The goat is in the boat.",
        "prompt": "Where can Goat sail?",
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
            "subject": "sheep",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "sheep"
        ]
      },
      {
        "text": "The rain is on the boat.",
        "prompt": "Where is the rain?",
        "scenes": [
          {
            "subject": "rain",
            "object": "boat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "rain",
            "object": "boat",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "sun",
            "object": "boat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "beside",
          "sun"
        ]
      }
    ]
  },
  {
    "id": "tale-9",
    "pace": "hard",
    "title": "A leaf for Toad",
    "skill": "read.vowel-team-ea",
    "pages": [
      {
        "text": "Toad is on the road.",
        "scene": {
          "subject": "toad",
          "object": "road",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Rain! Toad has to get a coat.",
        "scene": {
          "subject": "toad",
          "object": "road",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Toad can see a big leaf.",
        "scene": {
          "subject": "toad",
          "object": "leaf",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "The leaf is a coat for Toad!",
        "scene": {
          "subject": "leaf",
          "object": "toad",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Bee is wet. Bee can sit on the leaf.",
        "scene": {
          "subject": "bee",
          "object": "leaf",
          "relation": "on",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Toad and Bee see the rain stop.",
        "scene": {
          "subject": "toad",
          "object": "bee",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The leaf is on the toad.",
        "prompt": "Where is the leaf?",
        "scenes": [
          {
            "subject": "leaf",
            "object": "toad",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "leaf",
            "object": "bee",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "leaf",
            "object": "toad",
            "relation": "under",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "bee",
          "under"
        ]
      },
      {
        "text": "The bee is on the leaf.",
        "prompt": "Where can Bee sit?",
        "scenes": [
          {
            "subject": "bee",
            "object": "leaf",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bee",
            "object": "leaf",
            "relation": "under",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "bee",
            "object": "coat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "coat"
        ]
      }
    ]
  },
  {
    "id": "tale-10",
    "pace": "hard",
    "title": "The kite in the tree",
    "skill": "read.r-controlled-or",
    "pages": [
      {
        "text": "Crab has a red kite.",
        "scene": {
          "subject": "crab",
          "object": "kite",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "A storm! The kite can rise up, up, up.",
        "scene": {
          "subject": "kite",
          "object": "crab",
          "relation": "beside",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Zoom! The kite is in the tree.",
        "scene": {
          "subject": "kite",
          "object": "tree",
          "relation": "in",
          "color": "red",
          "size": "big"
        }
      },
      {
        "text": "Goat has a long rope.",
        "scene": {
          "subject": "goat",
          "object": "rope",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Goat can reach the kite with the rope.",
        "scene": {
          "subject": "goat",
          "object": "tree",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Crab and Goat take the kite to the beach.",
        "scene": {
          "subject": "crab",
          "object": "goat",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The kite is in the tree.",
        "prompt": "Where is the kite?",
        "scenes": [
          {
            "subject": "kite",
            "object": "tree",
            "relation": "in",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "kite",
            "object": "tree",
            "relation": "under",
            "color": "red",
            "size": "big"
          },
          {
            "subject": "rope",
            "object": "tree",
            "relation": "in",
            "color": "red",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "under",
          "rope"
        ]
      },
      {
        "text": "The goat has a rope.",
        "prompt": "What has Goat got?",
        "scenes": [
          {
            "subject": "goat",
            "object": "rope",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "goat",
            "object": "kite",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "crab",
            "object": "rope",
            "relation": "beside",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "kite",
          "crab"
        ]
      }
    ]
  },
  {
    "id": "tale-11",
    "pace": "hard",
    "title": "The moon pool",
    "skill": "read.vowel-team-oo",
    "pages": [
      {
        "text": "Seal can swim in a cool pool.",
        "scene": {
          "subject": "seal",
          "object": "pond",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Soon the moon is up.",
        "scene": {
          "subject": "moon",
          "object": "pond",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Sheep is in a boat on the sea.",
        "scene": {
          "subject": "sheep",
          "object": "boat",
          "relation": "in",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Sheep can see Seal in the pool.",
        "scene": {
          "subject": "sheep",
          "object": "seal",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Seal can see a star.",
        "scene": {
          "subject": "seal",
          "object": "star",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      },
      {
        "text": "Seal and Sheep see the moon and the star.",
        "scene": {
          "subject": "seal",
          "object": "moon",
          "relation": "beside",
          "color": "coral",
          "size": "big"
        }
      }
    ],
    "questions": [
      {
        "text": "The seal is in the pool.",
        "prompt": "Where can Seal swim?",
        "scenes": [
          {
            "subject": "seal",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "seal",
            "object": "pond",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "sheep",
            "object": "pond",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "sheep"
        ]
      },
      {
        "text": "The sheep is in the boat.",
        "prompt": "Where is Sheep?",
        "scenes": [
          {
            "subject": "sheep",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "sheep",
            "object": "boat",
            "relation": "on",
            "color": "coral",
            "size": "big"
          },
          {
            "subject": "goat",
            "object": "boat",
            "relation": "in",
            "color": "coral",
            "size": "big"
          }
        ],
        "difference": [
          "",
          "on",
          "goat"
        ]
      }
    ]
  }
];
