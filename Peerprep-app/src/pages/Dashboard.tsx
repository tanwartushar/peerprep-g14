import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Target, Play, CircleGauge } from "lucide-react";
import { Select } from "../components/Select";
import { Button } from "../components/Button";
import "./Dashboard.css";
import Card from "../components/Card";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const dashboardTheme = "user";

  const handleStartMatching = () => {
    if (difficulty && topic) {
      navigate("/matching", { state: { difficulty, topic } });
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

  return (
    <div className="animate-fade-in">
      <div className="dashboard-layout">
        <div className="dashboard-main-container">
          <Card
            theme={dashboardTheme}
            logo={<Target className="h-5 w-5" />}
            title="Configure Session"
            headerAlign="left"
            showDivider
            className="dashboard-content"
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
            </div>

            <Button
              size="md"
              variant="solid"
              theme="user"
              className="mt-8"
              disabled={!difficulty || !topic}
              onClick={handleStartMatching}
              rightIcon={<Play className="h-5 w-5" />}
            >
              Find a Match
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
