# Cellular Automaton Rule Explorer

Interactive browser app for exploring 1D Wolfram elementary cellular automata with automatic complexity classification and metric analysis.

## What it does

- Run any of the 256 Wolfram elementary rules (0 to 255)
- Watch the automaton evolve row by row on an HTML canvas
- Automatically classifies the rule into one of Wolfram's four complexity classes
- Computes three mathematical metrics in real time:
  - **Langton's Lambda** — fraction of rule outputs that produce a live cell
  - **Shannon Entropy** — information content per row
  - **Lempel-Ziv Complexity** — number of distinct substrings in the output
- Predicts the complexity class *before* running, using lambda alone
- Interactive scatter plot of all 256 rules — click any dot to load it
- Rule DNA panel showing the 8-bit truth table of the current rule
- Entropy over time chart

## Presets

| Rule | Behaviour |
|---|---|
| Rule 0 | Dies immediately (Class I) |
| Rule 4 | Stable repeating pattern (Class II) |
| Rule 90 | Sierpinski triangle fractal (Class III) |
| Rule 30 | Pseudo-random chaos (Class III) |
| Rule 110 | Complex localised structures (Class IV) — Turing complete |

## Usage

Open `index.html` in a browser. No build step or dependencies needed.

```
open index.html
```

## Files

```
index.html   layout and markup
style.css    styling
metrics.js   lambda, entropy, LZ complexity, classifier, predictor
main.js      CA engine, canvas rendering, UI, scatter plot
```

## The maths

**Langton's Lambda**: fraction of rule table entries that map to a live cell.  
Rules near λ = 0.5 tend to produce complex (Class III or IV) behaviour.

**Shannon Entropy**: H = -Σ pᵢ log₂(pᵢ)  
Measures how unpredictable each generation is.

**Lempel-Ziv Complexity**: counts how many distinct substrings are needed to reconstruct the output string from left to right. Closely related to Kolmogorov complexity.
