# Rwanda Music Hub Frontend

The client application for Rwanda Music Hub, built with Next.js App Router, React, TypeScript and Tailwind CSS. It is designed to work with the NestJS API in `../backend`.

## Local configuration

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` to the backend REST API URL (including `/api/v1`).
3. Set `NEXT_PUBLIC_SOCKET_URL` to the backend origin used by Socket.IO.
4. Install dependencies and run the app when approved (the client uses port `3001` by default to avoid the backend's port `3000`):
   ```bash
   npm install
   npm run dev
   ```

No dependencies have been installed and no build or tests have been run as part of this scaffold.

## Current product areas

- Public landing page, account registration, email verification and sign-in
- Authenticated app shell and community feed
- Music community listing, creation and membership requests
- Community detail pages, feed posting, reactions, comments, polls, voting and post reporting
- Opportunity listing and creation
- Group and organization directories
- Professional profile and portfolio editing
- Profession, instrument and genre associations; weekly availability; public musician search
- Conversation inbox with Socket.IO messaging, delivery and read receipts
- In-app notifications
- Discovery catalogs for professions, instruments and genres

See `docs/PHASES.md` for the incremental implementation plan and current integration boundaries.
