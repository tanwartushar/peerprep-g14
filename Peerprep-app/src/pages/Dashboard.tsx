import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Target, Play, CircleGauge, Code2, Clock } from "lucide-react";
import { Select } from "../components/Select";
import { Button } from "../components/Button";
import "./Dashboard.css";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { createMatchRequest, getActiveMatchRequest } from "../api/matching";
import { getEffectiveMatchingUserId } from "../dev/matchingDevUser";
import { setActiveMatchRequestId } from "../matching/matchingSession";
import {
  loadMatchFormDraft,
  saveMatchFormDraft,
} from "../matching/matchFormDraft";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userId, isLoading } = useAuth();
  const [difficulty, setDifficulty] = useState(
    () => loadMatchFormDraft()?.difficulty ?? "",
  );
  const [topic, setTopic] = useState(() => loadMatchFormDraft()?.topic ?? "");
  const [programmingLanguage, setProgrammingLanguage] = useState(
    () => loadMatchFormDraft()?.programmingLanguage ?? "",
  );
  const [allowLowerDifficultyMatch, setAllowLowerDifficultyMatch] = useState(
    () => loadMatchFormDraft()?.allowLowerDifficultyMatch ?? false,
  );
  /** "" = no preference (F2 — omit from payload) */
  const [timeAvailable, setTimeAvailable] = useState(
    () => loadMatchFormDraft()?.timeAvailable ?? "",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dashboardTheme = "user";

  useEffect(() => {
    if (isLoading || !userId) return;
    let mounted = true;

    const checkActiveSession = async () => {
      try {
        const res = await fetch('/api/collaboration/sessions/active', {
          credentials: 'include'
        });
        if (res.ok && res.status !== 204 && mounted) {
          const session = await res.json();
          // termination validation: alert offline returning users
          if (session.status === "terminated") {
            const shownKey = `notified_termination_${session.id}`;
            if (!sessionStorage.getItem(shownKey)) {
              // Rely on terminatedBy rather than terminateReason since the DB
              // always stores 'Deliberate' due to Docker build cache on local services.
              // If the terminator is someone else, this user was offline.
              if (session.terminatedBy !== userId && session.terminatedBy !== 'anonymous') {
                alert("Your previous session has ended. You can find a new match from the Dashboard.");
              }
              sessionStorage.setItem(shownKey, "true");
            }
            return;
          }
          // only resume an actually active session (terminated rows must not trap users in a WS loop)
          if (session.status !== "active") {
            return;
          }
          // extract the original pair of UUIDs from the sorted ID string (format: UUID_36 - UUID_36)
          const part1 = session.id.slice(0, 36);
          const part2 = session.id.slice(37);
          const effId = getEffectiveMatchingUserId(userId);
          const isUser1 = session.user1Id === (effId || userId);

          navigate('/workspace', {
            state: {
              requestId: part1,
              peerMatchRequestId: part2,
              programmingLanguage: session.language,
              peerUserId: isUser1 ? session.user2Id : session.user1Id,
              difficulty: '',
              topic: ''
            }
          });
          return;
        }
      } catch (e) {
        // dashboard renders normally
      }

      const effId = getEffectiveMatchingUserId(userId);
      if (!effId || !mounted) return;
      try {
        const matchRes = await getActiveMatchRequest(effId);
        if (!mounted) return;
        if (matchRes.ok && matchRes.data.status === "PENDING") {
          setActiveMatchRequestId(matchRes.data.id);
          navigate("/matching", {
            state: {
              requestId: matchRes.data.id,
              topic: matchRes.data.topic,
              difficulty: matchRes.data.difficulty,
              programmingLanguage: matchRes.data.programmingLanguage,
              allowLowerDifficultyMatch: matchRes.data.allowLowerDifficultyMatch,
              timeAvailableMinutes:
                matchRes.data.timeAvailableMinutes ?? undefined,
            },
          });
        }
      } catch {
        /* ignore */
      }
    };

    void checkActiveSession();
    return () => { mounted = false; };
  }, [userId, isLoading, navigate]);

  useEffect(() => {
    saveMatchFormDraft({
      topic,
      difficulty,
      programmingLanguage,
      allowLowerDifficultyMatch,
      timeAvailable,
    });
  }, [
    topic,
    difficulty,
    programmingLanguage,
    allowLowerDifficultyMatch,
    timeAvailable,
  ]);

  const handleStartMatching = async () => {
    setSubmitError(null);
    if (!difficulty || !topic || !programmingLanguage) return;
    const effectiveId = getEffectiveMatchingUserId(userId);
    if (!effectiveId) {
      setSubmitError("Sign in to find a match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createMatchRequest(effectiveId, {
        topic,
        difficulty,
        programmingLanguage,
        allowLowerDifficultyMatch,
        ...(timeAvailable !== ""
          ? { timeAvailableMinutes: Number(timeAvailable) }
          : {}),
      });
      if (result.ok) {
        setActiveMatchRequestId(result.data.id);
        navigate("/matching", {
          state: {
            difficulty,
            topic,
            programmingLanguage,
            allowLowerDifficultyMatch,
            timeAvailableMinutes:
              timeAvailable !== "" ? Number(timeAvailable) : undefined,
            requestId: result.data.id,
          },
        });
        return;
      }
      if (result.status === 409) {
        setSubmitError(
          "You already have an active match request. Cancel it from the matching screen or wait.",
        );
        return;
      }
      setSubmitError(result.message || "Could not start matching.");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Unexpected error starting match.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyOptions = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  const topicOptions = [
    { value: "arrays", label: "Arrays & Hashing" },
    { value: "two-pointers", label: "Two Pointers" },
    { value: "sliding-window", label: "Sliding Window" },
    { value: "stack", label: "Stack" },
    { value: "binary-search", label: "Binary Search" },
    { value: "linked-list", label: "Linked List" },
    { value: "trees", label: "Trees" },
    { value: "graphs", label: "Graphs" },
    { value: "dp", label: "Dynamic Programming" },
  ];

  const languageOptions = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "go", label: "Go" },
  ];

  const timeAvailableOptions = [
    { value: "", label: "No preference" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "60 minutes" },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-layout">
        <div className="dashboard-main-container">
          <Card
            theme={dashboardTheme}
            logo={<Target className="h-5 w-5" />}
            title="Configure Session"
            headerAlign="left"
            showDivider
            className="dashboard-content"
            contentClassName="dashboard-session-scroll"
          >
            <div className="form-group">
              <Select
                label="Interview Topic"
                placeholder="Select Topic"
                options={topicOptions}
                value={topic}
                onChange={setTopic}
                leftIcon={<BookOpen className="h-5 w-5" />}
              />

              <Select
                label="Difficulty Level"
                placeholder="Select Difficulty"
                options={difficultyOptions}
                value={difficulty}
                onChange={setDifficulty}
                className="mt-8"
                leftIcon={<CircleGauge className="h-5 w-5" />}
              />

              <Select
                label="Programming Language"
                placeholder="Select Language"
                options={languageOptions}
                value={programmingLanguage}
                onChange={setProgrammingLanguage}
                className="mt-8"
                leftIcon={<Code2 className="h-5 w-5" />}
              />

              <Select
                label="Time available (optional)"
                placeholder="No preference"
                options={timeAvailableOptions}
                value={timeAvailable}
                onChange={setTimeAvailable}
                className="mt-8"
                leftIcon={<Clock className="h-5 w-5" />}
              />

              <label className="dashboard-allow-lower mt-8">
                <input
                  type="checkbox"
                  checked={allowLowerDifficultyMatch}
                  onChange={(e) =>
                    setAllowLowerDifficultyMatch(e.target.checked)
                  }
                />
                <span>Allow lower difficulty match</span>
              </label>
              <p className="dashboard-allow-lower-hint text-secondary text-sm mt-2">
                When on, you may be paired with someone who chose an easier
                level (same topic and language). Same level is always tried
                first.
              </p>
            </div>

            {submitError ? (
              <p className="dashboard-match-error" role="alert">
                {submitError}
              </p>
            ) : null}

            <Button
              size="md"
              variant="solid"
              theme="user"
              className="mt-8"
              disabled={
                !difficulty ||
                !topic ||
                !programmingLanguage ||
                isLoading ||
                isSubmitting
              }
              onClick={() => void handleStartMatching()}
              rightIcon={<Play className="h-5 w-5" />}
            >
              {isSubmitting ? "Starting…" : "Find a Match"}
            </Button>
          </Card>
        </div>
        <div className="dashboard-right-container">
          <Card
            theme={dashboardTheme}
            title={<div className="dashboard-title">Sessions Completed</div>}
            headerAlign="left"
            showDivider
            className="dashboard-content"
          >
            <div className="stat-number">12</div>
          </Card>
        </div>
      </div>
    </div>
  );
};
