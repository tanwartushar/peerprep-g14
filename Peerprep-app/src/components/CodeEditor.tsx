import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useAuth } from '../context/AuthContext';
import { getMonacoLang, configureMonaco } from './monacoSetup';

interface CodeEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    sessionId?: string;
    currentUser?: { name: string; color: string };
    onSystemTerminate?: (reason: string) => void;
    onPartnerPresenceChange?: (isPresent: boolean) => void;
}

const PEER_ENDED_MSG = 'This Session has been ended by a peer. Returning to Dashboard.';

export const CodeEditor: React.FC<CodeEditorProps> = ({ onChange, language = 'javascript', sessionId = 'default-session', currentUser, onSystemTerminate, onPartnerPresenceChange }) => {
    const { userId } = useAuth();
    const editorRef = useRef<any>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const ydocRef = useRef<Y.Doc | null>(null);
    const partnerOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const monacoRef = useRef<any>(null);
    const monacoLang = getMonacoLang(language);

    const handleBeforeMount: BeforeMount = (monaco) => {
        monacoRef.current = monaco;
        configureMonaco(monaco);
    };

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
        let didEmitTermination = false;
        const emitTermination = (reason?: string) => {
            if (didEmitTermination) return;
            didEmitTermination = true;
            if (partnerOfflineTimerRef.current) {
                clearTimeout(partnerOfflineTimerRef.current);
                partnerOfflineTimerRef.current = null;
            }

            try {
                provider.disconnect();
            } catch {
                /* ignore */
            }
            onSystemTerminate?.(reason || PEER_ENDED_MSG);
        };

        const clearPartnerOfflineTimer = () => {
            if (partnerOfflineTimerRef.current) {
                clearTimeout(partnerOfflineTimerRef.current);
                partnerOfflineTimerRef.current = null;
            }
        };

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // const wsUrl = 'ws://localhost/api/collaboration/ws'; 
        const wsUrl = 'https://backend-server-kppd.onrender.com/api/collaboration/ws';

        const provider = new WebsocketProvider(wsUrl, sessionId, ydoc, {
            params: { userId: userId || 'anonymous' }
        });
        providerRef.current = provider;

        if (currentUser) {
            provider.awareness.setLocalStateField('user', {
                name: currentUser.name,
                color: currentUser.color
            });
        }

        const sysMap = ydoc.getMap('sys');
        sysMap.observe(() => {
            if (sysMap.get('status') === 'terminated') {
                const termReason = sysMap.get('terminateReason') as string | undefined;
                let text = (sysMap.get('reason') as string) || 'This session has ended. Returning to Dashboard.';
                if (termReason === 'Deliberate') text = 'This session was ended by your peer. Returning to the dashboard';
                else if (termReason === 'Timeout') text = 'Your peer did not connect within the time limit. Returning to dashboard';
                else if (termReason === 'Inactive') text = 'Session timed out due to 30 minutes of inactivity.';

                emitTermination(text);
            }
        });

        let hasPartnerJoined = false;

        const PARTNER_OFFLINE_DEBOUNCE_MS = 650;

        const maybeReportPartnerOfflineAfterDebounce = () => {
            if (!onPartnerPresenceChange || didEmitTermination) return;
            clearPartnerOfflineTimer();
            partnerOfflineTimerRef.current = setTimeout(async () => {
                partnerOfflineTimerRef.current = null;
                if (didEmitTermination || !onPartnerPresenceChange) return;

                const states = provider.awareness.getStates();
                if (states.size > 1) {
                    onPartnerPresenceChange(true);
                    return;
                }

                if (sysMap.get('status') === 'terminated') {
                    emitTermination(sysMap.get('reason') as string | undefined);
                    return;
                }

                try {
                    const res = await fetch(`/api/collaboration/sessions/${encodeURIComponent(sessionId)}`, {
                        credentials: 'include',
                    });
                    if (res.status === 403 || res.status === 404) {
                        emitTermination(PEER_ENDED_MSG);
                        return;
                    }
                    if (res.ok) {
                        const data = (await res.json()) as {
                            status?: string;
                            terminateReason?: string | null;
                        };
                        if (data.status === 'terminated') {
                            let text = data.terminateReason || 'This session has ended. Returning to Dashboard.';
                            if (data.terminateReason === 'Deliberate') {
                                text = 'This session was ended by your peer. Returning to the dashboard';
                            } else if (data.terminateReason === 'Timeout') {
                                text = 'Your peer did not connect within the time limit. Returning to dashboard';
                            } else if (data.terminateReason === 'Inactive') {
                                text = 'Session timed out due to 30 minutes of inactivity.';
                            }
                            emitTermination(text);
                            return;
                        }
                    }
                } catch {
                    // ignore network errors
                }

                if (didEmitTermination) return;
                const statesAfter = provider.awareness.getStates();
                if (statesAfter.size > 1) {
                    onPartnerPresenceChange(true);
                    return;
                }
                onPartnerPresenceChange(false);
            }, PARTNER_OFFLINE_DEBOUNCE_MS);
        };

        provider.awareness.on('change', () => {
            if (!onPartnerPresenceChange) return;
            if (didEmitTermination) return;
            const states = provider.awareness.getStates();
            if (states.size > 1) {
                hasPartnerJoined = true;
                clearPartnerOfflineTimer();
                onPartnerPresenceChange(true);
            } else if (hasPartnerJoined && states.size <= 1) {
                maybeReportPartnerOfflineAfterDebounce();
            }
        });

        // one-time check after WebSocket sync: if user reconnects and peer is already gone
        const onFirstSync = (synced: boolean) => {
            if (!synced || !onPartnerPresenceChange || didEmitTermination) return;
            provider.off('sync', onFirstSync);
            const states = provider.awareness.getStates();
            if (states.size <= 1) {
                // user is alone — show the disconnect modal right away
                onPartnerPresenceChange(false);
            }
        };
        provider.on('sync', onFirstSync);

        provider.on('connection-close', (event: CloseEvent) => {
            if (event?.code === 4000) {
                emitTermination(event.reason || PEER_ENDED_MSG);
            }
        });

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

    // Reactively update the Monaco model language when the prop changes
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;
        const model = editorRef.current.getModel();
        if (model) monacoRef.current.editor.setModelLanguage(model, monacoLang);
    }, [monacoLang]);

    useEffect(() => {
        return () => {
            if (partnerOfflineTimerRef.current) {
                clearTimeout(partnerOfflineTimerRef.current);
                partnerOfflineTimerRef.current = null;
            }
            bindingRef.current?.destroy();
            providerRef.current?.destroy();
            ydocRef.current?.destroy();
        };
    }, []);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Editor
                height="100%"
                defaultLanguage={monacoLang}
                language={monacoLang}
                theme="vs-dark"
                beforeMount={handleBeforeMount}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    padding: { top: 16 },
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    tabCompletion: 'on',
                }}
            />
        </div>
    );
};
