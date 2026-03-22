export interface EnvGroup {
  comment?: string;
  vars: EnvVar[];
}

export interface EnvVar {
  key: string;
  value: string;
}

/**
 * Merge selected vars into existing .env content.
 * - Existing vars updated in place if selected
 * - New vars appended at end with their comments
 * - Unselected/missing vars left untouched
 */
export function mergeEnvContent(existingContent: string, selectedGroups: EnvGroup[]): string {
  const existingLines = existingContent.split('\n');

  // Build a map of selected vars for quick lookup
  const selectedVars = new Map<string, { group: EnvGroup; value: string }>();
  for (const group of selectedGroups) {
    for (const v of group.vars) {
      selectedVars.set(v.key, { group, value: v.value });
    }
  }

  // Track which selected vars were found in existing content
  const found = new Set<string>();

  // Update existing lines in place
  const updatedLines: string[] = [];
  for (const line of existingLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const selected = selectedVars.get(key);
        if (selected) {
          updatedLines.push(`${key}=${selected.value}`);
          found.add(key);
          continue;
        }
      }
    }
    updatedLines.push(line);
  }

  // Append new vars that weren't in existing content
  const newGroups: EnvGroup[] = [];
  for (const group of selectedGroups) {
    const newVars = group.vars.filter(v => !found.has(v.key));
    if (newVars.length > 0) {
      newGroups.push({ comment: group.comment, vars: newVars });
    }
  }

  if (newGroups.length > 0) {
    // Ensure there's a blank line before appended content
    const lastLine = updatedLines[updatedLines.length - 1]?.trim();
    if (lastLine !== '') {
      updatedLines.push('');
    }
    updatedLines.push(serializeEnvGroups(newGroups).trimEnd());
  }

  return updatedLines.join('\n').trimEnd() + '\n';
}

/**
 * Parse .env content into groups of comments + vars.
 * A comment block belongs to the vars immediately below it.
 */
export function parseEnvContent(content: string): EnvGroup[] {
  const lines = content.split('\n');
  const groups: EnvGroup[] = [];
  let currentComment: string[] = [];
  let currentVars: EnvVar[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line — flush current group if it has vars
      if (currentVars.length > 0) {
        groups.push({
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          vars: currentVars,
        });
        currentComment = [];
        currentVars = [];
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      // If we have vars accumulated, flush them first (comment starts a new group)
      if (currentVars.length > 0) {
        groups.push({
          comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
          vars: currentVars,
        });
        currentComment = [];
        currentVars = [];
      }
      currentComment.push(line);
      continue;
    }

    // Parse KEY=VALUE
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      currentVars.push({ key, value });
    }
  }

  // Flush remaining
  if (currentVars.length > 0 || currentComment.length > 0) {
    groups.push({
      comment: currentComment.length > 0 ? currentComment.join('\n') : undefined,
      vars: currentVars,
    });
  }

  return groups;
}

/**
 * Serialize selected groups back to .env content.
 */
export function serializeEnvGroups(groups: EnvGroup[]): string {
  const parts: string[] = [];

  for (const group of groups) {
    if (group.vars.length === 0) continue;

    if (group.comment) {
      parts.push(group.comment);
    }
    for (const v of group.vars) {
      parts.push(`${v.key}=${v.value}`);
    }
    parts.push('');
  }

  return parts.join('\n').trimEnd() + '\n';
}
