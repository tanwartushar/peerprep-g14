import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Upload, X } from "lucide-react";

import QuestionBrowser from "../components/QuestionBrowser";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { TextArea } from "../components/TextArea";
import { MultiSelect } from "../components/MultiSelect";

import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../../BackendClient";

import "./Questions.css";

type QuestionsTheme = "admin" | "user";

interface QuestionsPageProps {
  theme?: QuestionsTheme;
}

interface Question {
  id: string;
  title: string;
  topics: string[];
  difficulty: "easy" | "medium" | "hard";
  description?: string;
  mediaUrl?: string;
}

const availableTopics = [
  { value: "binary_search", label: "Binary Search" },
  { value: "depth_first_search", label: "Depth First Search" },
  { value: "breadth_first_search", label: "Breadth First Search" },
  { value: "singly_linked_list", label: "Singly Linked List" },
  { value: "doubly_linked_list", label: "Doubly Linked List" },
];

const Questions: React.FC<QuestionsPageProps> = ({ theme = "user" }) => {
  const isAdmin = theme === "admin";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  );

  const [formData, setFormData] = useState<Omit<Question, "id">>({
    title: "",
    topics: [],
    difficulty: "easy",
    description: "",
    mediaUrl: "",
  });

  const getTopicLabel = (value: string) => {
    const topic = availableTopics.find((t) => t.value === value);
    return topic ? topic.label : value;
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return questions;

    return questions.filter((question) => {
      return (
        question.title.toLowerCase().includes(q) ||
        question.topics.some((topic) =>
          getTopicLabel(topic).toLowerCase().includes(q),
        )
      );
    });
  }, [questions, searchValue]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      topics: [],
      difficulty: "easy",
      description: "",
      mediaUrl: "",
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      title: question.title,
      topics: [...question.topics],
      difficulty: question.difficulty,
      description: question.description || "",
      mediaUrl: question.mediaUrl || "",
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (question: Question) => {
    setQuestionToDelete(question);
    setIsDeleteModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!formData.title || formData.topics.length === 0) return;

    try {
      if (editingId) {
        await updateQuestion(editingId, formData);
      } else {
        await createQuestion(formData);
      }

      setIsFormModalOpen(false);
      await loadQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;

    try {
      await deleteQuestion(questionToDelete.id);
      setIsDeleteModalOpen(false);
      setQuestionToDelete(null);
      await loadQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, mediaUrl: url }));
  };

  const handleRemoveMedia = () => {
    setFormData((prev) => ({ ...prev, mediaUrl: "" }));
  };

  return (
    <div className={`questions-page questions-page--${theme}`}>
      <QuestionBrowser
        theme={theme}
        questions={filteredQuestions.map((question) => ({
          id: question.id,
          title: question.title,
          topics: question.topics,
          difficulty: question.difficulty,
          description: question.description,
          attempts: 0,
        }))}
        isLoading={isLoading}
        selectedQuestionId={selectedQuestionId}
        onSelectedQuestionChange={(question) =>
          setSelectedQuestionId(question.id)
        }
        onEditQuestion={isAdmin ? handleOpenEdit : undefined}
        onDeleteQuestion={isAdmin ? handleOpenDelete : undefined}
        getTopicLabel={getTopicLabel}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search question"
        showFilterButton={true}
        onFilterClick={() => console.log("open filter")}
        showAddButton={isAdmin}
        onAddClick={handleOpenCreate}
      />

      {isAdmin && (
        <>
          <Modal
            theme="admin"
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            title={editingId ? "Edit Question" : "Add New Question"}
            footer={
              <Button
                theme="admin"
                variant="solid"
                onClick={handleSaveQuestion}
              >
                {editingId ? "Save Changes" : "Create Question"}
              </Button>
            }
          >
            <div className="questions-form-layout">
              <Input
                theme="admin"
                label="Question Title"
                placeholder="e.g. Merge Intervals"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />

              <TextArea
                theme="admin"
                label="Description"
                placeholder="Provide a detailed description of the problem..."
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />

              <MultiSelect
                theme="admin"
                label="Topics"
                placeholder="Select Topics"
                options={availableTopics}
                value={formData.topics}
                onChange={(topics) =>
                  setFormData((prev) => ({ ...prev, topics }))
                }
              />

              <Select
                theme="admin"
                label="Difficulty Level"
                value={formData.difficulty}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    difficulty: value as Question["difficulty"],
                  }))
                }
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "medium", label: "Medium" },
                  { value: "hard", label: "Hard" },
                ]}
              />

              <div className="questions-form-group">
                <label className="questions-form-label">
                  Media / Photos (Optional)
                </label>

                {!formData.mediaUrl ? (
                  <div className="questions-media-upload-container">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="questions-media-upload-input"
                      onChange={handleFileUpload}
                    />
                    <Upload className="h-8 w-8 text-accent mx-auto mb-2 opacity-80" />
                    <p className="text-sm text-secondary">
                      Click or drag file to upload
                    </p>
                  </div>
                ) : (
                  <div className="questions-media-preview-wrapper">
                    <img
                      src={formData.mediaUrl}
                      alt="Uploaded Media"
                      className="questions-media-preview"
                    />
                    <button
                      className="questions-remove-media-btn"
                      onClick={handleRemoveMedia}
                      title="Remove Media"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Modal>

          <Modal
            theme="admin"
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Confirm Deletion"
            footer={
              <>
                <Button
                  theme="admin"
                  variant="ghost"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  theme="admin"
                  variant="ghost"
                  className="text-danger"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
              </>
            }
          >
            <div className="questions-delete-confirmation">
              <div className="questions-alert-icon-wrapper">
                <AlertCircle className="h-10 w-10 text-danger" />
              </div>

              <p>
                Are you sure you want to delete{" "}
                <strong>{questionToDelete?.title}</strong>? This action is
                permanent and cannot be undone.
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Questions;
