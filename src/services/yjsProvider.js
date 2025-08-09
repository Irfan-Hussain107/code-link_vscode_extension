const vscode = require("vscode");
const Y = require("yjs");
const { WebsocketProvider } = require("y-websocket");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

function randomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

function createRoom(roomId, wsUrl, displayName) {
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider(wsUrl, roomId, ydoc);

  provider.on('status', (event) => {
    console.log('WebSocket status:', event.status);
    if (event.status === 'connected') {
      vscode.window.showInformationMessage('Connected to collaboration server!');
    } else if (event.status === 'disconnected') {
      vscode.window.showWarningMessage('Disconnected from collaboration server');
    }
  });

  provider.on('connection-error', (error) => {
    console.error('Connection error:', error);
    vscode.window.showErrorMessage('Failed to connect to collaboration server');
  });

  provider.awareness.setLocalStateField("user", {
    name: displayName || "Guest",
    color: randomColor(),
  });

  return { ydoc, provider };
}


async function bindTextDocument(vscodeUri, ydoc) {
  const ytext = ydoc.getText("codetext");
  let isUpdatingFromRemote = false; 
  let localChangeTimeout = null;

  console.log('Binding text document, current content length:', ytext.length);

  const doc = await vscode.workspace.openTextDocument(vscodeUri);

  const ytextObserver = async (event, transaction) => {
    if (transaction.local) {
      return;
    }

    console.log('Received remote change, applying...');
    isUpdatingFromRemote = true;

    try {
      const fullText = ytext.toString();
      const edit = new vscode.WorkspaceEdit();
      
      const currentDoc = await vscode.workspace.openTextDocument(vscodeUri);
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0), 
        currentDoc.lineAt(currentDoc.lineCount - 1).range.end
      );
      
      edit.replace(currentDoc.uri, fullRange, fullText);
      
      const success = await vscode.workspace.applyEdit(edit);
      if (!success) {
        console.error('Failed to apply workspace edit');
      }

    } catch (e) {
      console.error("Failed to apply remote change:", e);
    } finally {
      setTimeout(() => {
        isUpdatingFromRemote = false;
      }, 50);
    }
  };
  
  ytext.observe(ytextObserver);

  const localDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.toString() !== vscodeUri.toString()) return;
    if (isUpdatingFromRemote) {
      console.log('Skipping local change - currently updating from remote');
      return;
    }

    console.log('Processing local change, changes:', event.contentChanges.length);

    if (localChangeTimeout) {
      clearTimeout(localChangeTimeout);
    }

    localChangeTimeout = setTimeout(() => {
      if (isUpdatingFromRemote) return;

      ydoc.transact(() => {
        for (const change of event.contentChanges) {
          const offset = change.rangeOffset;
          const length = change.rangeLength;
          const text = change.text;

          console.log('Applying change to Y.js:', { offset, length, textLength: text.length });

          try {
            if (length > 0) {
              ytext.delete(offset, length);
            }
            if (text) {
              ytext.insert(offset, text);
            }
          } catch (e) {
            console.error('Error applying change to Y.js:', e);
          }
        }
      });
    }, 10); 
  });

  return {
    dispose: () => {
      if (localChangeTimeout) {
        clearTimeout(localChangeTimeout);
      }
      ytext.unobserve(ytextObserver);
      localDisposable.dispose();
    },
  };
}


function hookEditorSelectionToAwareness(provider) {
  return vscode.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    if (!editor) return;

    try {
      const cursorOffset = editor.document.offsetAt(editor.selection.active);
      provider.awareness.setLocalStateField("cursor", {
          anchor: cursorOffset,
          head: cursorOffset
      });
    } catch (e) {
      console.error('Error updating cursor awareness:', e);
    }
  });
}

const cursorDecorationType = vscode.window.createTextEditorDecorationType({});

function updateRemoteCursors(provider) {
  const states = provider.awareness.getStates();
  const remoteCursors = [];

  states.forEach((state, clientId) => {
    if (clientId === provider.awareness.clientID) return;
    
    const user = state.user;
    const cursor = state.cursor;
    if (!user || !cursor) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const position = editor.document.positionAt(cursor.anchor);
        const range = new vscode.Range(position, position);

        remoteCursors.push({
            range: range,
            renderOptions: {
                after: {
                    contentText: ` ${user.name}`,
                    color: user.color,
                    border: `1px solid ${user.color}`,
                    margin: '0 0 0 4px',
                },
            },
            hoverMessage: `**${user.name}**`
        });
    } catch(e) {
        console.error("Failed to render remote cursor", e);
    }
  });

  if (vscode.window.activeTextEditor) {
    vscode.window.activeTextEditor.setDecorations(cursorDecorationType, remoteCursors);
  }
}

module.exports = {
  createRoom,
  bindTextDocument,
  hookEditorSelectionToAwareness,
  updateRemoteCursors,
  cursorDecorationType,
};