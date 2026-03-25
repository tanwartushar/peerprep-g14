import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Edit2, Trash2, AlertCircle, Upload, X } from "lucide-react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../../BackendClient";
import "./AdminDashboard.css";
import { Header } from "../components/Header";
import { TextArea } from "../components/TextArea";
import { MultiSelect } from "../components/MultiSelect";
import AppShell from "../components/AppShell";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import QuestionBrowser from "../components/QuestionBrowser";

// --- Types & Constants ---
interface Question {
  id: string;
  title: string;
  topics: string[];
  difficulty: "easy" | "medium" | "hard";
  description?: string;
  mediaUrl?: string;
}

const availabelTopics = [
  { value: "binary_search", label: "Binary Search" },
  { value: "depth_first_search", label: "Depth First Search" },
  { value: "breadth_first_search", label: "Breadth First Search" },
  { value: "singly_linked_list", label: "Singly Linked List" },
  { value: "doubly_linked_list", label: "Doubly Linked List" },
];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSideBarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<
    string | null
  >(null);
  const dashboardTheme = "admin";

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Question, "id">>({
    title: "",
    topics: [],
    difficulty: "easy",
    description: "",
    mediaUrl: "",
  });
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/");
  };

  // Fetch initial data
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

    console.log("questionpayload:", questions);
    console.log("formdata:", formData);
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // --- Handlers ---
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

  const handleOpenEdit = (q: Question) => {
    setEditingId(q.id);
    setFormData({
      title: q.title,
      topics: [...q.topics],
      difficulty: q.difficulty,
      description: q.description || "",
      mediaUrl: q.mediaUrl || "",
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (q: Question) => {
    setQuestionToDelete(q);
    setIsDeleteModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, mediaUrl: url }));
    }
  };

  const handleRemoveMedia = () => {
    setFormData((prev) => ({ ...prev, mediaUrl: "" }));
  };

  const handleTopicSelect = (selectedTopic: string) => {
    if (selectedTopic && !formData.topics.includes(selectedTopic)) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, selectedTopic],
      }));
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t !== topicToRemove),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!formData.title || formData.topics.length === 0) return;

    try {
      if (editingId) {
        console.log("Updating ID:", editingId);
        console.log("Payload:", formData);
        const result = await updateQuestion(editingId, formData);
        console.log("Update result:", result);
      } else {
        await createQuestion(formData);
      }
      setIsFormModalOpen(false);
      await loadQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert(
        "Failed to save question. Please check the console or backend logs.",
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (questionToDelete) {
      try {
        await deleteQuestion(questionToDelete.id);
        setIsDeleteModalOpen(false);
        setQuestionToDelete(null);
        await loadQuestions();
      } catch (error) {
        console.error("Error deleting question:", error);
        alert(
          "Failed to delete question. Please check the console or backend logs.",
        );
      }
    }
  };

  // --- Format helper for table display ---
  const getTopicLabel = (value: string) => {
    const topic = availabelTopics.find((t) => t.value === value);
    return topic ? topic.label : value;
  };

  const filteredQuestions = questions.filter((question) => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return true;

    return (
      question.title.toLowerCase().includes(q) ||
      question.topics.some((topic) =>
        getTopicLabel(topic).toLowerCase().includes(q),
      )
    );
  });

  const topItems = [
    {
      key: "questions",
      label: "Questions",
      active: location.pathname.startsWith("/admin"),
      onClick: () => navigate("/admin/questions"),
    },
    {
      key: "users",
      label: "Users",
      active: location.pathname.startsWith("/admin/users"),
      onClick: () => navigate("/admin/users"),
    },
  ];

  const bottomItems = [
    {
      key: "logout",
      label: "Logout",
      onClick: () => handleLogout(),
      isLoading: isLoggingOut,
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppShell
        theme={dashboardTheme}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSideBarOpen((prev) => !prev)}
        sidebar={
          <Sidebar
            theme={dashboardTheme}
            isOpen={isSidebarOpen}
            topItems={topItems}
            bottomItems={bottomItems}
          />
        }
        header={
          <Header
            theme={dashboardTheme}
            showProfile
            showProfileName
            showProfilePicture
          />
        }
      >
        <div className="admin-dashboard-shell">
          <QuestionBrowser
            theme="admin"
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
            onEditQuestion={handleOpenEdit}
            onDeleteQuestion={handleOpenDelete}
            getTopicLabel={getTopicLabel}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search question"
            showFilterButton
            onFilterClick={() => console.log("open filter")}
            showAddButton
            onAddClick={handleOpenCreate}
          />
        </div>
      </AppShell>

      {/* --- Modals --- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingId ? "Edit Question" : "Add New Question"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion}>
              {editingId ? "Save Changes" : "Create Question"}
            </Button>
          </>
        }
      >
        <div className="form-layout">
          <Input
            label="Question Title"
            placeholder="e.g. Merge Intervals"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />

          <TextArea
            label="Description"
            placeholder="Provide a detailed description of the problem..."
            value={formData.description ?? ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />

          <MultiSelect
            label="Topics"
            placeholder="Select Topics"
            options={availabelTopics}
            value={formData.topics}
            onChange={(topics) => setFormData((prev) => ({ ...prev, topics }))}
          />

          <Select
            label="Difficulty Level"
            value={formData.difficulty}
            onChange={(value) =>
              setFormData({
                ...formData,
                difficulty: value as Question["difficulty"],
              })
            }
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />

          <div className="form-group">
            <label className="form-label">Media / Photos (Optional)</label>
            {!formData.mediaUrl ? (
              <div className="media-upload-container">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="media-upload-input"
                  onChange={handleFileUpload}
                />
                <Upload className="h-8 w-8 text-accent mx-auto mb-2 opacity-80" />
                <p className="text-sm text-secondary">
                  Click or drag file to upload
                </p>
              </div>
            ) : (
              <div className="media-preview-wrapper">
                <img
                  src={formData.mediaUrl}
                  alt="Uploaded Media"
                  className="media-preview"
                />
                <button
                  className="remove-media-btn"
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <div className="delete-confirmation">
          <div className="alert-icon-wrapper">
            <AlertCircle className="h-10 w-10 text-danger" />
          </div>
          <p>
            Are you sure you want to delete{" "}
            <strong>{questionToDelete?.title}</strong>? This action is permanent
            and cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};
