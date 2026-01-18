Act as a Senior Full-Stack Software Engineer and Desktop Application Architect. I need you to build a comprehensive desktop chat aggregation application.

**Project Name:** Better-Axialchat
**Goal:** Create a unified streaming chat application superior to Axelchat, inspired by "Chatterino Homies Edition."

### 1. Tech Stack & Framework
* **Core:** Electron (for cross-platform desktop capabilities).
* **Frontend:** React (for the "wonderful GUI") + Tailwind CSS (for easy styling).
* **State Management:** Zustand or Redux (to handle high-frequency chat messages).
* **Language:** TypeScript (for type safety).
* **Packaging:** Electron-builder (to create the installer).

### 2. Functional Requirements (The "Must-Haves")
Implement the following features in modular steps:

* **Multi-Platform Support:**
    * **YouTube Live:** Integration to read/write chat and see view counts.
    * **Twitch:** integration (IRC/WebSocket) to read/write chat and see view counts.
    * **Kick:** Integration to read/write chat and see view counts.
    * *(Optional/Future)* TikTok: Structure the code to allow this later, but prioritize the first three.
* **Chat Features:**
    * **Unified Chat:** Ability to see chats from all platforms in one window or split views.
    * **Posting:** The user must be able to reply to chats on specific platforms directly from the app.
    * **View Counters:** Display live view counts for connected streams.
* **System Operations:**
    * **Single Instance Lock:** Critical. If the app is open in the Tray and I click the shortcut again, DO NOT open a second window. Restore the existing window from the Tray.
    * **System Tray:** The app should minimize to the system tray, not close completely.
    * **Auto-Startup:** Option to launch on Windows boot.
    * **Installer:** Configure the build settings to output an .exe installer.

### 3. UI/UX Design Specifications
* **Theme:** "Dark Mode" focus. Backgrounds should be Deep Black (#000000) for the chat area to reduce eye strain. Accents and borders should be Purple (Neon or Royal Purple).
* **Layout:** High-density text (like Chatterino) but with modern padding and smooth fonts.
* **Widgets:** Create a space/overlay system similar to Axelchat's open-source widgets.

### 4. Step-by-Step Execution Plan
Please initialize the project structure now.
1.  Set up the `package.json` with necessary dependencies (electron, react, tmi.js for Twitch, socket.io-client, etc.).
2.  Create the `main.js` (Electron background process) specifically handling the **Single Instance Lock** and **Tray Logic**.
3.  Create the basic React UI skeleton with the Black/Purple theme applied.

Let's start by generating the project structure and the Electron Main process code.