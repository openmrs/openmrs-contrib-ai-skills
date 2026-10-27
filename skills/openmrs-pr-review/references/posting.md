# Posting and staging a review

Read this whole file before presenting, posting, or staging a review. Steps and rules it refers to are in `SKILL.md`.

## Pre-posting checklist

Before presenting, posting, or staging, state each of these in your report to the user, one line each. If one isn't true, fix the review first.

1. I identified the problem the PR solves and checked that the change resolves it (or said I couldn't reach the ticket), and tested any guarantees the PR description states one at a time.
2. I judged whether this is the best available fix against the alternatives a maintainer would weigh, and any approach objection names a concrete alternative and a concrete cost.
3. I accounted for every hunk and asked for removal of what the ticket doesn't require, including changes I verified as harmless.
4. Every finding was verified by building, running, tracing, or checking upstream sources, and where CI checks formatting, any code I suggest is the formatter's output at the PR head.
5. No comment or body leads with a stamped label; each comment asks for an action or asks a question; every blocking comment has its failure-mode sentence; every comment and reply is within the length limits; and nothing acknowledges a fix.
6. The body is empty unless it carries something no inline comment can, and has no summary, tally, restated finding, or verified-clean content.
7. Needs action before merge: [list, or "none", in which case the verdict goes to the user, and nothing is posted or staged].

## Before any review create

- **Re-check for a pending review** (Step 1). A user can have one pending review per PR: any create, posted or staged, fails with 422 "User can only have one pending review per pull request", and REST can't append to an existing one. If one exists, or that 422 appears, stop and ask the user rather than touching it.
- **Re-fetch the conversation** (`gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate` and `gh pr view <n> --json reviews,comments`). Verification may have taken an hour, and a new comment can duplicate, answer, or clear a finding. A maintainer saying "if you do this, also do X" has accepted the thing you were about to block on. Drop, downgrade, or re-anchor what the new material covers; if it changes the verdict, go back to Step 2.

## Building the payload

- Build `payload.json` with `python3` and `json.dump`; raw tabs and newlines in hand-written JSON break the call.
- **Anchoring:** deleted lines use `"side": "LEFT"` with line numbers from the merge-base version of the file; added and context lines use `"side": "RIGHT"` with numbers from the PR head. Get exact numbers with `git show <ref>:<path> | cat -n`. Find the merge-base with `git merge-base origin/<base> pr-<n>`; if it equals the base tip, base-branch numbers are safe for LEFT.
- **Multi-line comments** use `start_line`/`start_side` plus `line`/`side`, and the span must fall within a single diff hunk.

## Posting

- **Create one review:** `gh api repos/<owner>/<repo>/pulls/<n>/reviews --input payload.json` with `"event": "COMMENT"`, a `body`, and a `comments` array. Never use `APPROVE` or `REQUEST_CHANGES` unless the user chose it.
- **Thread replies:** `gh api repos/<owner>/<repo>/pulls/<n>/comments/<comment_id>/replies -f body=...`. These publish immediately as standalone comments with their own ids and don't appear in the review's comments.
- **Verify by content, not counts:** `gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate --jq '.[] | select(.pull_request_review_id == <id>) | {path, line, side, body}'`. `--paginate` is mandatory (30 per page by default, so a busy PR gives false negatives without it). Diff against what you submitted by `{path, line}`. Reads can lag a few seconds; if something looks missing, re-query. **Never re-post on a mismatch**, since that's how duplicates get created. Delete any duplicates with `gh api -X DELETE repos/<owner>/<repo>/pulls/comments/<comment_id>`. Then give the user the review URL.
- **Fixing a posted review:** edit in place, never post a second review. Update the body with `gh api -X PUT repos/<owner>/<repo>/pulls/<n>/reviews/<id> --input body.json` (a `{"body": "..."}` file); `{"body": ""}` is accepted and blanks the body, which is right when it only re-announced what an inline comment said. Edit a comment with `gh api -X PATCH repos/<owner>/<repo>/pulls/comments/<comment_id> -f body=...`.

## Staging

- **Create:** the same payload with `event` omitted entirely. GitHub creates the review in PENDING state.
- **Thread replies:** the `/replies` endpoint publishes immediately and can't stage. Use the GraphQL mutation `addPullRequestReviewThreadReply` with `pullRequestReviewId` (the pending review's `node_id`, returned by the create), `pullRequestReviewThreadId`, and `body`. Find the thread id in the PR's `reviewThreads` connection by matching the target comment's REST id against `fullDatabaseId`. It's a **string**, so a numeric jq comparison silently matches nothing. (Older GitHub Enterprise Server schemas use `databaseId` instead; fall back to it if `fullDatabaseId` errors as unknown.) For a round with only replies, create the pending review with an empty `{}` payload first so there's something to attach to.
- **Verify:** pending comments don't appear in `/pulls/<n>/comments`; list them with `gh api repos/<owner>/<repo>/pulls/<n>/reviews/<review_id>/comments --paginate`. Expect the payload's comments plus every GraphQL-attached reply (match replies by `body` and `in_reply_to_id`; they aren't duplicates). Compare by `{path, body}`, not `{path, line}`: until submission, pending comments report `line` and `side` as `null`. If something looks missing, re-query after a few seconds before repairing.
- **Hand off:** end the report with the review URL, and say plainly that only the user can see it until they submit it (Files changed, then "Finish your review"), and that a forgotten pending review never happened. Which event to submit with is the user's call. Discard with `gh api -X DELETE repos/<owner>/<repo>/pulls/<n>/reviews/<review_id>` (pending reviews only).
- **Fixing a staged review:** the user edits drafts in the UI, so usually nothing is needed. A missing or newly requested thread reply attaches in place via the GraphQL path (the pending review's `node_id` is in the reviews listing). Anything else (bad anchors, a missing top-level comment) means delete and restage; never DELETE individual comments, which silently loses drafts. Before hand-off, rebuild from your composition with the defect fixed. After hand-off, list the current drafts first: their wording and deletions win, since restaging your original would revert the user's edits, and only the piece being repaired comes from your composition. Deleting the review also removes GraphQL-attached replies, so restage those too, then verify against the corrected set.
