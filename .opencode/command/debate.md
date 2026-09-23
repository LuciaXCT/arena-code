---
description: Critic plus brainstorm, then a verdict. No edits.
subtask: false
---

Debate this. Do not edit files. Do not role-play both sides yourself.

Question: $ARGUMENTS

Do this in order:

1. Call the critic subagent on the question. Wait for its blockers.
2. Call the brainstorm subagent on the same question. Wait for its options.
3. Only then write a verdict.

Verdict format:

- Decision: one sentence
- Why: the evidence, not the vibe
- Smallest next step
- What would prove this verdict wrong

If you cannot actually invoke critic and brainstorm as separate subagents, stop and say so. Do not fake a two-model debate in one reply.
