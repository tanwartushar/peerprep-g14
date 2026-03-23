import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Target, Play, CircleGauge } from "lucide-react";
import { CardLight } from "../components/CardLight";
import { Select } from "../components/Select";
import { Button } from "../components/Button";
import "./Dashboard.css";
import { Header } from "../components/Header";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");

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
    <div className="dashboard-layout animate-fade-in">
      <Header logo brandName profile signout />

      <main className="dashboard-content">
        <div className="dashboard-header flex-col flex-center">
          <h1 className="dashboard-title">Ready to Practice?</h1>
          <p className="dashboard-subtitle">
            Select your preferred topic and difficulty to find a peer for your
            next mock interview.
          </p>
        </div>

        <div className="dashboard-cards">
          <CardLight glow className="selection-card">
            <div className="flex flex-row">
              <Target className="h-6 w-6 mr-2 text-accent-primary" />
              <h2 className="card-title flex-center">Configure Session</h2>
            </div>

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
                leftIcon={<CircleGauge className="h-5 w-5" />}
              />
            </div>

            <Button
              size="lg"
              className="w-full mt-8"
              disabled={!difficulty || !topic}
              onClick={handleStartMatching}
              rightIcon={<Play className="h-5 w-5" />}
            >
              Find a Match
            </Button>
          </CardLight>

          <div className="dashboard-stats flex-col">
            <CardLight className="stat-card">
              <h3>Recent Topics</h3>
              <div className="tags">
                <span className="tag">Arrays</span>
                <span className="tag">Trees</span>
              </div>
            </CardLight>
            <CardLight className="stat-card mt-4">
              <h3>Sessions Completed</h3>
              <div className="stat-number">12</div>
            </CardLight>
          </div>
        </div>
      </main>
    </div>
  );
};
