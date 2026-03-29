import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, X } from "lucide-react";
import { Button } from "../components/Button";
import "./Matching.css";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { cancelMatchRequest } from "../api/matching";

interface LocationState {
  difficulty?: string;
  topic?: string;
  programmingLanguage?: string;
  requestId?: string;
}

export const Matching: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { userId } = useAuth();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!state?.difficulty || !state?.topic || !state?.requestId) {
      navigate("/dashboard");
      return;
    }

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    // Simulate finding a match after 5 seconds
    // const matchTimer = setTimeout(() => {
    //   navigate("/workspace", { state });
    // }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [navigate, state]);

  const handleCancel = async () => {
    setCancelError(null);
    if (!state?.requestId || !userId) {
      navigate("/dashboard");
      return;
    }
    setIsCancelling(true);
    try {
      const result = await cancelMatchRequest(userId, state.requestId);
      if (!result.ok) {
        setCancelError(result.message);
        return;
      }
      navigate("/dashboard");
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
              </div>

              <div className="matching-timer">
                <span className="timer-text">{formatTime(secondsElapsed)}</span>
                <p className="timer-subtext">Estimated wait time: 00:30</p>
              </div>

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
          </div>
        </Card>
      </div>
    </div>
  );
};
