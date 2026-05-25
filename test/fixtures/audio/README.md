# Audio Fixtures

## `recording-pt-br.webm`

Brazilian Portuguese speech sample (~13s) used by E2E tests in `test/e2e/gemini.test.ts`.

**Transcript (approximate):**

> Eu tenho cinco maçãs e setenta e duas laranjas. Minha cor favorita é azul. Meu bairro é tranquilo. Meu celular está quebrado, eu preciso falar com você amanhã.

**Format:** Opus codec in WebM container, mono, 32 kbps — matches what the app's renderer produces via `MediaRecorder` in production. Sending this fixture through `transcribeAudio` exercises the webm→ogg MIME relabel path in `src/main/services/gemini.ts`.

**What it tests:**

- **Numerals rule**: speech contains `cinco` (5) and `setenta e duas` (72). Tests assert the model outputs digits, not spelled words.
- **Translation variant rule (en-US over en-GB)**: when translated to English, `cor favorita` → `favorite color` (not `favourite colour`); `bairro` → `neighborhood` (not `neighbourhood`); `celular` → `cell phone` (not `mobile phone`).

## Regenerating

1. Record a new clip in Brazilian Portuguese with the script above (or a variant — but keep `cor`, `favorita`, `bairro`, `celular`, plus two spelled-out numbers).
2. Save as `_raw-recording.<ext>` in this directory (`.mov` from Screen Recording, `.m4a` from Voice Memos / QuickTime, or any ffmpeg-readable format).
3. Convert:
   ```bash
   ffmpeg -i _raw-recording.<ext> -vn -c:a libopus -b:a 32k -ac 1 -y recording-pt-br.webm
   rm _raw-recording.*
   ```
4. Re-run `pnpm test` to confirm.
