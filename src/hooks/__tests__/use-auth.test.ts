import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
});

describe("useAuth", () => {
  describe("initial state", () => {
    it("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    describe("happy path — anon work with messages", () => {
      it("creates a project from anon work and navigates to it", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/": { type: "directory" } },
        };
        mockSignIn.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "proj-anon-123" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-anon-123");
        expect(mockGetProjects).not.toHaveBeenCalled();
      });
    });

    describe("happy path — no anon work, existing projects", () => {
      it("navigates to the most recent project", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([
          { id: "proj-1" } as any,
          { id: "proj-2" } as any,
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-1");
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new project and navigates to it", async () => {
        mockSignIn.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "proj-new-999" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/proj-new-999");
      });
    });

    describe("error states", () => {
      it("returns failure result and does not navigate when signIn fails", async () => {
        mockSignIn.mockResolvedValue({
          success: false,
          error: "Invalid credentials",
        });

        const { result } = renderHook(() => useAuth());
        let returnValue: any;

        await act(async () => {
          returnValue = await result.current.signIn(
            "user@example.com",
            "wrongpassword"
          );
        });

        expect(returnValue).toEqual({
          success: false,
          error: "Invalid credentials",
        });
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      it("resets isLoading to false even when signInAction throws", async () => {
        mockSignIn.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });

      it("propagates error thrown by signInAction", async () => {
        mockSignIn.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());

        await expect(
          act(async () => {
            await result.current.signIn("user@example.com", "password123");
          })
        ).rejects.toThrow("Network error");
      });
    });

    describe("loading state", () => {
      it("sets isLoading to true while signing in and false after", async () => {
        let resolveSignIn!: (v: any) => void;
        mockSignIn.mockReturnValue(
          new Promise((res) => { resolveSignIn = res; })
        );

        const { result } = renderHook(() => useAuth());

        act(() => {
          result.current.signIn("user@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "proj-x" } as any);

        await act(async () => {
          resolveSignIn({ success: true });
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("signUp", () => {
    describe("happy path — anon work with messages", () => {
      it("creates a project from anon work and navigates to it", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "make a button" }],
          fileSystemData: { "/": { type: "directory" }, "/App.jsx": {} },
        };
        mockSignUp.mockResolvedValue({ success: true });
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "proj-signup-anon" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "securepass1");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/proj-signup-anon");
      });
    });

    describe("happy path — no anon work, existing projects", () => {
      it("navigates to the most recent project", async () => {
        mockSignUp.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "proj-existing" } as any]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "securepass1");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-existing");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new project and navigates to it", async () => {
        mockSignUp.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "proj-brand-new" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "securepass1");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/proj-brand-new");
      });
    });

    describe("error states", () => {
      it("returns failure result and does not navigate when signUp fails", async () => {
        mockSignUp.mockResolvedValue({
          success: false,
          error: "Email already registered",
        });

        const { result } = renderHook(() => useAuth());
        let returnValue: any;

        await act(async () => {
          returnValue = await result.current.signUp(
            "existing@example.com",
            "password123"
          );
        });

        expect(returnValue).toEqual({
          success: false,
          error: "Email already registered",
        });
        expect(mockPush).not.toHaveBeenCalled();
      });

      it("resets isLoading to false even when signUpAction throws", async () => {
        mockSignUp.mockRejectedValue(new Error("Server error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("user@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("does not use anon work when messages array is empty", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: { "/": { type: "directory" } },
      });
      mockGetProjects.mockResolvedValue([{ id: "proj-existing" } as any]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-existing");
    });

    it("does not navigate when signIn returns failure, even if anon work exists", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("passes credentials through to signInAction", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("specific@email.com", "mypassword");
      });

      expect(mockSignIn).toHaveBeenCalledWith("specific@email.com", "mypassword");
    });

    it("passes credentials through to signUpAction", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@email.com", "mypassword");
      });

      expect(mockSignUp).toHaveBeenCalledWith("newuser@email.com", "mypassword");
    });
  });
});
