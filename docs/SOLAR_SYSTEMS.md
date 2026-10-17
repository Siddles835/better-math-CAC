# Solar systems design

Each solar system has nine planets in Sun to Neptune order. Topics map 3-3-3 onto those planets. Topic starts are always Sun, Earth, and Saturn.

## Live

### SS1 Counting, Addition, Subtraction (`foundations`)
| Planet | Topic | Goal | Grade | Ranges | CCSS |
|--------|-------|------|-------|--------|------|
| Sun | Counting | Count to 10 with one-to-one | K | 1 to 10 | K.CC.B.4 |
| Mercury | Counting | Count within 10 in stories | K | 1 to 10 | K.CC.B.5 |
| Venus | Counting | Count to 12 | K-1 | 1 to 12 | K.CC.B.5 |
| Earth | Addition | Add within 10 | 1 | to 10 | 1.OA.C.6 |
| Mars | Addition | Add within 20 | 1 | to 20 | 1.OA.C.6 |
| Jupiter | Addition | Place value to 100 | 1-2 | to 100 | 1.NBT.B.2 |
| Saturn | Subtraction | Take away within 12 | 1 | to 12 | 1.OA.C.6 |
| Uranus | Subtraction | Take away within 20 | 1 | to 20 | 1.OA.C.6 |
| Neptune | Subtraction | Story take-away within 20 | 1-2 | to 20 | 1.OA.A.1 |

### SS2 Multiplication, Division, Algebra (`operations`)
| Planet | Topic | Goal | Grade | Ranges | CCSS |
|--------|-------|------|-------|--------|------|
| Sun | Multiplication | Equal groups | 2-3 | small facts | 2.OA.C.4 |
| Mercury | Multiplication | Known facts | 3 | to 10 | 3.OA.C.7 |
| Venus | Multiplication | Larger products | 3 | to 12 | 3.OA.C.7 |
| Earth | Division | Share evenly | 3 | exact shares | 3.OA.A.2 |
| Mars | Division | Division facts | 3 | to 10 | 3.OA.C.7 |
| Jupiter | Division | Larger shares | 3 | to 100 | 3.OA.A.2 |
| Saturn | Algebra | Unknown in x + a = b | 2-3 | small | 2.OA.A.1 |
| Uranus | Algebra | Balance one step | 3 | small | 3.OA.A.4 |
| Neptune | Algebra | Mixed one-step | 3 | mixed | 3.OA.A.4 |

## Designed, coming soon (flagged off until audits pass)

### SS3 Place Value
Topics: Tens and ones, Hundreds, Compare and order. Theme: cool blue. Generators temporarily reuse algebra/addition until dedicated generators audit clean.

### SS4 Measurement and Time
Topics: Length, Time, Money. Theme: green.

### SS5 Geometry
Topics: Shapes, Perimeter, Area. Theme: rose.

**Status: coming soon — geometry generator gap.** Do not set `comingSoon: false` until dedicated generators exist.

Why the existing `geometry` generator cannot ship SS5:

| SS5 need (3-3-3 band) | What `geometry` actually does |
|-----------------------|-------------------------------|
| Shapes (Sun–Venus): identify / count sides | **No shapes mode.** Tier 1 always emits rectangle perimeter. |
| Perimeter (Earth–Jupiter): perimeter at rising difficulty | Tier selects **skill**, not difficulty: T1=perimeter, T2=area, T3=angles. A perimeter band with tiers `[1]`, `[1,2]`, `[2,3]` would mix perimeter, area, and angles. |
| Area (Saturn–Neptune): area at rising difficulty | Same problem: tier 1 inside an “area” band still generates perimeter. |

Mapping `shapes` / `perimeter` / `area` all to `geometry` (as `generatorForTopic` does today for scaffolding) would give every planet band the **same** perimeter→area→angles schedule while labeling planets as Shapes / Perimeter / Area. That is mislabeled content, not a live solar system.

To go live, SS5 needs:

1. A **shapes** `GeneratorId` (and audit-clean items), e.g. sides/vertices of common polygons.
2. **Perimeter** and **area** generators (or a geometry mode keyed by topic) where **all tiers** stay on that skill and only number ranges ramp — matching how addition/multiplication work on SS1/SS2.
3. Classroom path plumbing: today `SolarPathId` / `PATHS` / `setClassDefaultStart` only accept `foundations` | `operations`, so a live SS5 also needs a real path id students can join.

Until then, keep `comingSoon: true` so SS5 stays out of `LIVE_SOLAR_SYSTEMS`.

### SS6 Equal Shares and Fractions
Topics: Equal shares, Halves and quarters, Fractions of a group. Theme: violet.

### SS7 Data and Graphs
Topics: Sorting, Picture graphs, Bar graphs. Theme: warm orange.

### SS8 Patterns and Skip Counting
Topics: Patterns, Skip counting, Number rules. Theme: teal.

Shipping rule: never show a coming-soon system to children. `comingSoon: true` in `src/content/solarSystems.ts` keeps them out of `LIVE_SOLAR_SYSTEMS`.
