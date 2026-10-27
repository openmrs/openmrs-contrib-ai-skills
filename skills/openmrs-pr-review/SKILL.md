---
name: openmrs-pr-review
description: Review a GitHub pull request on an OpenMRS repository. Checks that the change resolves the issue it claims to, by the best available approach rather than merely one that works, verifies every finding empirically, and writes short review comments that read like a person wrote them. Optionally posts them inline on GitHub or stages them as a pending draft review the user finishes in the GitHub UI. Use when asked to review or re-review a PR, post review findings as PR comments, or stage review comments for approval.
license: MPL-2.0 with Healthcare Disclaimer (https://github.com/openmrs/openmrs-contrib-ai-skills/blob/main/LICENSE)
metadata:
  version: "1.0.0"
---

# Review a Pull Request

The user names a PR by number or URL. If they don't, list open PRs with `gh pr list` and ask which one. They may also ask you to **post** the review to GitHub or **stage** it as a pending draft review; if it's unclear which, stage, since that is reversible. With neither, present the review in the conversation and offer to post or stage it (Step 5).

This skill uses the GitHub CLI (`gh`) and a local clone of the repository.

## Step 1: Gather

- **PR metadata:** `gh pr view <n> --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,mergeable,mergeStateStatus,statusCheckRollup,url,createdAt,closingIssuesReferences`
- **Diff and branch:** `gh pr diff <n>` and `git fetch origin <base> 'pull/<n>/head:pr-<n>'`. If `git diff origin/<base>...pr-<n> --stat` and `git diff origin/<base> pr-<n> --stat` differ, the branch is behind its base; note the drift.
- **The problem the PR claims to solve.** Read each issue in `closingIssuesReferences` with its comments: `gh issue view <m> --json title,body,comments` (`--comments` drops the body when stdout isn't a terminal). OpenMRS PRs usually carry a Jira key in the title or branch (`TRUNK-6429`, `O3-1234`); read it at `https://openmrs.atlassian.net/rest/api/2/issue/<KEY>?fields=summary,description,status,comment`. Links to `issues.openmrs.org` redirect to a dashboard and don't serve REST. If the ticket can't be read, review from the PR description and tell the user you did.
- **The existing conversation:** `gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate` (inline threads, with `in_reply_to_id`) and `gh pr view <n> --json reviews,comments`. If a live thread already raises your finding, reply there with what you add instead of posting a fresh comment.
- **The user's own pending review:** `gh api repos/<owner>/<repo>/pulls/<n>/reviews --paginate --jq '.[] | select(.state == "PENDING")'`. Its drafts don't appear in `/pulls/<n>/comments` (read them via `.../reviews/<id>/comments --paginate`), and it makes any new review create fail with a 422. If one exists, raise it and let the user decide before you compose. Submitted, its comments are a prior round like any other. Discarded (the DELETE in [references/posting.md](references/posting.md)), re-raise whatever still holds.
- **Prior findings, checked at the head.** "Fixed" is a claim. Read the current code where each prior thread points; authors often fix a comment's headline and leave a sub-point. On a re-review, `git diff <last-reviewed-sha>..pr-<n>` shows what changed, but still check every prior finding at the head. A real fix earns **silence**: no reply, no "thanks, fixed". A surviving sub-point gets an in-thread reply naming only that sub-point and its fix.
- **A comment's commit, before calling it wrong.** If a comment's `commit_id`/`original_commit_id` isn't the head (a null `line` with a set `original_line` is the tell), diff those commits for that file to see what the commenter saw. A finding that a later commit fixed was not a false positive, bot comments included, and it too earns silence.

## Step 2: Is this the right fix, and the best one?

Settle the approach before the details. Line-level review of code that shouldn't exist wastes everyone's time.

**What problem does it solve?** In order of authority: the linked issue and its thread, the PR description, the title. Comments count as much as the issue body. A maintainer redirecting the approach in the thread ("read it from runtime properties, not a global property") that the PR ignores is the clearest approach finding there is. If no problem statement exists and the diff doesn't speak for itself, asking is usually the most valuable comment, but don't make it a reflex: a parent-POM bump or a typo fix needs no ticket.

**Does it resolve that problem?** This is a different question from whether the code is correct. The best evidence is the issue's own reproduction, failing on base and passing on the PR. Without a ticket, a "what changed" or "guarantees" list in the PR description is the acceptance criteria. Test each claim as the general statement it is ("no backend failure is reported as success" covers every backend, not only the one just fixed), and probe hardest the claims no test backs. Common misses:

- it fixes the path in the stack trace while the symptom also arrives by another path;
- it corrects the symptom and leaves the cause (normalizing on read while bad values keep being written);
- it handles the ticket's literal example rather than the class of input it stands for;
- it resolves part of a multi-part ticket and closes the whole thing.

A change that doesn't resolve the issue it closes is blocking.

**Does it do only that?** Account for each hunk as required by the ticket or not, and ask for removal of what isn't: format-on-save sweeps, drive-by renames, cleanups made in passing. Being harmless is no reason to keep a change; proving it harmless is exactly the cost it puts on the reviewer. On append-only files (migrations, changelogs, generated resources), a diff that only grows shows at a glance that nothing shipped was disturbed. Quantify the churn (`--stat` against `--stat --ignore-all-space` isolates whitespace), say what you confirmed is safe, and frame the cost as review time. It's non-blocking, and it's the one finding a clean verification argues for rather than against.

**Is it the best fix available?** Working is the floor. Name the one or two approaches a maintainer of this codebase would have weighed and say why the chosen one is better or worse than each; if you can't name one, you haven't reviewed the approach. Use the codebase as evidence: `git log` and `git grep` for how the tree already solves this class of problem, and compare against the nearest sibling ("the other three importers resolve the concept by uuid; this one parses the name"). Diverging from a sibling isn't wrong, but it needs a reason.

Signs of the wrong shape (each a finding only once verified):

- it re-implements something the framework or codebase already provides. Confirm the alternative exists *and* reaches this case first; Step 3's rules on absence claims apply;
- it bypasses the layer that enforces a constraint;
- it special-cases one caller where the shared path is broken, or changes shared behavior for one caller (name the other callers and what they get);
- it duplicates state or logic that will drift apart;
- it fixes this instance in a way the next one will have to repeat, when a general fix was available.

Signs of working-but-hacky:

- reflection, string parsing, or `toString()` comparison where a typed API exists;
- a sleep, retry, or poll standing in for real synchronization or a lifecycle hook;
- catching and swallowing to make a symptom go away;
- a method copy-pasted to change one line;
- a check disabled or loosened (test ignored, validation skipped, lint suppressed) instead of satisfied;
- a magic constant mirroring an upstream value with nothing tying them together;
- production code with a branch that exists only for a test;
- `instanceof` chains where the surrounding code dispatches polymorphically.

Over-building counts too: an abstraction or config knob for a second case that doesn't exist, or two hundred lines where twenty would do. Best means proportionate.

**The bar for objecting.** Post an approach objection only when you can name both a concrete alternative and the concrete cost of what's here: what breaks or what work it creates, and for whom ("whoever changes X next must remember to change Y" counts). Without the cost it's taste, so drop it. Without the alternative it's a question. "This feels hacky" is never a finding. Hacky-but-working is normally non-blocking and blocks only when the hack has its own failure mode. When the better approach is bigger than the PR, say so and keep it non-blocking.

**This is where you are likeliest to be wrong.** The author has context the diff doesn't carry and may have tried the obvious API. Where their reason would change your finding, ask first ("was there a reason `getUuid()` doesn't work here?"); if the reason is real, what the PR usually needs is a code comment recording it. Post one recommendation and its cost, never a tour of the alternatives you weighed.

**The ticket is evidence, not a spec.** A PR that solves the underlying problem differently from what the ticket proposed is fine; one that does what the ticket asked and leaves the problem standing is not. If the ticket itself is wrong, say so.

**When the approach is in question, lead with it** and hold line-level nits that may not survive a rewrite; say you'll do the detailed pass once the direction is settled. A sound approach earns no comment. On re-review, an approach already argued out (the author answered, or a maintainer endorsed it) stays closed unless the head changed it or new evidence overturns the answer.

## Step 3: Verify, don't just read

Every claim needs evidence, including thread replies and answers to the author's questions, which assert behavior as strongly as a finding does.

- Read the full changed files, not just the hunks, and `git grep` the whole tree for anything the PR renames or removes (e.g. filtered resources referencing a renamed Maven property).
- **Build-config changes** (pom.xml, Gradle, CI): build base and PR in throwaway worktrees (`git worktree add --detach /tmp/<name> <ref>`) and compare test counts per module, produced and installed artifacts (watch attached artifacts like `-tests.jar` that consumers depend on), `mvn dependency:tree`, and packaged-archive entries and filtered resources (`unzip -Z1`, `unzip -p ... | diff`). Remove the worktrees afterwards (`git worktree remove --force`).
- **Parent-POM or dependency upgrades:** download the new POM and confirm everything deleted locally is provided upstream (dependencies vs dependencyManagement, plugin executions, properties, distributionManagement). Check the published repository (`maven-metadata.xml`) when removing an attached artifact could break consumers.
- **Runtime behavior:** run the tests rather than asserting from code.
- A search hit in a method proves the call is somewhere in it, not on your path. Read the enclosing method and name the branch your path takes. (OpenMRS `RequiredDataAdvice.before` validates on the `save*`/`create*` branch but not the `void`/`unvoid`/`retire`/`unretire` branch, so "the advice validates" depends on the method name.)
- **Absence claims** ("nothing registers X") must be checked against the dependency's sources at the ref the project builds against (look in sibling directories for a checkout), never inferred from jar scans or config greps: component-scanned beans don't appear in XML, and installed SNAPSHOTs drift from their sources.
- A zero-hit search counts only after a positive control finds a string you know is there. Use `git grep` or `command grep` (shell `grep` may be aliased to a tool that skips binary-ish input), and never add `2>/dev/null` to an evidence-gathering command.
- If the experiment that could falsify a finding can't run, the finding becomes a question. A "confirmation" that structurally can't fail (a repro that omits the component in question) isn't verification.
- **Convention claims** ("that's not how this project does it", "X blocks the release") are settled only by the project's history: `git log -S "<pattern>" -- <path>`. Prior instances kill the finding. Verifying the mechanism is not a substitute: `mvn release:prepare` does refuse SNAPSHOT dependencies, yet an OpenMRS module carrying a sibling module's SNAPSHOT on master until release time is following the normal workflow.
- Before posting, re-read every claim against what you've already gathered and look for the fact that contradicts it, especially for a precedent cited in support of a recommendation.

**Sweep every dimension the PR touches:** solution fit (Step 2), correctness, test coverage, security (input validation, authorization, secrets in diffs or CI, injection, deserialization), performance (N+1 queries, hot-path work, blocking calls, unbounded growth), and project conventions (but not what CI formatters already enforce).

**Trace outward.** Bugs live outside the diff:

- **Unchanged neighbors:** comments, Javadoc, and docs stating an assumption ("the only caller") that the PR makes false.
- **Consumers:** events, published artifacts, API responses, filtered resources. Who consumes them, in-repo and downstream, and does the contract still hold?
- **Optional dependencies and lifecycle:** `provided` deps, `aware_of_module` references, and order-sensitive code (Spring beans, listeners, schedulers) when the dependency is absent or the ordering shifts.
- **The merged result,** not the commit stack, re-checked against the base tip if the branch is behind.

**Test coverage.** For each behavior change, name the test that fails on base, passes on the PR, and asserts the runtime effect rather than a proxy (a generated string's shape, a mirrored pattern). A behavior change without one is a finding. If part of the path can't be tested, name that sub-path and confirm the adjacent one is exercised.

**Converge.** A pass that found something substantive can't be the last; sweep again until one finds nothing. Don't invent findings to fill a quota.

**Adversarial refutation** (an independent reviewer, such as a subagent, told to refute each candidate finding; one it refutes that you can't prove becomes a question) is worth its cost only when at least two of these hold: the finding is a judgment call rather than a mechanical fact (every approach objection is); you're reviewing alone in one pass; the pass is rushed; or a false positive is costly (a blocking comment you'll post). Otherwise it repeats verification you already did, so don't make it a default.

## Step 4: Compose the review

Every line should change what the author does. Their attention is the scarce resource.

### The review body

The body is **empty by default**. It's earned only by something no inline comment can carry: a cross-cutting concern with no line to anchor to (anchor approach objections to a line when you can), an answer to a question the author asked on the PR, or a genuinely synthetic note across findings (a fix-ordering dependency, or several comments sharing one root cause). A body never:

- summarizes or tallies the inline comments, or restates a verdict that a blocking inline comment already implies;
- restates a finding. Refer to an inline comment by a bare reference ("the question on the `JacksonConfig` change"), not a recap of it;
- mentions anything verified clean, in any form. A result that must be on record goes in one inline no-action note at the relevant line. On re-review, there's no "all prior points addressed" recap.

When a body is warranted, open with the call in your own words ("I think this needs work first: ...", never a `Verdict:` label), the single biggest reason, and the bar you're judging against. Then give any finding with no inline home, then what blocks merge, said the way you'd say it to a colleague. No architecture tours or praise.

### Inline comments

- Each comment requests an action or asks a question, and its **first line makes clear what it is and what the author must do**: blocking, optional suggestion, question (also for side effects you're unsure were intended), trivial nit, or, rarely, a no-action note. A note is allowed only to record a behavior change that was deliberately accepted, or to warn a specific future reader at the line they'll read (e.g. whoever cuts the next release).
- Carry that in plain prose, not a stamped label. `issue (blocking):`, `nit:`, `Question — ...`, `Non-blocking suggestion: ...`, and softer variants like `Naming trivia, take or leave:` all read as bot output. To test an opening phrase followed by a colon: if it diagnoses the code (`Leftover from the removed handler: X is unused`), keep it; if it classifies the comment, delete it and lead with the substance. Don't let a pet phrase recur across comments or rounds. Use explicit labels only if the maintainers ask for them.
- A blocking comment states its failure mode: **"if merged as-is, X breaks because Y."** If you can't write that sentence, it isn't blocking. "Low risk" without naming the risk is a dodge. A failure that silently produces wrong behavior is one level more serious than a crash, because CI can't catch it.
- **Keep it short:** the ask, why it matters in one sentence, and the fix. At most 60 words, not counting a code or suggestion block holding the fix, commands the author asked for, or links. Put any fix longer than an identifier in a block, and link anything outside the PR where you name it. Give what verification found ("with `OMRS_DB` unset at install, restarting with `OMRS_DB=mariadb` fails with `No suitable driver found`"), not how you ran it. Leave out pasted output, second consequences, and your fix's test results unless asked. A second ask is its own comment or nothing.
- Thread replies get the same limit. After "done" or a silent fix, a reply is one sentence naming what survives, plus its fix. Otherwise it's no longer than the comment it answers or two sentences, whichever is more.
- Don't narrate the diff, and don't repeat a cross-cutting point across comments.
- When offering alternatives, recommend one.
- Use ```suggestion blocks for concrete replacements of added lines (RIGHT side only). If CI checks formatting, suggested code must be the formatter's output at the PR head (openmrs-core: `mvn -pl <module> spotless:apply` in a worktree), since an author can commit a suggestion in one click.
- Scale to the requested effort: by default, fewer high-confidence findings; at higher effort, also surface uncertain ones, as questions.
- Comments appear under the user's name, so write in the first person and keep it collegial. Prefer commas, periods, and parentheses to em dashes, and keep the prose a little plainer than polished. When correcting something from an earlier round, lead with the corrected fact, not "A correction to my earlier...".

## Step 5: Post or stage

**Before presenting, posting, or staging a review, read [references/posting.md](references/posting.md) in full.** It has the pre-posting checklist that goes in your report to the user, and the mechanics of every GitHub write.

Posting publishes under the user's GitHub account. Post only when the user asked you to post; stage only when they asked you to stage or for a draft. A staged review is created in PENDING state, invisible to the author and with no notification, and the user edits and submits or discards it in the GitHub UI. They may submit it unedited, so a staged review must meet every rule here.

**A clean verdict is told to the user, never posted.** If nothing needs action (a fresh PR, or a re-review where everything is resolved), say so in the conversation and stop. Don't open a review, even when asked to post or stage. A "LGTM / ready to merge" comment is the clearest sign a bot is on the other end.

## Anti-patterns

- **Inventing concerns to look thorough.** Depth tracks risk; a clean PR gets a short review.
- **Posting unverified suspicion as a blocker.** If you couldn't verify it, it's a question, or more homework for you.
- **Critiquing an inflated version of the PR.** Larger redesigns are follow-up suggestions. That's no license to wave through an approach that delivers the wrong thing (Step 2).
- **Mistaking a verified diff for a solved problem, or a solved problem for a well-solved one.** Passing tests say nothing about either.
- **Letting severity labels substitute for analysis.** Severity comes from the written failure mode. Small-looking patterns (an unclosed resource, a swapped id) are routinely under-rated.
- **Restoring confidence the author already has.** Don't recap what they got right, and don't soften action items because CI passes.
- **Acknowledging fixes.** Fixed means no comment; the change in disposition is the acknowledgment.
- **Reading as machine output.** A rigid template (verdict header, numbered findings, the same footer every time), stamped labels, comments that announce their own speech act ("One observation: ..."), heavy em dashes, and uniformly polished sentences all make authors disengage. Vary the structure to fit the PR.
- **Faking confidence on a PR too big to review.** Say so, suggest a split (by concern, or behavior change vs. mechanical churn), and name what you did and didn't verify.
