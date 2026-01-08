/**
 * Index command - build tool cache for installed stacks
 *
 * Usage:
 *   rudi index                    Index all installed stacks
 *   rudi index slack data-analysis  Index specific stacks
 *   rudi index --force            Force re-index even if cached
 *   rudi index --json             Output results as JSON
 *
 * This populates ~/.rudi/cache/tool-index.json which the router
 * uses for fast tools/list without spawning all stacks.
 */

import { indexAllStacks, readToolIndex, TOOL_INDEX_PATH } from '@learnrudi/core';
import { readRudiConfig } from '@learnrudi/core';

export async function cmdIndex(args, flags) {
  const stackFilter = args.length > 0 ? args : null;
  const forceReindex = flags.force || false;
  const jsonOutput = flags.json || false;

  // Check rudi.json exists
  const config = readRudiConfig();
  if (!config) {
    console.error('Error: rudi.json not found. Run `rudi doctor` to check setup.');
    process.exit(1);
  }

  const installedStacks = Object.keys(config.stacks || {}).filter(
    id => config.stacks[id].installed
  );

  if (installedStacks.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log('No installed stacks to index.');
      console.log('\nInstall stacks with: rudi install <stack>');
    }
    return;
  }

  // Check which stacks to index
  const stacksToIndex = stackFilter
    ? stackFilter.filter(id => {
        if (!installedStacks.includes(id)) {
          if (!jsonOutput) {
            console.log(`⚠ Stack not installed: ${id}`);
          }
          return false;
        }
        return true;
      })
    : installedStacks;

  if (stacksToIndex.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log('No valid stacks to index.');
    }
    return;
  }

  // Check existing index
  const existingIndex = readToolIndex();
  if (existingIndex && !forceReindex && !stackFilter) {
    const allCached = stacksToIndex.every(id => {
      const entry = existingIndex.byStack?.[id];
      return entry && entry.tools && entry.tools.length > 0 && !entry.error;
    });

    if (allCached) {
      const totalTools = stacksToIndex.reduce((sum, id) => {
        return sum + (existingIndex.byStack[id]?.tools?.length || 0);
      }, 0);

      if (jsonOutput) {
        console.log(JSON.stringify({
          indexed: stacksToIndex.length,
          failed: 0,
          cached: true,
          totalTools,
          stacks: stacksToIndex.map(id => ({
            id,
            tools: existingIndex.byStack[id]?.tools?.length || 0,
            indexedAt: existingIndex.byStack[id]?.indexedAt
          }))
        }));
      } else {
        console.log(`Tool index is up to date (${totalTools} tools from ${stacksToIndex.length} stacks)`);
        console.log(`Last updated: ${existingIndex.updatedAt}`);
        console.log(`\nUse --force to re-index.`);
      }
      return;
    }
  }

  if (!jsonOutput) {
    console.log(`Indexing ${stacksToIndex.length} stack(s)...\n`);
  }

  const log = jsonOutput ? () => {} : console.log;

  try {
    const result = await indexAllStacks({
      stacks: stacksToIndex,
      log,
      timeout: 20000 // 20s per stack
    });

    // Calculate total tools
    const totalTools = Object.values(result.index.byStack).reduce(
      (sum, entry) => sum + (entry.tools?.length || 0),
      0
    );

    if (jsonOutput) {
      console.log(JSON.stringify({
        indexed: result.indexed,
        failed: result.failed,
        totalTools,
        stacks: stacksToIndex.map(id => ({
          id,
          tools: result.index.byStack[id]?.tools?.length || 0,
          error: result.index.byStack[id]?.error || null,
          missingSecrets: result.index.byStack[id]?.missingSecrets || null
        }))
      }, null, 2));
    } else {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`Indexed: ${result.indexed}/${stacksToIndex.length} stacks`);
      console.log(`Tools discovered: ${totalTools}`);
      console.log(`Cache: ${TOOL_INDEX_PATH}`);

      if (result.failed > 0) {
        console.log(`\n⚠ ${result.failed} stack(s) failed to index.`);

        // Show hints for missing secrets
        const missingSecretStacks = Object.entries(result.index.byStack)
          .filter(([_, entry]) => entry.missingSecrets?.length > 0);

        if (missingSecretStacks.length > 0) {
          console.log(`\nMissing secrets:`);
          for (const [stackId, entry] of missingSecretStacks) {
            for (const secret of entry.missingSecrets) {
              console.log(`  rudi secrets set ${secret}`);
            }
          }
          console.log(`\nAfter configuring secrets, run: rudi index`);
        }
      }
    }

  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }));
    } else {
      console.error(`Index failed: ${error.message}`);
    }
    process.exit(1);
  }
}
