# Skills4Export Design System Brief

This document describes the current visual language, UI patterns, frontend stack, and design decisions used in the Skills4Export application. Use it as the design handover reference before creating the admin section so the admin experience feels like part of the same product.

## Product Feel

Skills4Export is a professional community platform for posts, questions, jobs, pages, profiles, freelancers, and communities. The design direction is quiet, structured, and work-focused. It should feel closer to a modern social/professional network than a marketing site.

The interface favors:

- Dense but readable information.
- Soft borders instead of heavy shadows.
- Restrained purple/indigo branding.
- Rounded cards and controls.
- Clear icon-led navigation.
- Mobile-first overlays that become bottom sheets.
- Feed-style content layouts inspired by LinkedIn-style professional posting.

Avoid decorative or oversized marketing patterns inside the app workspace. The admin section should be operational: tables, filters, review queues, status chips, bulk actions, and clean forms should be prioritized over hero sections or decorative blocks.

## Frontend Stack

The app is built with:

- `Vue 3` as the UI framework.
- `TypeScript` for typed components and services.
- `Vite` as the dev/build tool.
- `Vue Router` for page routing.
- `Pinia` for app/auth/page state.
- `Tailwind CSS v4` through `@tailwindcss/vite`.
- `lucide-vue-next` for icons.
- `vue-sonner` for toast notifications.
- `@ckeditor/ckeditor5-vue` and `@ckeditor/ckeditor5-build-classic` for rich post content editing.

Scripts:

- `npm run dev` starts Vite.
- `npm run build` runs `vue-tsc -b` and `vite build`.
- `npm run preview` previews the production build.

## Important Files

- `src/style.css`: global theme tokens, Tailwind import, typography, CKEditor styling, compact app-wide overrides, scrollbar and toast styling.
- `src/App.vue`: app shell, header/sidebar/right-rail layout rules, route layout switching, global API debug modal.
- `src/components/AppHeader.vue`: top navigation, search, notification menu, account menu, ask/post modals, post composer.
- `src/components/AppSidebar.vue`: left navigation, feed filters, browse links, pages block, contextual jobs/freelancer/question sidebars.
- `src/components/AppRightRail.vue`: right rail with trending questions and advertisement card.
- `src/components/ResponsiveOverlay.vue`: reusable modal/bottom-sheet/side-panel component.
- `src/components/AppFeedPost.vue`: primary feed card and post interaction patterns.
- `src/views/ProfileView.vue`, `src/views/PublicProfileView.vue`, `src/views/EditProfileView.vue`: profile header, avatar, banner, profile sections, modals.
- `src/composables/useTheme.ts`: light/dark/system theme handling.
- `src/router/index.ts`: public, auth, app, feed, profile, post, question, jobs, pages, community, and mobile routes.

## Theme Tokens

The design system uses CSS custom properties defined in `src/style.css`. Components should use these tokens instead of hardcoded colors wherever possible.

### Brand Palette

Core brand colors are purple/indigo:

- `--primary`: `#443fa0` in light mode.
- `--primary-deep`: `#353266`.
- `--primary-soft`: `#e8e9ff`.
- Tailwind theme brand scale includes `brand-50` through `brand-950`, from `#f4f5ff` to `#12121f`.

Accent tokens:

- `--accent`: main action color.
- `--accent-strong`: hover/strong accent.
- `--accent-soft`: soft background tint.

Semantic colors:

- `--success`: teal, `#2dd4bf`.
- `--warning`: amber, `#fbbf24`.
- `--danger`: red, `#e5484d` light mode and `#ff6369` dark mode.

### Surfaces

Light mode:

- `--app-bg`: vertical gradient from white into pale blue.
- `--header-bg`: white.
- `--surface-primary`: white.
- `--surface-secondary`: pale blue-white, `#f8f9ff`.
- `--surface-muted`: soft elevated blue, `#f3f5ff`.
- `--search-bg`: `#f3f5ff`.
- `--border-soft`: `#dde3f1`.

Dark mode:

- `--app-bg`: gradient from `#12121f` to deep indigo.
- `--surface-primary`: `#12121f`.
- `--surface-secondary`: `#1e1e30`.
- `--surface-muted`: `#25253a`.
- `--border-soft`: `#2f3450`.

### Text

Use:

- `--text-primary` for headings and important body text.
- `--text-secondary` for standard supporting text.
- `--text-tertiary` for labels, metadata, uppercase section labels, and muted helper text.

### Shadows

The app intentionally suppresses shadows globally:

```css
:where([class*='shadow-']) {
  box-shadow: none !important;
}
```

Even though many components include `shadow-[var(--shadow-elevated)]`, the actual visual style is flat, border-led, and calm. Admin UI should continue this: use borders, spacing, and background contrast, not drop shadows, to separate surfaces.

## Typography

Fonts are imported from Google Fonts:

- `Inter`: default sans font.
- `Plus Jakarta Sans`: display font for headings.
- `Cormorant Garamond`: serif accent used sparingly for landing markers.

Theme font aliases:

- `--font-sans`: Inter, Plus Jakarta Sans, Segoe UI, sans-serif.
- `--font-display`: Plus Jakarta Sans, Inter, Segoe UI, sans-serif.
- `--font-serif`: Cormorant Garamond, Georgia, serif.

Global type behavior:

- Body font size starts at `15.5px`.
- Large screens increase to `15.75px`.
- Main app text is compacted to about `0.9rem`.
- Headings use display font and slight negative tracking.
- Overall line-height is compact, but body text blocks use enough leading for readability.

Admin guidance:

- Use compact headings.
- Keep labels around `0.78rem` to `0.9rem`.
- Use uppercase tracking for section labels and metadata.
- Avoid huge hero typography in dashboards or admin screens.

## Layout System

The authenticated app shell uses a three-column workspace layout:

- Left sidebar: about `17.5rem`.
- Main content: flexible `minmax(0, 1fr)`.
- Right rail: about `17.5rem`.
- Max app width: `86rem`.

`src/App.vue` controls when sidebars appear:

- Standard app routes show header and workspace shell.
- Profile/settings/create-page adjust sidebar or right rail behavior.
- Mobile routes are separate for search, notifications, and account.

The app layout is designed to be scroll-contained on desktop:

- Sidebar, main content, and right rail can each scroll independently.
- `.app-scroll` gives custom thin scrollbars with accent-colored thumbs.

Admin guidance:

- Keep admin pages inside the `layout: 'app'` shell unless intentionally building a standalone auth/public admin route.
- Use the same constrained workspace width.
- For admin-heavy pages, prefer a main content panel with filters/actions at top and tables/lists below.
- Keep sidebars contextual: admin navigation can replace or extend existing sidebar groups.

## Cards And Surfaces

Cards generally use:

- `bg-[var(--surface-primary)]`.
- `border border-[color:var(--border-soft)]`.
- Rounded corners around `1rem`.
- Minimal or no shadow.
- Internal spacing usually `1rem`.

Global CSS reduces large radii:

```css
#app main :is([class~="rounded-3xl"], [class~="rounded-[1.35rem]"], [class~="rounded-[1.5rem]"], [class~="rounded-[1.6rem]"], [class~="rounded-[2rem]"]) {
  border-radius: 1rem !important;
}
```

Use cards for:

- Feed posts.
- Repeated list items.
- Profile sections.
- Form sections.
- Modals.
- Right rail panels.

Avoid:

- Nested decorative cards.
- Heavy shadows.
- Overly large hero cards in app/admin surfaces.

## Buttons And Controls

Primary buttons:

- Background: `var(--accent)`.
- Text: white.
- Hover: `var(--accent-strong)`.
- Radius: typically `0.75rem` to `1rem`, or full for circular icon buttons.

Secondary buttons:

- Border: `var(--border-soft)`.
- Text: `var(--text-secondary)`.
- Hover text: `var(--accent-strong)`.

Icon buttons:

- Use `lucide-vue-next`.
- Common size: `h-9 w-9`.
- Shape: `rounded-full`.

Form controls:

- Height usually `h-10`, `h-11`, or `h-12`.
- Radius around `0.75rem` to `0.9rem`.
- Background: `surface-primary` or `surface-secondary`.
- Focus border: `accent-soft`.

Admin guidance:

- Use icon+label buttons for clear commands like approve, reject, edit, delete, export, filter.
- Use icon-only buttons only when the symbol is familiar and an accessible label is present.
- Use status chips for moderation/admin states.

## Navigation

Top header includes:

- Brand logo.
- Main nav: Home, Ask, Post, Community.
- Search input.
- Notifications.
- User avatar/menu.

Sidebar includes:

- Feed filters: Popular, Latest.
- Browse: Jobs, Answer, Communities, Freelancers, Create Page.
- Your Pages block.
- Contextual sidebar modes for Jobs, Questions, Freelancers.

Admin section recommendation:

- Add an Admin entry only for admin users.
- Admin sidebar groups should use the same pattern:
  - Uppercase group label.
  - Compact rounded links.
  - Lucide icons.
  - Active link uses `bg-[var(--accent)] text-white`.

Suggested admin groups:

- Overview.
- Users.
- Posts.
- Questions.
- Communities.
- Pages.
- Jobs.
- Reports.
- Media Jobs.
- Settings.

## Modals, Sheets, And Overlays

The app uses `ResponsiveOverlay.vue` for most modal patterns.

Behavior:

- Desktop: centered modal panel.
- Mobile: bottom-sheet style panel.
- Mobile sidebar: side drawer from the left.
- Escape closes modal.
- Body scrolling locks while open.
- A small handle bar appears on mobile bottom sheets.

Overlay tokens:

- Backdrop: `--overlay-bg`.
- Panel: `surface-primary`.
- Border: `border-soft`.
- Radius: `1rem`.

Admin guidance:

- Create, edit, confirmation, report review, and detail panels should use `ResponsiveOverlay`.
- On mobile, admin modals should read as bottom sheets.
- Keep modal content scrollable with fixed header/footer if action-heavy.

## Toasts And Feedback

Toasts use `vue-sonner` and are globally styled in `src/style.css`.

Toast design:

- Rounded cards.
- Left accent rail.
- Themed success/error/warning/info backgrounds.
- No drop shadow.
- Compact but readable text.

Use toast feedback for:

- Save success.
- Upload processing.
- API failures.
- Form validation.
- Admin actions like approve/reject/delete.

## Loading States

The app uses skeleton loaders instead of plain "Loading..." text in the main user-facing pages.

Skeleton style:

- `animate-pulse`.
- `bg-[var(--surface-muted)]`.
- Rounded bars/circles.
- Same approximate shape as final content.

Admin guidance:

- Tables should use skeleton rows.
- Cards should use skeleton titles, metadata, and action placeholders.
- Avatars should use circular skeletons.

## Images And Media

Profile images:

- Avatars are circular.
- Use `rounded-full`.
- `object-cover`.

Profile banners:

- Use a horizontal cover frame.
- Current profile/edit/public profile banner uses roughly a `4:1` frame.
- Use `object-cover`.

Post images:

- The reference sizes now used in the app are:
  - Standard landscape: `1200 x 627` (`1.91:1`).
  - Square: `1080 x 1080` (`1:1`).
  - Vertical mobile-first: `1080 x 1350` (`4:5`).
- Accepted image formats for post upload: PNG, JPG/JPEG, GIF.
- Max image size: 5 MB.
- Feed and detail displayed images maintain a fixed frame and use `object-cover`, LinkedIn-style, so no side gutters appear.
- Composer preview uses a constrained preview frame so the user can inspect the selected file before posting.

Admin guidance:

- Media moderation screens should show thumbnails in fixed aspect-ratio boxes.
- Use `object-cover` for listing thumbnails.
- Use `object-contain` only in a detailed preview where preserving the full image matters.

## Feed Card Pattern

`AppFeedPost.vue` is the strongest reusable reference for social content cards.

Feed card structure:

- Card shell: white/surface primary, border, `rounded-[0.9rem]`.
- Author row with circular avatar.
- Author metadata chips.
- Context label such as `USER POST`, `QUESTION`, or `USER POST IN COMMUNITY`.
- Title.
- Three-line clamped description.
- Optional image/media frame.
- Action row: score, share, comment, report, save.

Admin adaptation:

- For moderation, preserve content preview structure but add admin action bar:
  - Approve.
  - Reject.
  - Hide.
  - View details.
  - Assign reviewer.
  - Status chip.

## Profile Pattern

Profile pages use:

- Banner strip at top.
- Circular avatar overlapping the banner/profile body.
- Name, role/company/location metadata.
- Stats links.
- Section cards for skills, projects, certifications, education, experience, and recent activity.
- Mobile-friendly modals for editing sections.

Admin adaptation:

- User detail pages should reuse this profile header pattern.
- Add admin-only metadata panels:
  - Account status.
  - Role.
  - Verification.
  - Join date.
  - Last login.
  - Report count.
  - Moderation actions.

## Rich Text

Post content uses CKEditor classic build:

- Toolbar includes heading, bold, italic, underline, lists, link, block quote, code block, undo, redo.
- Editor styling is themed through CSS variables under `.post-content-editor`.
- Editor min height: `18rem`.
- Radius: `0.75rem`.

Admin guidance:

- Use CKEditor for admin-created announcements, policy posts, or rich moderation notes if needed.
- For short admin notes, use plain `textarea`.

## Dark Mode

The app supports `light`, `dark`, and `system` modes through `useTheme.ts`.

Mechanism:

- Stored in localStorage key `Skills4Export-theme`.
- Applied to `document.documentElement.dataset.theme`.
- Theme tokens change under `:root[data-theme='dark']`.

Admin section must use tokens, not hardcoded light colors, so it remains dark-mode compatible.

## Responsive Behavior

Mobile-first patterns:

- Header condenses into mobile navigation.
- Sidebar becomes a left drawer.
- Modals become bottom sheets.
- Controls remain touch-friendly.
- Feed images use portrait-friendly aspect on mobile.

Desktop patterns:

- Three-column shell.
- Sticky/pinned side regions.
- Independent scrolling regions.
- More compact content density.

Admin guidance:

- Mobile admin pages should still be usable, but optimize admin tables with stacked rows/cards on small screens.
- Avoid horizontal overflow where possible.
- For wide data tables, use an overflow container with clear sticky columns/actions if necessary.

## Icon System

Use `lucide-vue-next` for all icons.

Common icons already used:

- Navigation: `House`, `MessageSquareMore`, `SquarePen`, `Users`, `BriefcaseBusiness`, `Compass`.
- Actions: `Edit2`, `Pencil`, `X`, `ArrowRight`, `ArrowUp`, `Copy`, `Flag`, `Bookmark`.
- Media: `Camera`, `CloudUpload`, `Image`, `Video`.
- Status/utility: `Bell`, `BadgeHelp`, `Megaphone`, `Check`.

Admin recommendations:

- Users: `Users`.
- Reports: `Flag`.
- Posts: `SquarePen` or `MessageSquareMore`.
- Questions: `BadgeHelp`.
- Jobs: `BriefcaseBusiness`.
- Settings: use a settings/gear icon from Lucide.
- Moderation approval: `Check`.
- Rejection/delete: `X`.

## Data And API Layer

Services live in `src/services`.

Current service modules:

- `auth.ts`.
- `users.ts`.
- `media.ts`.
- `posts.ts`.
- `questions.ts`.

API wrapper:

- `src/lib/api.ts`.
- Handles request methods, token usage, timeout behavior, and API error modal integration.

Stores:

- `auth`: token, user id, user profile, signup/profile draft.
- `app`: app metadata and API debug modal state.
- `pages`: locally managed page state.

Admin guidance:

- Add admin service modules rather than mixing admin API calls into user-facing services.
- Suggested modules:
  - `src/services/adminUsers.ts`.
  - `src/services/adminPosts.ts`.
  - `src/services/adminReports.ts`.
  - `src/services/adminPages.ts`.
  - `src/services/adminMedia.ts`.
- Keep response mapping helpers in `src/utils` when backend shape differs from UI shape.

## Current Route Families

Public/auth:

- `/`
- `/auth/login`
- `/auth/signup`
- `/auth/verify-email`
- `/auth/signup/success`
- `/auth/forgot-password`
- `/auth/google/callback`

App:

- `/feed`
- `/posts/:slug`
- `/questions/:slug`
- `/answer/question`
- `/communities`
- `/communities/:slug`
- `/jobs`
- `/jobs/feed`
- `/jobs/alerts`
- `/jobs/:slug`
- `/pages/create`
- `/pages/:slug`
- `/profile`
- `/profile/edit`
- `/profile/view/:id`
- `/profile/followers/:id`
- `/profile/login-history`
- `/settings`
- `/referrals`
- `/freelancers`
- `/mobile/notifications`
- `/mobile/search`
- `/mobile/account`

Admin routing recommendation:

- Use `/admin` for overview.
- Use nested admin routes:
  - `/admin/users`
  - `/admin/users/:id`
  - `/admin/posts`
  - `/admin/questions`
  - `/admin/reports`
  - `/admin/communities`
  - `/admin/pages`
  - `/admin/jobs`
  - `/admin/media`
  - `/admin/settings`

Set `meta: { layout: 'app', requiresAuth: true }` and add an admin guard when role data is available.

## Admin Section Design Direction

The admin section should feel like a control room version of the existing app.

Recommended admin page layout:

1. Compact page heading with title and short description.
2. Top action row with primary CTA and secondary filters.
3. KPI cards using existing card style.
4. Main data area:
   - Table on desktop.
   - Stacked cards on mobile.
5. Right-side or modal detail view for review actions.

Recommended admin components:

- Stat cards.
- Filter bar.
- Search input.
- Status chips.
- Data table.
- Bulk action toolbar.
- User/post preview cards.
- Moderation drawer/bottom sheet.
- Confirmation modal.
- Empty state card.
- Skeleton rows.

Recommended status chip colors:

- Active/approved: soft teal or green.
- Pending: soft amber.
- Rejected/blocked: soft red.
- Draft/inactive: surface-muted with tertiary text.
- Admin/privileged: accent-soft with accent-strong.

Use CSS variables and Tailwind utility classes:

```vue
<section class="rounded-[1rem] border border-[color:var(--border-soft)] bg-[var(--surface-primary)] p-4">
  <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
    Admin
  </p>
  <h1 class="mt-2 text-xl font-semibold text-[var(--text-primary)]">Users</h1>
</section>
```

## Do And Do Not

Do:

- Use `var(--surface-primary)`, `var(--surface-secondary)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--accent)`.
- Use Lucide icons.
- Keep border-led visual separation.
- Use rounded `1rem` cards.
- Use bottom sheets on mobile.
- Use skeleton loaders.
- Keep admin information dense but scannable.
- Use fixed image aspect frames.

Do not:

- Add heavy drop shadows.
- Add gradient/orb decorative backgrounds inside admin tools.
- Build a marketing-style admin landing page.
- Use oversized hero typography in admin pages.
- Hardcode colors that break dark mode.
- Use square avatars.
- Use text-only controls where a familiar icon plus label would improve scanning.

## Handoff Summary

The Skills4Export UI is a compact, professional, border-led social workspace with a purple/indigo brand system, light/dark theme tokens, circular avatars, fixed-ratio media, bottom-sheet mobile modals, and feed/profile patterns inspired by professional networks. The admin section should extend this system with operational density: tables, filters, moderation queues, status chips, and reusable responsive overlays while preserving the same tokens, spacing, typography, icon language, and calm visual tone.
