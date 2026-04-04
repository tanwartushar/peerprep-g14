import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

interface CodeEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    sessionId?: string;
    currentUser?: { name: string; color: string };
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ onChange, language = 'javascript', sessionId = 'default-session', currentUser }) => {
    const editorRef = useRef<any>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const ydocRef = useRef<Y.Doc | null>(null);

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // const wsUrl = 'ws://localhost/api/collaboration/ws'; 
        const wsUrl = 'https://backend-server-kppd.onrender.com/api/collaboration/ws';

        const provider = new WebsocketProvider(wsUrl, sessionId, ydoc);
        providerRef.current = provider;

        if (currentUser) {
            provider.awareness.setLocalStateField('user', {
                name: currentUser.name,
                color: currentUser.color
            });
        }

        const type = ydoc.getText('monaco');

        bindingRef.current = new MonacoBinding(
            type,
            editor.getModel()!,
            new Set([editor]),
            provider.awareness
        );

        type.observe(() => {
            onChange(type.toString());
        });
    };

    useEffect(() => {
        return () => {
            bindingRef.current?.destroy();
            providerRef.current?.destroy();
            ydocRef.current?.destroy();
        };
    }, []);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Editor
                height="100%"
                defaultLanguage={language}
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    padding: { top: 16 }
                }}
            />
        </div>
    );
};
