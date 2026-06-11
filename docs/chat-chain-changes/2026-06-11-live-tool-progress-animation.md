---
date: 2026-06-11
pr: pending
feature: Live tool progress animation
impact: New live tool rows animate into the active run panel and running tools show a subtle progress sweep.
---

Adds a transition group around live tool-call rows so newly added tools slide/fade into place instead of appearing abruptly. Running tools also receive a subtle accent highlight, left-edge pulse, and sweep animation to make active progress easier to perceive. The live tool panel remains unaggregated, completed transcript grouping is unchanged, and animations respect `prefers-reduced-motion`.
