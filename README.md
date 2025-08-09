# 🔗 Code Link

**Code Link** brings the seamless, real-time collaboration of Google Docs directly into your Visual Studio Code editor.  
Share a simple link (Room ID) and code together on the same file — instantly.  
See your collaborators' cursors, type together, and watch changes appear live.

---

## ✨ Features

- **Real-Time Collaborative Editing** — Multiple users can type, delete, and edit in the same file simultaneously.
- **Shared Cursors & Awareness** — See your collaborators' cursors, selections, and names in real time to know who is doing what.
- **Simple Link Sharing** — Start a session and share a unique, secure Room ID to invite others. No complex setup required.
- **Works on Existing Files** — No need to create new files; start a session on any file you already have open.

---

## 📖 How to Use

Code Link has two roles: **Host** and **Guest**.

### ▶ Host (Start a Collaboration Session)

1. Open the file you wish to share in VS Code.
2. Open the Command Palette:
   - **Windows/Linux**: `Ctrl + Shift + P`
   - **macOS**: `Cmd + Shift + P`
3. Run the command: **`Code Link: Start Collaboration Session`**.
4. A notification will appear with a **Room ID**. Click **Copy ID** and share it with your collaborators.

---

### 👥 Guest (Join a Collaboration Session)

1. Open VS Code (no file needs to be open initially).
2. Open the Command Palette:
   - **Windows/Linux**: `Ctrl + Shift + P`
   - **macOS**: `Cmd + Shift + P`
3. Run the command: **`Code Link: Join Collaboration Session`**.
4. Paste the **Room ID** you received from the host and press Enter.
5. A new editor tab will open with the shared code — start collaborating instantly!

---

## ⚙ Requirements

Code Link requires a running **y-websocket** server for synchronization.  
For local testing:

```bash
# Install the server
npm install -g y-websocket

# Run the server
y-websocket-server
