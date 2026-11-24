# Dispatch delegated authority policy (P0–P4)

Status: review draft. This document models authority; it does not grant any
authority, change credentials, or authorize a deployment or database action.

## Invariants

1. **Brian is the approval authority.** June may observe, document, and draft;
   she does not decide, publish autonomously, manage money, or represent an
   agent or human.
2. **Dispatch is observation-only.** A delivered interrupt is not proof of
   execution. Only an authenticated read-back acknowledgment from the target
   agent can establish that the target reported completion.
3. **Least privilege and explicit scope.** A delegation names the actor,
   environment, operation, data boundary, expiry, and rollback/stop condition.
   Unnamed or ambiguous authority is denied.
4. **Production is a separate trust boundary.** No production write, migration,
   deployment, rollback, credential/connected-service change, or live control
   request is allowed from a lower tier or inferred from a prior approval.
5. **Fail closed.** Missing identity, stale timestamp, reused nonce,
   mismatched signature, missing idempotency key, expired delegation, or
   uncertain evidence means no action.

## Authority levels

| Level | Meaning | Allowed in this review package | Approval boundary | Examples of prohibited work |
| --- | --- | --- | --- | --- |
| **P0 — Observe** | Read facts and identify uncertainty. | Repository inspection, read-only inventory, synthetic test design, risk notes. | No approval needed for local inspection. | Writes, control requests, conclusions presented as decisions. |
| **P1 — Draft** | Prepare a reversible proposal for a human to review. | This policy, migration/deployment plan, test plan, rollback plan, and approval checklist. | Brian must approve the proposal before any operational step. | Applying the plan, publishing it as approved, changing Linear structure. |
| **P2 — Prepare** | Make bounded, reversible local or isolated-staging preparations. | Only after explicit task scope: local fixtures, synthetic data, tests, generated migration for review, staging rehearsal. | Brian approval is required before each external/staging mutation; synthetic local work may be scoped in advance. | Production access, production data, real credentials, live telemetry/control. |
| **P3 — Supervised verify** | Run an already-approved non-production or production read-only verification. | A future staging acceptance run, or a read-only production observation explicitly named in an approval. | Written approval must name environment, endpoints, time window, evidence, and stop condition. | Any production write, migration, deploy, rollback, credential change, or interrupt. |
| **P4 — Execute** | Perform a consequential production operation. | **Not granted by this document.** | Requires Brian's explicit, operation-specific approval immediately before execution; approval is not transferable or reusable. | Autonomous execution, broad/standing approval, silent retry after a failed gate, or treating HTTP 2xx as execution proof. |

### Approval token requirements

For P2–P4, the approving instruction must identify:

- exact repository commit or artifact;
- named operator/agent and delegated level;
- exact environment and database target (never a credential value);
- exact commands/endpoints and permitted data scope;
- start/end time, success criteria, stop conditions, and rollback owner;
- whether the action is read-only, reversible, or a production mutation.

“Looks good”, a second “yes”, a prior plan review, or an implicit schedule is
not a P4 approval. A preview is not an apply authorization.

## Policy for this worktree

This branch is P1. It contains only reviewable local docs and tests. It has not
connected to a production database, sent valid production telemetry/control
requests, changed credentials, deployed, migrated, or restructured Linear.

