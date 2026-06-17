# 🐿️ FuzzyNuts World — Quest Guide

> **Based on verified server data** — every coordinate, door, and NPC position confirmed from `world.json`, `npcs.json`, and quest files.

---

## 🗺️ How the World Works

After completing the tutorial, you spawn inside the **Programmer's Building** at coordinates (326, 891). This building is one of several **isolated rooms** floating in the map — they are NOT connected by walkable ground. You travel between locations using **invisible door tiles** that teleport you when you step on them.

### Spawn Building Layout

```
You are HERE → (326, 891) Programmer's Building
               Only NPC: Programmer (331, 890)
               EXIT DOOR: Step on tile (329, 898) → Mudwich Village
```

### Portal Door Map — How to Get Everywhere

All travel begins by stepping on the door tile at **(329, 898)** in your spawn building. This teleports you to **Mudwich Village** at (184, 116), the central hub of the game.

```
SPAWN BUILDING ──(329,898)──→ MUDWICH VILLAGE (184,116) ←──(184,116)── RETURN
                                    │
                    ┌───────────────┼───────────────────┐
                    │               │                   │
               Walk nearby    Walk south-east      Door (147,113)
                    │               │                   │
              ┌─────┴─────┐   ┌────┴────┐         ┌────┴────┐
              │ Forester   │   │ Lakesworld│        │ DESERT  │
              │ (216,114)  │   │ /Aynor   │        │(776,114)│
              │ Blacksmith │   │          │        │Sorcerer │
              │ (199,169)  │   │          │        │(706,101)│
              │ Miner      │   │ Door     │        │Wife     │
              │ (323,178)  │   │(290,349) │        │(735,101)│
              │ Dying      │   │    ↓     │        └─────────┘
              │ Soldier    │   │ KING     │
              │ (288,134)  │   │ BUILDING │
              └────────────┘   │(284,897) │
                               └──────────┘
```

### Key Doors You Need to Know

| Step On This Tile            | You Arrive At            | What's There                              |
| ---------------------------- | ------------------------ | ----------------------------------------- |
| **(329, 898)** in Spawn      | (184, 116) Mudwich       | Forester, Blacksmith, Miner, Village Girl |
| **(147, 113)** in Mudwich    | (776, 114) Desert        | Sorcerer, Wife                            |
| **(290, 349)** in Lakesworld | (284, 897) King Building | King, Royal Guards, Bankers               |
| **(184, 116)** in Mudwich    | (329, 898) Spawn         | Returns you to spawn building             |
| **(273, 338)** in Lakesworld | (1115, 668) East Kingdom | Scientist, Babushka                       |
| **(345, 273)** in Lakesworld | (700, 662) East Kingdom  | Babushka area                             |

---

## 📋 Quest Order — Recommended Progression

### Tier 1 — Starter Quests (No prerequisites)

These quests are in or near Mudwich Village, your first destination after spawn.

---

### 1. 🌲 Foresting

**Location:** Mudwich Village
**NPC:** Forester at (216, 114)

**How to get there:**

1. From spawn (326, 891), walk south to door tile **(329, 898)**
2. You arrive in Mudwich at (184, 116)
3. Walk **east ~32 tiles** to the Forester at (216, 114)

| Step | Action                                                    |
| ---- | --------------------------------------------------------- |
| 1    | Talk to **Forester** — he asks for 10 logs                |
| 2    | Equip an axe and chop trees nearby to collect **10 logs** |
| 3    | Return to **Forester** with 10 logs                       |
| 4    | He asks for **10 more logs**                              |
| 5    | Chop trees for 10 more logs and return                    |

**Rewards:** Iron Axe, access to Forester's store

---

### 2. ⚒️ Anvil's Echoes

**Location:** Mudwich Village
**NPC:** Blacksmith at (199, 169)

**How to get there:**

1. From Mudwich arrival (184, 116), walk **south ~53 tiles** and **east ~15 tiles**
2. Or from Forester, walk south to the Blacksmith at (199, 169)

| Step | Action                                     |
| ---- | ------------------------------------------ |
| 1    | Talk to **Blacksmith** — he needs a hammer |
| 2    | Find/craft a **hammer** and bring it back  |
| 3    | Return to **Blacksmith** with the hammer   |

**Rewards:** Smithing Boots

---

### 3. 💀 Desert Quest

**Location:** Mudwich → Lakesworld border
**NPCs:** Dying Soldier at (288, 134), Wife ("Azaria" / `villagegirl`) at building entrance (310, 264) → interior (735, 101)

**How to get there:**

1. From Mudwich (184, 116), walk **east ~104 tiles** and **south ~18 tiles** to (288, 134) for the Dying Soldier
2. From Dying Soldier (288, 134), walk **south ~130 tiles** and **east ~22 tiles** to (310, 264) for the Wife's building

| Step | Action                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------- |
| 1    | Talk to **Dying Soldier** at (288, 134) — he gives you a **CD** (demo tape)                         |
| 2    | Walk **south** from the Dying Soldier through the wilderness (~130 tiles south, ~22 tiles east)     |
| 3    | Enter the **building door at (310, 264)** — this teleports you to the Wife's interior at (733, 105) |
| 4    | Talk to **Wife** ("Azaria") inside the building — she takes the CD                                  |
| 5    | Exit the building (door takes you back to (310, 264) in the overworld)                              |
| 6    | Walk **north** back to **Dying Soldier** at (288, 134) to complete the quest                        |

**⚠️ Warning:** Do NOT use the door at (147, 113) — that leads to the **Old Lady's house**, which is unrelated to this quest!

**Rewards:** Secret reward (spoiler: nothing — it's a joke quest)
**Note:** The Dying Soldier (`lavanpc`) is hidden after quest completion

---

### 4. 🔮 Sorcery and Stuff

**Location:** Desert
**NPC:** Sorcerer at (706, 101)

**How to get there:**

1. From Mudwich (184, 116), walk to door **(147, 113)**
2. You arrive in Desert at (776, 114)
3. Walk **west ~70 tiles** to the Sorcerer at (706, 101)

| Step | Action                                                         |
| ---- | -------------------------------------------------------------- |
| 1    | Talk to **Sorcerer** — he needs 3 beads                        |
| 2    | Collect **3 beads** (dropped by enemies or found in the world) |
| 3    | Return to **Sorcerer** with 3 beads                            |

**Rewards:** Magic Staff, access to Sorcerer's store

---

### 5. 🌿 Herbalist's Desperation

**Location:** Lakesworld / Aynor
**NPC:** Herby Mc. Herb at (333, 281)

**How to get there:**

1. From Mudwich (184, 116), walk **south-east ~200 tiles** through the overworld to Lakesworld
2. Herby is at (333, 281), deep in the Aynor area

| Step | Action                                               |
| ---- | ---------------------------------------------------- |
| 1    | Talk to **Herby Mc. Herb** — he needs 3 blue lilies  |
| 2    | Collect **3 blue lilies** and return                 |
| 3    | He then needs **2 tomatoes** and **2 paprika**       |
| 4    | Collect and return — he gives you **Hot Sauce**      |
| 5    | He then needs **1 stew** (cook it using ingredients) |
| 6    | Return with the stew                                 |

**Rewards:** Mystical Potion, 1500 Foraging experience

---

### 6. ⛏️ Miner's Quest

**Location:** Lakesworld
**NPC:** Miner at (323, 178)

**How to get there:**

1. From Mudwich (184, 116), walk **south-east ~160 tiles** to (323, 178)

| Step | Action                                   |
| ---- | ---------------------------------------- |
| 1    | Talk to **Miner** — he needs 15 Niso ore |
| 2    | Mine **15 nisocore** from rocks          |
| 3    | Return to **Miner** with the ore         |

**Rewards:** Access to Miner's store, 2000 Mining experience

---

### 7. ⛏️ Miner's Quest II

**Requires:** Miner's Quest completed
**NPC:** Miner at (323, 178)

| Step | Action                                     |
| ---- | ------------------------------------------ |
| 1    | Talk to **Miner** — he needs smelted bars  |
| 2    | Bring **5 tin bars** and **5 copper bars** |
| 3    | He then needs **5 bronze bars**            |
| 4    | Return with bronze bars                    |

**Rewards:** Access to the mining cave

---

### 8. 🧪 Scientist's Potion

**Location:** East Kingdom
**NPC:** Scientist at (763, 666)

**How to get there:**

1. From Mudwich (184, 116), walk far south-east through Lakesworld
2. Use door **(273, 338)** in Lakesworld → East Kingdom (1115, 668)
3. Or use door **(345, 273)** in Lakesworld → East Kingdom (700, 662), walk east to (763, 666)

| Step | Action                                               |
| ---- | ---------------------------------------------------- |
| 1    | Talk to **Scientist** — he teaches you potion-making |

**Rewards:** Access to the Potion store, 2000 Alchemy experience

---

### 9. 👧 Scavenger

**Location:** Mudwich → Desert East
**NPCs:** Village Girl at (136, 146), Old Lady at (776, 106)

**How to get there:**

1. Village Girl is in Mudwich — walk south from (184, 116) to (136, 146)

| Step | Action                                                                                       |
| ---- | -------------------------------------------------------------------------------------------- |
| 1    | Talk to **Village Girl** at (136, 146) in Mudwich                                            |
| 2    | She sends you to the **Old Lady** at (776, 106) in the Desert                                |
| 3    | **To reach Old Lady:** use door **(147, 113)** from Mudwich → (776, 114), walk to (776, 106) |
| 4    | Bring Old Lady **2 tomatoes**, **2 strawberries**, and **1 string**                          |

**Rewards:** 7500 gold

---

### 10. 🧊 Evil Santa

**Location:** Lakesworld → Eastern Mountains
**NPC:** Sherpa at (520, 336)

**How to get there:**

1. Walk south-east from Mudwich through Lakesworld to (520, 336)

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | Talk to **Sherpa** at (520, 336)                             |
| 2    | Go through the door to find **Santa's Helper** at (749, 597) |
| 3    | Return to **Sherpa**                                         |
| 4    | Kill **Santa** (boss) at (976, 757)                          |
| 5    | Return to **Sherpa**                                         |

**Rewards:** Access to the ice world

---

### 11. 🏔️ Ancient Lands

**Location:** Lakesworld / Aynor
**NPC:** Ancient Monument at (415, 294)

**How to get there:**

1. Walk south-east from Mudwich through Lakesworld to (415, 294)

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | Talk to the **Ancient Monument** at (415, 294)        |
| 2    | Find the **Ice Sword** in the cave maze to the south  |
| 3    | Return to the **Ancient Monument** with the Ice Sword |

**Rewards:** Snow Potion, access to the mountains beyond

---

### 12. 🎨 Arts and Crafts

**Location:** East Kingdom
**NPC:** Babushka at (702, 608)

**How to get there:**

1. From Lakesworld, use door **(345, 273)** → East Kingdom (700, 662)
2. Walk north to (702, 608)

| Step | Action                                                  |
| ---- | ------------------------------------------------------- |
| 1    | Talk to **Babushka** at (702, 608)                      |
| 2    | Bring her a **Beryl Pendant**                           |
| 3    | Bring her a **Small Bowl** — she gives you a **Tomato** |
| 4    | Bring her a **Stew**                                    |

**Rewards:** Access to crafting benches

---

### 13. 🍜 Clam Chowder

**Location:** Lakesworld → East Kingdom
**NPCs:** Pretzel at (676, 359), Doctor at (698, 550), Old Lady at (919, 590)

| Step | Action                             |
| ---- | ---------------------------------- |
| 1    | Talk to **Pretzel** at (676, 359)  |
| 2    | Collect **5 clam objects**         |
| 3    | Talk to **Doctor** at (698, 550)   |
| 4    | Bring Doctor **2 clam chowder**    |
| 5    | Talk to **Old Lady** at (919, 590) |
| 6    | Bring Old Lady **2 clam chowder**  |
| 7    | Return to **Pretzel**              |

**Rewards:** 7500 gold

---

### 14. 🍣 Rick's Roll

**Location:** Kingdom Deep → Spawn Sea Building
**NPCs:** Rick at (1088, 833), Lena at (455, 924)

| Step | Action                                                     |
| ---- | ---------------------------------------------------------- |
| 1    | Find **Rick** at (1088, 833) in the Kingdom Deep           |
| 2    | Cook **5 cooked shrimp** — he gives you a **Seaweed Roll** |
| 3    | Go through a door to reach **Lena**                        |
| 4    | Deliver the Seaweed Roll to **Lena** at (455, 924)         |

**Rewards:** 1987 gold, 1987 Cooking experience

---

### 15. 🌊 Sea Activities

**Location:** Beach/West → multiple areas
**NPCs:** Sponge at (52, 310), Sea Cucumber at (691, 838) or (324, 924)

| Step | Action                                                 |
| ---- | ------------------------------------------------------ |
| 1    | Talk to **Sponge** at (52, 310) — far west beach area  |
| 2    | Talk to **Sea Cucumber** — at (691, 838) or (324, 924) |
| 3    | Return to **Sponge**                                   |
| 4    | Return to **Sea Cucumber**                             |
| 5    | Kill the **Pickle Mob** (boss) at (858, 815)           |
| 6    | Return to **Sea Cucumber** — get 1 gold                |
| 7    | Bring the gold to **Sponge**                           |

**Rewards:** 10,000 gold

---

## 🏰 Tier 2 — Advanced Quests (Prerequisites Required)

---

### 16. 👑 Royal Drama

**Requires:** None (but complex navigation)
**Location:** King Building (only reachable via door)
**NPCs:** Royal Guard at (282, 887), Rat at (1087, 698), King at (1138, 717)

⚠️ **The King NPC at (284, 884) is HIDDEN until this quest is completed!** You start by talking to the Royal Guard instead.

**How to reach the King Building:**

1. From Mudwich (184, 116), walk south-east to Lakesworld
2. Find door tile **(290, 349)** → teleports to King Building (284, 897)
3. Walk north to Royal Guard at (282, 887)

| Step | Action                                                         |
| ---- | -------------------------------------------------------------- |
| 1    | Talk to **Royal Guard** at (282, 887) in the King Building     |
| 2    | Travel to **Rat** NPC at (1087, 698) in the East Kingdom       |
| 3    | Talk to **King** (king2) at (1138, 717) — the east castle King |

**Rewards:** 10,000 gold, access to the castle
**Side Effect:** After completion, the King NPC at (284, 884) becomes visible, and the Royal Guard at (282, 887) is hidden

---

### 17. 🐱 Royal Pet

**Requires:** Royal Drama completed
**Location:** King Building
**NPCs:** King at (284, 884), Shepherd Boy at (361, 348), Flaris at (294, 489), Fisherman at (324, 318)

**How to get there:** Same as Royal Drama — door (290, 349) in Lakesworld

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | Talk to **King** at (284, 884) — he gives you **3 books**    |
| 2    | Deliver books to three NPCs (in any order):                  |
|      | → **Shepherd Boy** at (361, 348) in Lakesworld — give 1 book |
|      | → **Flaris** at (294, 489) in Beach/Swamp area — give 1 book |
|      | → **Fisherman** at (324, 318) in Lakesworld — give 1 book    |
| 3    | Return to **King** at (284, 884) in the King Building        |

**Rewards:** Cat pet 🐱

---

### 18. 💻 The Coder's Glitch

**Requires:** Foresting, Desert Quest, AND Sorcery and Stuff all completed
**Location:** Programmer Building (you spawn here!)
**NPC:** Programmer at (331, 890)

| Step | Action                                                                    |
| ---- | ------------------------------------------------------------------------- |
| 1    | Talk to **Programmer** at (331, 890) — he's right in your spawn building! |
| 2    | Kill the **Skeleton King** boss at (121, 781) in Beach/Undersea           |
| 3    | Return to **Programmer** with the **Skeleton King Talisman**              |

**Rewards:** 5000 Strength experience, Club weapon

---

### 19. 💻 The Coder's Glitch II

**Requires:** Coder's Glitch, Miner's Quest, AND Scavenger all completed
**NPC:** Programmer at (331, 890)

⚠️ After this quest, the Programmer is HIDDEN from spawn. A new NPC **Villager** appears at (198, 114) in Mudwich.

| Step | Action                                                              |
| ---- | ------------------------------------------------------------------- |
| 1    | Talk to **Programmer** at (331, 890)                                |
| 2    | Kill **Ogre Lord** at (339, 164) — drops Ogre Lord Talisman         |
| 3    | Kill **Queen Ant** at (591, 844) — drops Queen Ant Talisman         |
| 4    | Kill **Forest Dragon** at (455, 823) — drops Forest Dragon Talisman |
| 5    | Return all 3 talismans to **Programmer**                            |

**Rewards:** 7500 Accuracy exp, 4500 Strength exp, 3000 Defense exp, Iron Round Shield

---

### 20. 🧩 Coder's Fallacy

**Requires:** Coder's Glitch II, Anvil's Echoes, AND Scientist's Potion all completed
**Location:** Mudwich
**NPC:** Villager at (198, 114)

| Step | Action                                        |
| ---- | --------------------------------------------- |
| 1    | Talk to **Villager** at (198, 114) in Mudwich |
| 2    | (Quest stages depend on Villager dialogue)    |

**Rewards:** Key to a secret room

---

## 🗺️ Region Reference

| Region               | Coordinates         | How to Get There                              |
| -------------------- | ------------------- | --------------------------------------------- |
| **Spawn Building**   | (320-338, 884-898)  | Tutorial exit / door (184,116) from Mudwich   |
| **Mudwich Village**  | (100-250, 100-200)  | Door (329, 898) from Spawn                    |
| **Lakesworld**       | (260-380, 200-400)  | Walk south-east from Mudwich                  |
| **Aynor**            | (330-420, 260-340)  | Walk south from Lakesworld                    |
| **Desert**           | (700-800, 90-180)   | Door (147, 113) from Mudwich                  |
| **East Kingdom**     | (680-800, 580-700)  | Door (345, 273) or (273, 338) from Lakesworld |
| **King Building**    | (271-297, 881-898)  | Door (290, 349) from Lakesworld               |
| **Beach/West**       | (30-100, 300-420)   | Door (112, 183) from Mudwich                  |
| **Kingdom Interior** | (720-900, 700-810)  | Multiple doors from Lakesworld                |
| **Kingdom Deep**     | (900-1150, 740-840) | Through East Kingdom                          |
| **Ice/Snow Area**    | (500-700, 600-690)  | Door (379, 205) from Lakesworld               |

---

## ⚠️ Important Notes

1. **Doors are invisible** — you teleport by walking onto specific tile coordinates. There is no visual indicator.
2. **Two-way doors** — most doors work in both directions. Stepping on your arrival tile sends you back.
3. **The spawn buildings are disconnected** — the King Building, Shops, Cosmetics, Guild, and Sea buildings are separate islands you can only reach through the main world + door teleporters.
4. **Quest-gated NPCs** — some NPCs (King, Programmer, Royal Guard) appear/disappear based on quest completion. Check quest prerequisites.
5. **Warps** — once unlocked, you can warp to: Mudwich, Aynor, Lakesworld, Patsow, Crullfield, Undersea.
