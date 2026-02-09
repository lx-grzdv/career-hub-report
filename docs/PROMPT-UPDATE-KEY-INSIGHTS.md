# Промпт: обновление блока «Ключевые инсайты» по скрину

Используйте этот промпт в ChatGPT (или другом ассистенте), чтобы корректно обновить секцию «Ключевые инсайты» по данным из `src/data/snapshot.ts` и `src/data/channelBase.ts`.

---

You are an analyst/editor for a Telegram folder growth report.

**CONTEXT:**
- New snapshot numbers are manually entered into: **`src/data/snapshot.ts`** (object `snapshotMembers`). No screenshot files are stored.
- Baseline channel numbers live in: **`src/data/channelBase.ts`** (field `base` for each channel; also `wave1`, `wave2`, `current` for intermediate points).
- The static HTML report lives in: **`report.html`** (preferred to update). **`index.html`** is the app shell; do NOT modify it unless explicitly requested.
- The React app (index.html → App.tsx) builds «Ключевые инсайты» dynamically from the same data; this prompt is for updating **report.html** if you use the static report.

**TASK:**  
Update the "Ключевые инсайты" section in **report.html** using ONLY the numeric data from:
1) **src/data/channelBase.ts**
2) **src/data/snapshot.ts**

**WHAT TO DO:**

1) **Read `src/data/channelBase.ts`** and build a baseline table for the 12 channels:
   `@trueredorescue`, `@sshultse`, `@pxPerson_produced`, `@nix_ux_view`, `@lx_grzdv_links`,
   `@DesignDictatorship`, `@visuaaaals`, `@tooltipp`, `@prodtomorrow`, `@yuliapohilko`,
   `@kuntsevich_design`, `@dsgn_thinking`

2) **Read `src/data/snapshot.ts`** and extract:
   - Current snapshot values for those channels (`snapshotMembers`, keys without `@`).
   - Snapshot time/date: use `SNAPSHOT_LABEL` or `SNAPSHOT_DATETIME` if present; if not, label as "latest".

3) **Recalculate and prepare metrics:**
   - **A)** Δ(11:00→11:30) — «первая волна» (from `base` to `wave1` in channelBase).
   - **B)** Δ(11:30→15:22 or 15:30) — «вторая волна» ONLY if both timestamps exist in data; otherwise omit and explicitly say why.
   - **C)** Δ(11:00 → latest snapshot) — total growth (`snapshotMembers[channel] - base`).
   - **D)** Δ(previous snapshot → latest snapshot) — late-tail ONLY if previous snapshot exists in data; otherwise omit.

   **IMPORTANT:** If baseline does not include 11:30 or 15:22/15:30, do NOT invent. Compute only what is available and clearly label missing windows.

4) **Sort channels** by total growth Δ(11:00→latest) descending.

5) **Update ONLY the HTML** inside the "Ключевые инсайты" section in **report.html**:
   - Keep the same **6 card headings:**
     1) ДОНОРЫ ЭКОСИСТЕМЫ  
     2) ГЛАВНЫЕ БЕНЕФИЦИАРЫ  
     3) НИЗКИЙ ПРИРОСТ ≠ СЛАБЫЙ КАНАЛ  
     4) ДОНОРСТВО ≠ ТАЙМИНГ  
     5) ПОСТЕПЕННАЯ РАСПАКОВКА  
     6) ВЫРАВНИВАНИЕ ЭКОСИСТЕМЫ  
   - Each card must have **2–4 bullets**.
   - Every card must cite **at least TWO concrete numbers** (values or deltas) from the recalculation.
   - **No generic term definitions.** Everything must be grounded in the computed numbers.

6) **Donor logic** MUST be based on data patterns, not assumptions:
   - If you have a known "donor activation time" (e.g. a snapshot specifically "after DD post"), you may use it.
   - If such timepoints do NOT exist in the data files, do NOT claim donor activation; instead frame as **"high overlap / saturation"** based on early-wave growth and low direct growth in later waves (cite numbers).

**OUTPUT:**  
Return only the updated HTML fragment for the "Ключевые инсайты" section, or the full updated `report.html` with that section replaced, so it can be pasted into the project.
