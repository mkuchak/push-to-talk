# Push to Talk

Voice-to-text transcription and translation desktop app with auto-paste, powered by Google Gemini.

Hold a keyboard shortcut, speak, release — your words are transcribed (or translated) and instantly pasted into whatever app you're using. No clicking, no switching windows, no manual copy-paste.

## Download

1. Go to the [latest release](https://github.com/mkuchak/push-to-talk/releases/latest)
2. Download the `push-to-talk-vX.X.X-mac.dmg` file
3. Open the `.dmg` and drag **Push to Talk** to your Applications folder
4. Launch the app — if macOS blocks it, right-click the app and select **Open**

## macOS Permissions

Since Push to Talk is not signed with an Apple Developer certificate, macOS will flag it as an unidentified app. This is normal and safe — the source code is fully open.

**First launch (Gatekeeper):**
- macOS will show *"Push to Talk.app Not Opened"*. Click **Done**
- Go to **System Settings > Privacy & Security**, scroll down to the **Security** section, and click **Open Anyway** next to the Push to Talk message
- Launch the app again and confirm when prompted

**Microphone:**
- The app will prompt for microphone access on first launch — click **Allow**
- If denied, go to **System Settings > Privacy & Security > Microphone** and enable Push to Talk

**Accessibility (required for global shortcuts):**
- Go to **System Settings > Privacy & Security > Accessibility**
- Click the **+** button, navigate to Applications, and add **Push to Talk**
- This is required for the push-to-talk keyboard shortcut to work system-wide

## Get Your Gemini API Key

Push to Talk uses Google Gemini for transcription and translation. You'll need a free API key to get started:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Select a Google Cloud project (or create a new one)
5. Copy the generated API key
6. Paste it into the app's Settings screen

The free tier is generous and more than enough for personal use.

## Features

- **Push-to-talk recording** — Hold Right Cmd + Right Alt to record, release to transcribe
- **Auto-paste** — Transcribed text is automatically pasted into the active app
- **Multi-language support** — Transcribe in 7 languages or translate between any combination
- **Optional context** — Provide domain-specific context (e.g., "I am a software engineer") to improve accuracy with technical terms
- **History** — Browse, copy, and manage your last 100 transcriptions
- **Tray app** — Lives in the system tray, stays out of your way
- **Auto-updates** — Receives updates automatically via GitHub Releases

## Supported Languages

| Language | Locale |
|----------|--------|
| American English | `en-US` |
| Brazilian Portuguese | `pt-BR` |
| Colombian Spanish | `es-CO` |
| Spanish (Spain) | `es-ES` |
| French | `fr-FR` |
| German | `de-DE` |
| Hindi | `hi-IN` |

Select which languages you want in Settings. The app generates all possible transcription and translation combinations from your selection.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Hold **Right Cmd + Right Alt** | Start recording |
| Release either key | Stop recording and transcribe |
| **Right Cmd + Right Alt + Right Shift** | Show / hide window |
| **Right Cmd + Right Alt + /** | Cancel recording |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

### Installation

```bash
git clone https://github.com/mkuchak/push-to-talk.git
cd push-to-talk
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the app in development mode with hot reload.

### Build

```bash
pnpm build
```

Creates the `.dmg` distributable in `dist/`.

## Setup

1. Launch the app — it appears as a tray icon
2. Click the tray icon to open the window
3. Go to **Settings** and enter your Gemini API key
4. Select your preferred languages
5. Optionally add context to improve transcription accuracy
6. Hold **Right Cmd + Right Alt** and start talking

## How It Works

```
Hold shortcut → Record audio → Release → Gemini transcribes → Auto-paste into active app
```

1. Global keyboard listener detects the push-to-talk shortcut
2. Audio is captured from the selected microphone via MediaRecorder
3. Audio is sent to Google Gemini for transcription (or translation)
4. The transcribed text is placed on the clipboard
5. A simulated Cmd+V pastes it into the active app
6. The result is saved to history

When the source and target language are the same, Gemini performs a faithful transcription with grammar correction. When they differ, it translates while preserving the speaker's tone and intent.

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App lifecycle, IPC handlers, window management
│   ├── windows/main.ts      # Window configuration
│   └── services/
│       ├── gemini.ts        # Google Gemini API integration
│       ├── key-listener.ts  # Global keyboard shortcuts (uiohook-napi)
│       ├── paste.ts         # Cross-platform paste simulation
│       ├── store.ts         # Persistent settings (electron-store)
│       └── tray.ts          # System tray icon and menu
├── preload/
│   └── index.ts             # IPC bridge (context-isolated API)
├── renderer/
│   ├── screens/main.tsx     # React UI (4 views: main, settings, history, shortcuts)
│   └── globals.css          # Tailwind CSS theme
├── shared/
│   ├── languages.ts         # Language definitions and mode generation
│   ├── constants.ts         # Platform and environment detection
│   └── utils.ts             # Shared utilities
└── lib/
    └── electron-app/        # Electron framework utilities
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 39 |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Language | TypeScript 5.9 (strict) |
| AI | Google Gemini (`gemini-3.1-flash-lite-preview`) |
| Build | electron-vite, Vite 7, electron-builder |
| Storage | electron-store |
| Input | uiohook-napi (native keyboard hooks) |
| Linting | Biome |
| Release | release-it with conventional changelog |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start in development mode with hot reload |
| `pnpm build` | Build distributable packages |
| `pnpm release` | Create a new GitHub release |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm knip` | Find unused code and dependencies |

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/something`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feat/something`)
5. Open a Pull Request

## License

This project is free and open-source software licensed under the [MIT License](LICENSE).
