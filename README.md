# ASL Translate — Real-Time American Sign Language to English Vision AI

ASL Translate is a modern, responsive web application that utilizes live device camera input and Google Gemini's multimodal vision intelligence to recognize American Sign Language (ASL) gestures and translate them into fluent English text and synthesized speech.

---

## Features

- **Live Camera ASL Recognition**: Analyzes live video stream frames to detect handshapes, palm orientation, spatial locations, and movement trajectories in real-time.
- **Multimodal Gemini Vision Engine**: Uses `gemini-3.7-flash` with structured JSON output schemas to deliver high-precision English translations from visual ASL input.
- **Strict Browser Permission Lifecycle**:
  - Never accesses camera on initial page load.
  - Transparent user consent via native `navigator.mediaDevices.getUserMedia()`.
  - Immediate track cleanup on stop (`MediaStreamTrack.stop()`).
  - Clear permission status indicators & browser unblock instructions.
- **Accessible User Interface**:
  - High-contrast WCAG-compliant design with modern dark navy / slate palette.
  - Large readable typography for deaf and hard-of-hearing users.
  - Visual flash pulse feedback on recognized signs.
  - Optional Text-to-Speech (TTS) voice playback.
- **ASL Dictionary & Reference Guide**: Built-in searchable cheat sheet with 18+ common ASL signs and fingerspelling (A-Z) instructions to practice in front of the camera.
- **Session Translation History**: Chronological log with timestamps, confidence scores, and transcript export (Copy All / Download TXT).
- **Zero Hallucination Guard**: Requires sufficient confidence (>=65-75%) before presenting translations; informs user gently when signs need clarification ("I'm not confident about that sign. Please try again.").
- **Strict Privacy**: Ephemeral in-memory stream processing; no video footage is ever stored or uploaded permanently.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Speech API
- **Backend / API**: Express 4, Node.js (ESM), `@google/genai` SDK
- **Build Tools**: Vite 6, esbuild, tsx
- **AI Model**: Google Gemini 3.7 Flash (`gemini-3.7-flash`)

---

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# GEMINI_API_KEY: Required for Gemini AI API calls.
GEMINI_API_KEY="your-gemini-api-key-here"

# APP_URL: Optional base URL for self-referential links
APP_URL="http://localhost:3000"
```

> **Security Note**: Never commit your actual `GEMINI_API_KEY` to public repositories. The key is securely read on the server side (`server.ts`) and is never sent to or exposed in the client browser bundle.

---

## Getting Started Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your API Key

Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/) and save it to `.env`:

```bash
echo 'GEMINI_API_KEY="YOUR_ACTUAL_KEY"' > .env
```

### 3. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## Camera Permissions & Privacy

1. **Permission Flow**:
   - The landing page presents a "Start Camera & Translate" button.
   - Clicking this triggers the browser's native camera permission dialog.
   - If granted, the video stream starts and the translation loop begins.
   - If denied, a friendly guidance screen explains how to reset permission in your browser address bar.
2. **Stopping the Camera**:
   - Clicking "Stop Translation" or closing the page calls `track.stop()` on all video tracks, turning off camera hardware lights.
3. **No Permanent Storage**:
   - Frames are held ephemerally in memory during sampling and discarded immediately after processing.

---

## Deployment & GitHub Compatibility

This application is engineered for production deployment across Docker, Cloud Run, Render, Railway, Vercel/Node, or static hosting.

### Deploying to Cloud Run / Docker / Render / Heroku

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of ASL Translate"
   git remote add origin https://github.com/your-username/asl-translate.git
   git push -u origin main
   ```
2. In your hosting dashboard (e.g. Google Cloud Run, Render, Railway), set the Environment Variable:
   - `GEMINI_API_KEY` = your API key.
3. Set the build and start commands:
   - Build: `npm run build`
   - Start: `npm start`

### GitHub Pages Considerations

If you deploy the static frontend build (`dist/`) to GitHub Pages:
- Static GitHub Pages cannot run Node.js server secrets directly.
- The UI will load cleanly without blank screens, showing an informative setup banner.
- For AI translation on static hosting, you can deploy the lightweight Express backend to Cloud Run / Render / Vercel Serverless and point the client API URL to your backend.

---

## Troubleshooting & FAQ

### 1. "Camera Access Denied"
- Look for the camera/tune icon in your browser's address bar (left of the URL).
- Select **Site Settings** / **Permissions** -> change Camera to **"Allow"**.
- Click **"Try Again"**.

### 2. "I'm not confident about that sign"
- Ensure your room is well-lit.
- Hold hand signs inside the visible dashed rectangular frame.
- Keep the sign steady for 1–2 seconds to capture clear motion keyframes.

### 3. White / Blank Screen Issues
- Ensure you have built the app using `npm run build`.
- Check browser console for any network blocking extensions.

---

## Disclaimer

This application is an AI-assisted assistive tool and educational resource. It should not replace certified professional ASL interpreters for critical medical, legal, or emergency scenarios.
