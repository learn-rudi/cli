import path from 'path';
import { execFileSync } from 'child_process';

/**
 * Resolve the primary repository root even when called inside a worktree.
 */
export function getRepoRoot(cwd) {
  const gitCommonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    stdio: 'pipe',
  }).toString().trim();
  return path.dirname(path.resolve(cwd, gitCommonDir));
}

/**
 * Parse `git worktree list --porcelain` output into structured entries.
 */
export function parseWorktreeList(output) {
  if (!output || !output.trim()) return [];

  const worktrees = [];
  const blocks = output.trim().split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.trim().split('\n');
    const entry = { path: '', head: '', branch: '', bare: false, detached: false };

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        entry.path = line.slice('worktree '.length);
      } else if (line.startsWith('HEAD ')) {
        entry.head = line.slice('HEAD '.length);
      } else if (line.startsWith('branch ')) {
        entry.branch = line.slice('branch '.length).replace('refs/heads/', '');
      } else if (line === 'bare') {
        entry.bare = true;
      } else if (line === 'detached') {
        entry.detached = true;
      }
    }

    if (entry.path) worktrees.push(entry);
  }

  return worktrees;
}
