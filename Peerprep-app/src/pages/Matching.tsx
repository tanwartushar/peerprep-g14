import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, X, Clock } from "lucide-react";
import { Button } from "../components/Button";
import "./Matching.css";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { cancelMatchRequest, getMatchRequest } from "../api/matching";
import { getEffectiveMatchingUserId } from "../dev/matchingDevUser";

interface LocationState {
  difficulty?: string;
  topic?: string;
  programmingLanguage?: string;
  allowLowerDifficultyMatch?: boolean;
  /** Set when user picked a time on the dashboard */
  timeAvailableMinutes?: number;
  requestId?: string;
}

/** Backend polls every 2s (matching service on port 3003, proxied as `/matching` in dev). */
const POLL_MS = 2000;

export const Matching: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { userId } = useAuth();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);

  const effectiveUserId = getEffectiveMatchingUserId(userId);

  useEffect(() => {
    if (!state?.difficulty || !state?.topic || !state?.requestId) {
      navigate("/user/dashboard");
      return;
    }

    if (timedOut) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsElapsed((prev: number) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [navigate, state, timedOut]);

  useEffect(() => {
    if (
      !state?.requestId ||
      !effectiveUserId ||
      !state.difficulty ||
      !state.topic
    ) {
      return;
    }
    if (timedOut) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const result = await getMatchRequest(effectiveUserId, state.requestId!);
      if (cancelled) return;
      if (!result.ok) {
        setPollError(result.message);
        return;
      }
      setPollError(null);
      const data = result.data;
      if (data.status === "TIMED_OUT") {
        setTimedOut(true);
        setTimeoutMessage(
          data.message ??
            "No match was found in time. You can try again from the dashboard.",
        );
        return;
      }
      if (data.status === "MATCHED") {
        navigate("/workspace", {
          replace: true,
          state: {
            difficulty: data.difficulty,
            topic: data.topic,
            programmingLanguage: data.programmingLanguage,
            peerUserId: data.peer?.userId,
            peerMatchRequestId: data.peer?.matchRequestId,
            peerRequestedDifficulty: data.peerRequestedDifficulty,
            matchingType: data.matchingType,
            timeAvailableMinutes: data.timeAvailableMinutes,
            peerTimeAvailableMinutes: data.peerTimeAvailableMinutes,
            matchedTimeAvailableMinutes: data.matchedTimeAvailableMinutes,
          },
        });
      }
      if (data.status === "CANCELLED") {
        navigate("/user/dashboard", { replace: true });
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    effectiveUserId,
    navigate,
    state?.difficulty,
    state?.programmingLanguage,
    state?.requestId,
    state?.topic,
    timedOut,
  ]);

  const handleCancel = async () => {
    setCancelError(null);
    if (!state?.requestId || !effectiveUserId) {
      navigate("/user/dashboard");
      return;
    }
    setIsCancelling(true);
    try {
      const result = await cancelMatchRequest(effectiveUserId, state.requestId);
      if (!result.ok) {
        setCancelError(result.message);
        return;
      }
      navigate("/user/dashboard");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="matching-layout animate-fade-in">
      <div className="matching-container">
        <Card theme="user" className="matching-card">
          <div className="matching-card__inner">
            {timedOut ? (
              <>
                <div className="matching-hero matching-hero--timeout">
                  <div className="matching-hero__core matching-hero__core--timeout">
                    <Clock className="matching-hero__icon" />
                  </div>
                </div>
                <div className="matching-hero__title">No match found in time</div>
                <div className="matching-info">
                  <p className="matching-timeout-message" role="status">
                    {timeoutMessage}
                  </p>
                  <div className="matching-timer">
                    <span className="timer-text">{formatTime(secondsElapsed)}</span>
                    <p className="timer-subtext">Wait time before timeout</p>
                  </div>
                  <div className="matching-actions">
                    <Button
                      theme="user"
                      variant="solid"
                      onClick={() => navigate("/user/dashboard")}
                    >
                      Back to dashboard
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="matching-hero">
                  <div className="matching-pulse-ring matching-pulse-ring--1" />
                  <div className="matching-pulse-ring matching-pulse-ring--2" />
                  <div className="matching-pulse-ring matching-pulse-ring--3" />

                  <div className="matching-hero__core">
                    <Users className="matching-hero__icon" />
                  </div>
                </div>
                <div className="matching-hero__title">Finding a Peer...</div>

                <div className="matching-info">
                  <div className="matching-details">
                    <div className="detail-item">
                      <span className="detail-label">Topic</span>
                      <span className="detail-value">{state?.topic || "Any"}</span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Difficulty</span>
                      <span className="detail-value">
                        {state?.difficulty || "Any"}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Language</span>
                      <span className="detail-value">
                        {state?.programmingLanguage || "—"}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Allow lower difficulty</span>
                      <span className="detail-value">
                        {state?.allowLowerDifficultyMatch ? "On" : "Off"}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Time available</span>
                      <span className="detail-value">
                        {state?.timeAvailableMinutes != null
                          ? `${state.timeAvailableMinutes} min`
                          : "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className="matching-timer">
                    <span className="timer-text">{formatTime(secondsElapsed)}</span>
                    <p className="timer-subtext">
                      Checking status every {POLL_MS / 1000}s
                    </p>
                  </div>

                  {pollError ? (
                    <p className="matching-poll-hint" role="status">
                      {pollError}
                      <span className="matching-poll-retry"> Will retry shortly.</span>
                    </p>
                  ) : null}

                  <div className="matching-actions">
                    {cancelError ? (
                      <p className="matching-cancel-error" role="alert">
                        {cancelError}
                      </p>
                    ) : null}
                    <Button
                      theme="user"
                      variant="ghost"
                      onClick={() => void handleCancel()}
                      disabled={isCancelling}
                      leftIcon={<X className="h-4 w-4" />}
                    >
                      {isCancelling ? "Cancelling…" : "Cancel Search"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
