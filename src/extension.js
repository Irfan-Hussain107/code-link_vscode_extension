const vscode = require('vscode');
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

// Import the service file
const yjsProvider = require("./services/yjsProvider");

// A Map to store active session details, keyed by the document's URI as a string.
const activeSessions = new Map();

function activate(context) {
    vscode.window.showInformationMessage("Hello from Code Link I am running");
        
    console.log('Congratulations, your extension "code-link" is now active!');

    // =================================================================================
    // COMMAND 1: Start a Collaboration Session (for the Host)
    // =================================================================================
    const startSessionCommand = vscode.commands.registerCommand('codeLink.startSession', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("Please open a file to start a collaboration session.");
            return;
        }

        const docUri = editor.document.uri;
        if (activeSessions.has(docUri.toString())) {
            vscode.window.showWarningMessage("A session is already active for this file.");
            return;
        }

        const roomId = nanoid();
        const displayName = vscode.workspace.getConfiguration('codeLink').get('displayName') || `User-${nanoid(4)}`;
        const wsUrl = 'wss://code-link-server.onrender.com';

        const { provider, ydoc } = yjsProvider.createRoom(roomId, wsUrl, displayName);
        
        // Wait for connection before binding
        provider.on('status', async (event) => {
            if (event.status === 'connected') {
                console.log('Host connected, initializing document...');
                
                // Initialize the shared document with current content
                const ytext = ydoc.getText("codetext");
                const currentContent = editor.document.getText();
                
                if (ytext.length === 0 && currentContent) {
                    ytext.insert(0, currentContent);
                    console.log('Initialized shared document with content:', currentContent.length, 'characters');
                }
                
                const binding = await yjsProvider.bindTextDocument(docUri, ydoc);
                const awarenessHook = yjsProvider.hookEditorSelectionToAwareness(provider);

                provider.awareness.on('change', () => {
                    yjsProvider.updateRemoteCursors(provider);
                });

                activeSessions.set(docUri.toString(), { provider, ydoc, binding, awarenessHook });
                
                const action = await vscode.window.showInformationMessage(
                    `Collaboration session started! Share this Room ID with others: ${roomId}`,
                    'Copy ID'
                );

                if (action === 'Copy ID') {
                    vscode.env.clipboard.writeText(roomId);
                    vscode.window.showInformationMessage("Room ID copied to clipboard!");
                }
            }
        });
    });

    // =================================================================================
    // COMMAND 2: Join a Collaboration Session (for the Guest)
    // =================================================================================
    const joinSessionCommand = vscode.commands.registerCommand('codeLink.joinSession', async () => {
        const roomId = await vscode.window.showInputBox({
            prompt: "Enter the Room ID to join the collaboration session",
            placeHolder: "e.g., a3b9d7c1e8"
        });

        if (!roomId) return;

        const displayName = vscode.workspace.getConfiguration('codeLink').get('displayName') || `User-${nanoid(4)}`;
        const wsUrl = 'wss://code-link-server.onrender.com';

        vscode.window.showInformationMessage(`Connecting to room ${roomId}...`);

        const { provider, ydoc } = yjsProvider.createRoom(roomId, wsUrl, displayName);
        const ytext = ydoc.getText("codetext");

        // Wait for connection and then sync
        provider.on('status', async (event) => {
            if (event.status === 'connected') {
                console.log('Guest connected, waiting for sync...');
                
                // Give it a moment to sync, then check content
                setTimeout(async () => {
                    const initialContent = ytext.toString();
                    console.log('Synced content length:', initialContent.length);
                    console.log('Synced content:', initialContent.substring(0, 100) + '...');
                    
                    try {
                        // Create new document with the synced content
                        const doc = await vscode.workspace.openTextDocument({ 
                            content: initialContent,
                            language: 'plaintext' // You can detect language from file extension if needed
                        });
                        const editor = await vscode.window.showTextDocument(doc, { preview: false });
                        const docUri = editor.document.uri;

                        // Bind the document
                        const binding = await yjsProvider.bindTextDocument(docUri, ydoc);
                        const awarenessHook = yjsProvider.hookEditorSelectionToAwareness(provider);
                        
                        provider.awareness.on('change', () => {
                            yjsProvider.updateRemoteCursors(provider);
                        });

                        activeSessions.set(docUri.toString(), { provider, ydoc, binding, awarenessHook });

                        vscode.window.showInformationMessage(`Successfully joined room ${roomId}!`);
                    } catch (error) {
                        console.error('Error creating synced document:', error);
                        vscode.window.showErrorMessage('Failed to sync document content');
                    }
                }, 1000); // Wait 1 second for sync
            }
        });

        // Also handle connection errors
        provider.on('connection-error', (error) => {
            console.error('Connection error:', error);
            vscode.window.showErrorMessage(`Failed to connect to room ${roomId}`);
        });
    });

    // =================================================================================
    // COMMAND 3: Stop a Collaboration Session
    // =================================================================================
    const stopSessionCommand = vscode.commands.registerCommand('codeLink.stopSession', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor.");
            return;
        }

        const docUri = editor.document.uri;
        const session = activeSessions.get(docUri.toString());
        if (!session) {
            vscode.window.showErrorMessage("No active session for this file.");
            return;
        }

        session.provider.destroy();
        session.binding.dispose();
        session.awarenessHook.dispose();
        activeSessions.delete(docUri.toString());

        vscode.window.showInformationMessage("Collaboration session stopped.");
        
        // Clear old decorations
        const { cursorDecorationType } = require("./services/yjsProvider");
        editor.setDecorations(cursorDecorationType, []);
    });

    context.subscriptions.push(startSessionCommand, joinSessionCommand, stopSessionCommand);
}

function deactivate() {
    for (const session of activeSessions.values()) {
        session.provider.destroy();
        session.binding.dispose();
        session.awarenessHook.dispose();
    }
    activeSessions.clear();
}

module.exports = {
    activate,
    deactivate
};