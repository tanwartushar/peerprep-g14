import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Code2,
  Layout,
  Settings,
  LogOut,
  MessageSquare,
  Play,
} from "lucide-react";
import { Button } from "../components/Button";
import { CodeEditor } from "../components/CodeEditor";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import "./Workspace.css";

interface LocationState {
  requestId?: string;
  difficulty?: string;
  topic?: string;
  programmingLanguage?: string;
  peerUserId?: string;
  peerMatchRequestId?: string;
  peerRequestedDifficulty?: string | null;
  matchingType?: "same_difficulty" | "downward" | null;
  timeAvailableMinutes?: number | null;
  peerTimeAvailableMinutes?: number | null;
  matchedTimeAvailableMinutes?: number | null;
}

function formatDifficultyLabel(d: string | undefined): string {
  if (!d) return "—";
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function formatMinutesLine(m: number | null | undefined): string {
  if (m == null) return "Not specified";
  return `${m} min`;
}

export const Workspace: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { data: profile } = useCurrentUserProfile();
  const currentUser = React.useMemo(() => {
    const colors = [
      "#f56565",
      "#ed8936",
      "#ecc94b",
      "#48bb78",
      "#38b2ac",
      "#4299e1",
      "#667eea",
      "#9f7aea",
      "#ed64a6",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return {
      name: profile?.name || "Peer",
      color: randomColor,
    };
  }, [profile?.name]);

  const [code, setCode] = useState(
    "// Write your solution here...\n\nfunction solution() {\n  \n}",
  );
  const [sessionId, setSessionId] = useState<string>("default-session");
  const [question, setQuestion] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [partnerOnline, setPartnerOnline] = useState(true);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [hasSessionEnded, setHasSessionEnded] = useState(false);
  const sessionEndedRef = React.useRef(false);

  const endSessionOnce = React.useCallback(
    (reason?: string) => {
      if (sessionEndedRef.current) return false;
      sessionEndedRef.current = true;
      setHasSessionEnded(true);
      setShowDisconnectModal(false);
      if (reason) alert(reason);
      navigate("/user/dashboard");
      return true;
    },
    [navigate],
  );

  React.useEffect(() => {
    if (!state?.requestId || !state?.peerMatchRequestId) {
      setIsSessionLoading(false);
      return;
    }

    const computeId = [state.requestId, state.peerMatchRequestId]
      .sort()
      .join("-");
    setSessionId(computeId);

    let mounted = true;

    const initSession = async () => {
      try {
        // 1. check if session already exists
        const sessionRes = await fetch(
          `/api/collaboration/sessions/${computeId}`,
          {
            credentials: "include",
          },
        );
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();

          if (sessionData.status === "terminated") {
            if (mounted) {
              setIsSessionLoading(false);
              endSessionOnce(
                sessionData.terminateReason ||
                "This session has ended. Returning to Dashboard.",
              );
            }
            return;
          }

          // fetch question
          const qRes = await fetch(`/api/questions/${sessionData.questionId}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            if (mounted) setQuestion(qData);
          }
          if (mounted) setIsSessionLoading(false);
          return;
        }

        if (sessionRes.status === 404) {
          // 2. fetch a random question matching the topic & difficulty
          // since question-service returns an array for list endpoints, we try exact match first
          const formattedTopic = (state.topic || "").replace("-", "_");
          let qRes = await fetch(
            `/api/questions/?difficulty=${state.difficulty || "medium"}&topic=${formattedTopic}`,
          );
          let selectedQ: any = null;

          if (qRes.ok) {
            const qList = await qRes.json();
            if (qList && qList.length > 0) {
              selectedQ = qList[0];
            }
          }

          // fallback to match ONLY by difficulty if topic returned nothing
          if (!selectedQ) {
            qRes = await fetch(
              `/api/questions/?difficulty=${state.difficulty || "medium"}`,
            );
            if (qRes.ok) {
              const qList = await qRes.json();
              if (qList && qList.length > 0) {
                selectedQ = qList[0];
              }
            }
          }

          // fallback to ANY question if difficulty returned nothing
          if (!selectedQ) {
            qRes = await fetch(`/api/questions/`);
            if (qRes.ok) {
              const qList = await qRes.json();
              if (qList && qList.length > 0) {
                selectedQ = qList[0];
              }
            }
          }

          if (mounted && selectedQ) setQuestion(selectedQ);

          // 3. create the collaboration session
          const createRes = await fetch(`/api/collaboration/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              matchRequestId: state.requestId,
              peerMatchRequestId: state.peerMatchRequestId,
              questionId:
                selectedQ?.id || selectedQ?._id || "fallback-question",
            }),
          });

          if (!createRes.ok && createRes.status !== 409) {
            console.error("Failed to create session", await createRes.text());
          }
          if (mounted) setIsSessionLoading(false);
        }
      } catch (err) {
        console.error("Session creation failed:", err);
        if (mounted) setIsSessionLoading(false);
      }
    };

    void initSession();

    return () => {
      mounted = false;
    };
  }, [state, endSessionOnce]);

  // exit if Yjs WebSockets miss TCP termination CRDT
  React.useEffect(() => {
    if (!sessionId || isSessionLoading) return;
    const interval = setInterval(async () => {
      try {
        if (sessionEndedRef.current) return;
        const res = await fetch(`/api/collaboration/sessions/${sessionId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "terminated") {
            endSessionOnce(
              data.terminateReason ||
              "This session has ended. Returning to Dashboard.",
            );
          }
          return;
        }
        if (res.status === 403 || res.status === 404) {
          endSessionOnce(
            "This session is no longer available. Returning to Dashboard.",
          );
        }
      } catch (e) { }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId, isSessionLoading, endSessionOnce]);

  const handleEndSessionInstantly = async () => {
    if (isTerminating || sessionEndedRef.current) return;
    setIsTerminating(true);
    setShowDisconnectModal(false);
    try {
      await fetch(`/api/collaboration/sessions/${sessionId}/terminate`, {
        method: 'PATCH',
        credentials: 'include'
      });
    } catch (e) { }
    endSessionOnce();
  };

  const handleEndSession = () => {
    if (window.confirm("This will end the session for both peers. Are you sure you want to end this session?")) {
      void handleEndSessionInstantly();
    }
  };

  const handleSystemTerminate = (reason: string) => {
    if (sessionEndedRef.current) return;
    endSessionOnce(reason);
  };

  const handlePartnerPresenceChange = (isPresent: boolean) => {
    if (isTerminating || sessionEndedRef.current) return;
    setPartnerOnline(isPresent);
    if (!isPresent) setShowDisconnectModal(true);
    else setShowDisconnectModal(false);
  };

  const yourDifficulty = formatDifficultyLabel(state?.difficulty);
  const partnerDifficulty = formatDifficultyLabel(
    state?.peerRequestedDifficulty ?? undefined,
  );
  const matchKindLabel =
    state?.matchingType === "downward"
      ? "Downward match"
      : state?.matchingType === "same_difficulty"
        ? "Same difficulty match"
        : null;

  const showMatchBanner = Boolean(state?.peerUserId);

  return (
    <div className="workspace-layout">
      {/* Workspace Header */}
      <header className="workspace-header">
        <div className="header-left">
          <div className="workspace-brand">
            <Layout className="h-5 w-5 text-accent-primary" />
            <span className="font-semibold">PeerPrep Workspace</span>
          </div>
          <div className="session-info">
            <span className="tag-sm">{state?.difficulty || "Medium"}</span>
            <span className="tag-sm">{state?.topic || "Arrays"}</span>
            {state?.programmingLanguage ? (
              <span className="tag-sm">{state.programmingLanguage}</span>
            ) : null}
          </div>
        </div>

        <div className="header-right">
          <div className="peer-status">
            <div className={`status-indicator ${partnerOnline ? 'online' : 'offline'}`} style={{ backgroundColor: partnerOnline ? 'var(--success-color)' : 'var(--danger-color)' }}></div>
            <span className="text-sm text-secondary">
              {state?.peerUserId
                ? `Peer: ${state.peerUserId}`
                : "Peer Connected"}
            </span>
          </div>
          <Button
            variant="solid"
            theme="user"
            size="sm"
            onClick={handleEndSession}
          >
            <LogOut className="h-4 w-4 mr-2" />
            End Session
          </Button>
        </div>
      </header>

      {showMatchBanner ? (
        <div className="workspace-match-banner" role="status">
          {matchKindLabel ? (
            <>
              <p className="workspace-match-banner__title">Match</p>
              <p className="workspace-match-banner__line">
                <strong>Your requested difficulty:</strong> {yourDifficulty}
                {" · "}
                <strong>Partner requested difficulty:</strong>{" "}
                {partnerDifficulty}
              </p>
              <p className="workspace-match-banner__kind">{matchKindLabel}</p>
            </>
          ) : null}

          <p className="workspace-match-banner__title workspace-match-banner__title--sub">
            Session time (optional preference)
          </p>
          <p className="workspace-match-banner__line">
            <strong>Yours:</strong>{" "}
            {formatMinutesLine(state?.timeAvailableMinutes)}
            {" · "}
            <strong>Partner:</strong>{" "}
            {formatMinutesLine(state?.peerTimeAvailableMinutes)}
          </p>
          <p className="workspace-match-banner__line">
            <strong>Aligned time (both chose the same):</strong>{" "}
            {state?.matchedTimeAvailableMinutes != null
              ? `${state.matchedTimeAvailableMinutes} min`
              : "—"}
          </p>
          <p className="workspace-match-banner__hint">
            Time is a soft preference — different or missing times do not block
            matching.
          </p>
        </div>
      ) : null}

      {/* Main Workspace Area */}
      <main className="workspace-main">
        {/* Left Panel: Question */}
        <section className="panel question-panel">
          <div className="panel-header">
            <h2 className="panel-title">{question?.title || "1. Two Sum"}</h2>
            <div className="flex gap-2">
              <span className="tag-sm custom-tag text-success bg-success-light">
                {question?.complexity || state?.difficulty || "Easy"}
              </span>
            </div>
          </div>
          <div className="panel-content prose custom-prose">
            {question ? (
              <div dangerouslySetInnerHTML={{ __html: question.description }} />
            ) : (
              <>
                <p>
                  Given an array of integers <code>nums</code> and an integer{" "}
                  <code>target</code>, return{" "}
                  <em>
                    indices of the two numbers such that they add up to{" "}
                    <code>target</code>
                  </em>
                  .
                </p>
                <p>
                  You may assume that each input would have{" "}
                  <strong>
                    <em>exactly</em> one solution
                  </strong>
                  , and you may not use the <em>same</em> element twice.
                </p>
                <p>You can return the answer in any order.</p>
              </>
            )}

            <div className="example-block">
              <strong>Example 1:</strong>
              <pre>
                Input: nums = [2,7,11,15], target = 9{"\n"}
                Output: [0,1]{"\n"}
                Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
              </pre>
            </div>

            <div className="example-block">
              <strong>Example 2:</strong>
              <pre>
                Input: nums = [3,2,4], target = 6{"\n"}
                Output: [1,2]
              </pre>
            </div>

            <div
              className="workspace-question-images"
              style={{ marginTop: "2rem" }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                Reference Images:
              </strong>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* This is a placeholder structure for dynamic images when the backend is connected to the workspace */}
                <div
                  className="workspace-image-container"
                  style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    [Question image would be displayed here]
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Editor Area */}
        <section className="panel editor-panel">
          <div className="editor-header">
            <div className="editor-tabs">
              <button className="editor-tab active">
                <Code2 className="h-4 w-4 mr-2" />
                solution.js
              </button>
            </div>
            <div className="editor-actions">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button size="sm" className="ml-2">
                <Play className="h-4 w-4 mr-2" />
                Run Code
              </Button>
            </div>
          </div>

          <div className="editor-content" style={{ overflow: "hidden" }}>
            {isSessionLoading ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Connecting to a collaborative session...
              </div>
            ) : !hasSessionEnded ? (
              <CodeEditor
                value={code}
                onChange={(val) => setCode(val || "")}
                currentUser={currentUser}
                sessionId={sessionId}
                onSystemTerminate={handleSystemTerminate}
                onPartnerPresenceChange={handlePartnerPresenceChange}
              />
            ) : null}
          </div>

          <div className="editor-console">
            <div className="console-header">
              <span className="text-sm font-semibold">Console Output</span>
            </div>
            <div className="console-content">
              <span className="text-muted text-sm">
                Waiting for execution...
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Chat Button (Placeholder) */}
      <button className="chat-fab">
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Disconnection Modal */}
      {showDisconnectModal && !partnerOnline && !hasSessionEnded && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#111' }}>Partner Disconnected!</h2>
            <p style={{ marginBottom: '1.5rem', color: '#444' }}>
              Your peer got disconnected. This session will be closed in 2 minutes to free up resources.<br /><br />
              You can either Wait for them to reconnect, or end this session and Return to your Dashboard.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Button variant="ghost" theme="user" onClick={() => setShowDisconnectModal(false)}>Wait</Button>
              <Button variant="solid" theme="user" onClick={() => void handleEndSessionInstantly()}>Return to Dashboard</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
