# Frontend phase plan

The frontend is a separate application and follows the backend's phased delivery. Each phase should consume existing backend contracts where they exist; screens must report API errors rather than imply unpersisted changes succeeded.

## Phase 1 — App foundation and identity

Implemented: Next.js App Router, TypeScript, Tailwind, responsive public and authenticated shells, API client, sign-in, registration, email verification, token persistence and session sign-out.

Backend dependencies: `/auth/register`, `/auth/login`, `/auth/me`.

## Phase 2 — Professional identity

Implemented: profile editing, booking preference, visibility, location, experience, skill level, profession/instrument/genre associations, weekly availability, portfolio listing/addition with R2 upload, and public musician discovery with search and direct messaging.

Backend dependencies: `/profiles`, `/profiles/me`, `/profiles/me/availability`, `/profiles/me/portfolio`, association routes, `/uploads`, `/professions`, `/instruments`, `/genres`.

Media files are sent to the authenticated backend multipart endpoint; the backend stores them in R2, so the browser needs no R2 credentials or bucket CORS rule. Public profile and post media links additionally require backend `R2_PUBLIC_BASE_URL` to point to a public R2 custom domain.

## Phase 3 — Community and content

Implemented: public community listing/create/join/detail, authenticated feed and post publishing, text polls and voting, R2 media uploads, reactions, comments and reporting.

Backend dependencies: `/communities`, `/communities/:id/join`, `/posts/feed`, `/posts`.

Next: owner/moderator workflows for reviewing private membership requests, managing community rules and removing content.

## Phase 4 — Messaging and notifications

Implemented: conversation list, direct conversation creation from musician discovery or user ID, Socket.IO chat, typing indicators, delivery/read receipt updates with history synchronization after reconnect, and live notification inbox refresh.

Backend dependencies: `/messaging/conversations`, `/messaging/conversations/:id/messages`, `/notifications` and the Socket.IO gateway events documented in `../backend/docs/API.md`.

Next: group conversations and community moderation workflows.

## Phase 5 — Groups and opportunities

Implemented: groups/organization directories, group creation and owner edit/delete, direct join/leave and member lists, opportunity listing and creation, opportunity detail view, organizer edit/delete and applicant review, and candidate apply/withdraw/reapply flows.

Backend dependencies: `/groups`, `/organizations`, `/opportunities`. Opportunity REST routes were added alongside this frontend scaffold because the existing backend service was not exposed through a controller.

## Phase 6 — Later platform capabilities (current)

Implemented foundation: follow/unfollow public musician profiles, followers/following lists, and save/unsave opportunities with a dedicated saved-items page.

Backend dependencies: `/users/me/following`, `/users/me/followers`, `/users/:userId/follow`, and `/users/me/saved-opportunities`.

Next: richer profession/instrument/genre search filters, moderation/admin, analytics, and education/equipment services. Booking, agreement, review and payment workflows also require their backend contracts.

## Integration boundary

The current UI intentionally does not invent data for unfinished backend capabilities. API failures are surfaced in the relevant screen. Do not treat this frontend scaffold as complete backend coverage or as production-validated until integration tests and a build are permitted.
