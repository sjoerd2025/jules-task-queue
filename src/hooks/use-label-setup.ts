"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useReducer, useMemo, useState, useCallback } from "react";
import type {
  LabelSetupState,
  LabelSetupAction,
} from "@/types/components";

function labelSetupReducer(
  state: LabelSetupState,
  action: LabelSetupAction,
): LabelSetupState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_REPOSITORIES":
      return { ...state, repositories: action.payload };
    case "SET_SELECTED_OPTION":
      return { ...state, selectedOption: action.payload };
    case "SET_SELECTED_REPOS":
      return { ...state, selectedRepos: action.payload };
    case "SET_MODAL_OPEN":
      return { ...state, isModalOpen: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    default:
      return state;
  }
}

const initialState: LabelSetupState = {
  isLoading: true,
  isProcessing: false,
  error: null,
  repositories: [],
  selectedOption: null,
  selectedRepos: new Set(),
  isModalOpen: false,
};

export function useLabelSetup() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, dispatch] = useReducer(labelSetupReducer, initialState);
  const [installationId, setInstallationId] = useState<string | null>(null);

  const fetchRepositories = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/github-app/installations/${id}/repositories`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      dispatch({ type: "SET_REPOSITORIES", payload: data.repositories || [] });
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error
            ? error.message
            : "Failed to load repositories",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("installation_id");
    if (!id) {
      dispatch({ type: "SET_ERROR", payload: "Missing installation ID" });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }
    setInstallationId(id);
    fetchRepositories(id);
  }, [searchParams, fetchRepositories]);

  const handleOptionSelect = (option: "all" | "selected" | "manual"): void => {
    dispatch({ type: "SET_SELECTED_OPTION", payload: option });
    if (option === "all") {
      const allRepoIds = new Set(state.repositories.map((repo) => repo.id));
      dispatch({ type: "SET_SELECTED_REPOS", payload: allRepoIds });
    } else if (option === "manual") {
      dispatch({ type: "SET_SELECTED_REPOS", payload: new Set() });
    } else if (option === "selected") {
      // Keep current selection or open modal
      if (state.selectedRepos.size === 0) {
        dispatch({ type: "SET_MODAL_OPEN", payload: true });
      }
    }
  };

  const handleRepositorySelectionChange = (
    repoId: number,
    selected: boolean,
  ): void => {
    const newSelected = new Set(state.selectedRepos);
    if (selected) {
      newSelected.add(repoId);
    } else {
      newSelected.delete(repoId);
    }
    dispatch({ type: "SET_SELECTED_REPOS", payload: newSelected });
  };

  const handleSelectAll = (): void => {
    const allRepoIds = new Set(state.repositories.map((repo) => repo.id));
    dispatch({ type: "SET_SELECTED_REPOS", payload: allRepoIds });
  };

  const handleClearAll = (): void => {
    dispatch({ type: "SET_SELECTED_REPOS", payload: new Set() });
  };

  const canContinue = useMemo(
    () =>
      state.selectedOption &&
      (state.selectedOption === "manual" ||
        state.selectedOption === "all" ||
        (state.selectedOption === "selected" && state.selectedRepos.size > 0)),
    [state.selectedOption, state.selectedRepos.size],
  );

  const handleContinue = async (): Promise<void> => {
    if (!state.selectedOption || !installationId) return;

    dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      const repositoryIds =
        state.selectedOption === "all"
          ? state.repositories.map((repo) => repo.id)
          : Array.from(state.selectedRepos);

      const response = await fetch("/api/github-app/label-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          installationId: parseInt(installationId),
          setupType: state.selectedOption,
          repositoryIds: repositoryIds.length > 0 ? repositoryIds : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Label setup API error:", errorData);
        throw new Error(errorData.error || "Failed to setup labels");
      }

      const result = await response.json();
      console.log("Label setup result:", result);

      // Redirect to success page with result details
      const params = new URLSearchParams({
        installation_id: installationId,
        setup_type: result.setupType,
      });

      if (result.repositoriesProcessed) {
        params.set(
          "repositories_processed",
          result.repositoriesProcessed.toString(),
        );
      }

      if (result.labelsCreated) {
        params.set(
          "labels_successful",
          result.labelsCreated.successful.toString(),
        );
        params.set("labels_failed", result.labelsCreated.failed.toString());
      }

      router.push(`/github-app/success?${params.toString()}`);
    } catch (error) {
      console.error("Failed to setup labels:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error
            ? error.message
            : "Failed to setup labels. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_PROCESSING", payload: false });
    }
  };

  const setModalOpen = (isOpen: boolean) => {
    dispatch({ type: "SET_MODAL_OPEN", payload: isOpen });
  };

  const goHome = () => {
    router.push("/");
  };

  return {
    state,
    handlers: {
      handleOptionSelect,
      handleRepositorySelectionChange,
      handleSelectAll,
      handleClearAll,
      handleContinue,
      setModalOpen,
      goHome,
    },
    canContinue,
  };
}
