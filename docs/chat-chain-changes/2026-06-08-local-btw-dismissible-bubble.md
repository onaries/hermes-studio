---
date: 2026-06-08
pr: local
feature: Web UI /btw dismissible side bubble
impact: Renders /btw side-question answers as dedicated temporary sticky bubbles immediately under their side-question prompt, keeps them out of foreground run state, constrains them to answer only the side question, and lets users dismiss completed side answers with the close control or Esc. Temporary /btw bubbles are removed when leaving the session and do not reappear from persisted history.
---

Changed the client-side /btw presentation from a normal assistant message prefixed with `BTW:` to a dedicated in-memory side-question prompt bubble plus a separate ephemeral result bubble. The prompt bubble shows the side question header, the result bubble streams the answer directly underneath that prompt even while the foreground response continues below it, and the latest side-question group stays sticky near the bottom of the chat viewport so foreground streaming does not immediately push it out of view. The side run uses a separate temporary bridge worker so it does not wait behind the foreground agent run, and the side run receives explicit prompt/instruction boundaries to use the parent history only as context and answer only the side question. While a foreground run is active, the current foreground turn is removed from the /btw context to prevent the side answer from continuing that task. Both bubbles are dismissed together once complete, and the group is cleared on session navigation.
