import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel pure function tests ---

test("getToolCallLabel: str_replace_editor create with path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace with path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "Card.tsx" })).toBe("Editing Card.tsx");
});

test("getToolCallLabel: str_replace_editor insert with path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "utils.ts" })).toBe("Editing utils.ts");
});

test("getToolCallLabel: str_replace_editor undo_edit with path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "Button.tsx" })).toBe("Undoing edit in Button.tsx");
});

test("getToolCallLabel: str_replace_editor view with path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "index.html" })).toBe("Reading index.html");
});

test("getToolCallLabel: str_replace_editor create extracts last segment from nested path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "src/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getToolCallLabel: str_replace_editor create with no path falls back to 'file'", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getToolCallLabel: str_replace_editor str_replace with empty string path falls back to 'file'", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "" })).toBe("Editing file");
});

test("getToolCallLabel: str_replace_editor with missing command returns raw toolName", () => {
  expect(getToolCallLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

test("getToolCallLabel: str_replace_editor with unknown command returns raw toolName", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "unknown_cmd", path: "App.jsx" })).toBe("str_replace_editor");
});

test("getToolCallLabel: file_manager delete with path", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "App.css" })).toBe("Deleting App.css");
});

test("getToolCallLabel: file_manager delete with no path falls back to 'file'", () => {
  expect(getToolCallLabel("file_manager", { command: "delete" })).toBe("Deleting file");
});

test("getToolCallLabel: file_manager rename with path and new_path", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "OldName.tsx", new_path: "NewName.tsx" })).toBe("Renaming OldName.tsx to NewName.tsx");
});

test("getToolCallLabel: file_manager rename with nested new_path extracts last segment", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "src/OldName.tsx", new_path: "src/components/NewName.tsx" })).toBe("Renaming OldName.tsx to NewName.tsx");
});

test("getToolCallLabel: file_manager rename with no new_path omits 'to' clause", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "OldName.tsx" })).toBe("Renaming OldName.tsx");
});

test("getToolCallLabel: file_manager with missing command returns raw toolName", () => {
  expect(getToolCallLabel("file_manager", {})).toBe("file_manager");
});

test("getToolCallLabel: unknown tool name is echoed back", () => {
  expect(getToolCallLabel("some_other_tool", { command: "do_thing", path: "file.ts" })).toBe("some_other_tool");
});

test("getToolCallLabel: empty args with known tool returns raw toolName", () => {
  expect(getToolCallLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

// --- ToolCallBadge component visual state tests ---

test("ToolCallBadge: partial-call state shows spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "partial-call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
  };
  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge: call state shows spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
  };
  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge: result state with truthy result shows green dot", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    result: "Success",
  };
  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge: result state with falsy result shows spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    result: null,
  };
  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge: label text appears in DOM", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "Card.tsx" },
    result: "Success",
  };
  render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});

test("ToolCallBadge: label text appears in DOM for in-progress state", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "Button.tsx" },
  };
  render(<ToolCallBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("ToolCallBadge: badge wrapper does not have font-mono class", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    result: "Success",
  };
  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);
  const badge = container.firstChild as HTMLElement;
  expect(badge.className).not.toContain("font-mono");
});
