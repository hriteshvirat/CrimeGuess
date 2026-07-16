# 🕵️ CrimeGuess

> **Think. Deduce. Solve.** The ultimate interactive daily mystery deduction game built natively on the Reddit Devvit platform.

CrimeGuess brings the thrill of detective work directly to Reddit feeds. Players analyze forensics evidence, follow investigation threads, and use a deterministic semantic hotness deduction engine to crack daily cases and climb the global leaderboards.

---

## 🚨 The Game Design Challenge: Slow, Solo & Friction-Heavy Crime Games

Traditional detective and mystery solving games on web or mobile platforms face two major friction points:
1. **Too Solo & Disconnected:** Players solve cases completely in isolation. There is no natural community space to compare notes, discuss plot twists, or share bragging rights.
2. **Too Time-Consuming:** Typical mystery games require installing heavy applications, reading pages of slow-loading dialogue, or waiting minutes for LLM/AI response generation. It takes too much time to get to the "Aha!" moment.

### Our Solution: The Decentralized, Bite-Sized Community Game
CrimeGuess solves these friction points through three innovative design choices:

- **Bite-Sized (5-10 Minute) Cases:** Cases are built using a compact 4-category puzzle layout (Suspect, Motive, Method, Twist). Players unlock clues using their starting Investigation Points (IP) and make rapid deductions.
- **Fast, Deterministic Hotness Engine:** Instead of heavy, slow LLM calls, CrimeGuess implements a local semantic-matching console. It resolves guesses instantly, returning hotness thermometer signals and smart clues in milliseconds.
- **Decentralized Post Architecture (Social Solving):** Headquarters acts as a lightweight launcher. Every individual case is published as its own independent Reddit post. This naturally moves player discussion, theories, and score sharing directly into the post's Reddit comment thread—turning solo deduction into a shared, social, and viral community event.

---

## 🎮 Core Features

*   **Headquarters (The Launcher):** A central launcher dashboard where users can view their detective profile, browse case archives, check out global rankings, and launch into the daily mysteries.
*   **Decentralized Playable Case Posts:** Rather than embedding everything, every playable case exists as its own independent Reddit post, ensuring lightweight loading, independent thread discussions, and correct Android Native Game Mode execution.
*   **Deterministic Deduction Console:** A semantic guessing engine that evaluates inputs against hidden case answers, returning precise hotness states (🔥 Very Hot, 🌡️ Hot, ♨️ Warm, 🧊 Cold, ❄️ Unknown) and category-smart context hints.
*   **Interactive Forensics Lab:** Unlock crucial scientific evidence (Autopsy reports, Smart-home camera logs, Fingerprints) using Investigation Points (IP) gained through gameplay.
*   **Phaser-powered UI:** High-fidelity interactive graphics rendered smoothly inside Devvit Webview entrypoints.

---

## 🏛️ System Architecture

CrimeGuess uses a clean client-server architecture powered by Devvit's server backend (Node/Hono/Redis) and a lightweight webview client (Vite/React/Phaser).

```mermaid
graph TD
    subgraph Reddit App
        HQ[Headquarters Post t3_1ux55ux] -->|Continue / Play Case| Navigate[navigateToUrl API]
        Navigate -->|Redirect| CasePost[Daily Case Post t3_1uxlg5y]
    end

    subgraph Devvit Backend Hono API
        CasePost -->|1. GET_STATE| GetState[GET_STATE Endpoint]
        GetState -->|2. Get Progress / Stats| Redis[(Redis KV Store)]
        CasePost -->|3. Submit Guess| GuessEngine[Guess Engine]
        GuessEngine -->|Deterministic Matching| Hints[Smart Category Hints]
    end
```

---

## 👾 Phaser Canvas & React Integration

To provide a high-fidelity visual experience, CrimeGuess integrates the **Phaser 3 Game Engine** seamlessly into a **React App context**.

### A. React-to-Phaser Synchronization
The integration uses a unidirectional data-flow wrapper (`PhaserGame.tsx`) that bridges React state variables with the Phaser scene lifecycle.

```mermaid
sequenceDiagram
    participant React as React Client (App.tsx)
    participant Game as React Wrapper (PhaserGame.tsx)
    participant Engine as Phaser Engine (Phaser.Game)
    participant Scene as Phaser Scene (DetectiveOffice.ts)

    React->>Game: Mounts container ref and passes ipRemaining / gameState
    Game->>Engine: Instantiates Phaser Game config on DOM ref
    Engine->>Scene: Triggers boot & boots scene scenes
    React->>Game: React state updates (Category unlocked / IP spent)
    Game->>Scene: Invokes scene.updateIP(ip) and scene.init(data)
    Scene->>Scene: Dynamically redraws Polaroids, checkmarks, & plays audio synth
```

### B. Phaser Scene Operations
- **`LauncherScene.ts`:** Animates the introductory CrimeGuess cinematic typewriter text, retro CRT flickering scanlines, and triggers the animated dashboard begin button.
- **`DetectiveOffice.ts`:** Renders the interactive detective office desk containing Polaroids representing suspects, motives, methods, and twists. Intercepts card clicks to switch React sidebars, and draws checkmarks when categories are solved.
- **`SolvedScene.ts`:** Animates the end-of-case manila folders and slams a crimson `CLOSED` ink stamp accompanied by sub-bass thud particles and synthesizer audio feedback.

---

## 🔍 Smart Guess Engine & Hotness Meter

To ensure a fast, self-contained, and highly responsive gameplay experience, CrimeGuess implements an offline guessing algorithm that maps inputs to semantic hotness levels:

| Guess Hotness | Score/Sim | Meaning / Response |
| :--- | :---: | :--- |
| **Correct** | 100% | Unlocks the clue folder card! |
| **🔥 Very Hot** | 95% | "You're almost there." |
| **🌡️ Hot** | 80% | "Very close." |
| **♨️ Warm** | 55% | "You're thinking in the right direction." |
| **🧊 Cold** | 25% | "Related idea, but still far." |
| **❄️ Unknown** | 5% | "No meaningful connection found." |

### Category-Smart Hints
When players guess items from similar motives or professional fields, the engine responds with intelligent semantic suggestions:
*   *Profession detected:* "Wrong profession."
*   *Political connection:* "Think more specific."
*   *Murder delivery:* "Correct murder category. Different delivery method."
*   *Motive family:* "Correct motive family. Think beyond financial gain."

---

## 🗄️ Case Archive

| Date | Case Title | Difficulty | Est. Solve Time | Description |
| :--- | :--- | :---: | :---: | :--- |
| **2026-07-16** | Case #2: "The Last Flight" | ★★★★☆ | 10-15 mins | Autopsy of a flight pilot's mid-air poisoning. |
| **2026-07-15** | Case #1: "The Vault of Silicon Tears" | ★★★☆☆ | 5-10 mins | Sealed room cyber-murder of Marcus Sterling. |

---

## 🛠️ Installation & Playtest Setup

### Prerequisites
*   Node.js v18+
*   Reddit Devvit CLI configured (`npm i -g @devvit/cli`)

### Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/hriteshvirat/detective-daily.git
   cd detective-daily
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the playtest dev server:
   ```bash
   npm run dev
   ```
4. Access the playtest links outputted by the Devvit terminal in your browser or developer portal.

---

## 📄 License
This project is licensed under the MIT License.
