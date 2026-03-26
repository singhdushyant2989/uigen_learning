"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

function getFilename(path: unknown): string {
  if (typeof path !== "string" || !path) return "file";
  const seg = path.split("/").at(-1);
  return seg || "file";
}

export function getToolCallLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = getFilename(args.path);

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":     return `Creating ${filename}`;
      case "str_replace":
      case "insert":     return `Editing ${filename}`;
      case "undo_edit":  return `Undoing edit in ${filename}`;
      case "view":       return `Reading ${filename}`;
      default:           return toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "delete": return `Deleting ${filename}`;
      case "rename": {
        const newFilename = getFilename(args.new_path);
        return args.new_path ? `Renaming ${filename} to ${newFilename}` : `Renaming ${filename}`;
      }
      default: return toolName;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getToolCallLabel(
    toolInvocation.toolName,
    (toolInvocation.args ?? {}) as Record<string, unknown>
  );
  const isComplete = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
