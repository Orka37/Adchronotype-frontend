# Lead feedback implementation status

Implemented locally; not committed, deployed, or released.

| Area | Changes |
| --- | --- |
| App styling | Reduced card/control corner rounding and removed decorative separator dots and redundant symbols. |
| Home | Signed factor scales with numbers; existing score ranges/colors retained; plain similarity label; concise baseline; colored BMI scale. |
| Sleep | Plain bedtime/wake labels and a sleep-quality scale using the existing 0–21 input range. |
| Research tips | Consistent book icons; small category badges removed; headings and links retained. |
| Caregiver | Text-only tabs, simpler event rows and headings, shorter Routine/Shared/You text, fewer decorative symbols. |
| Calm windows | Patient-local 24-hour green/red timeline with clock and exact window labels. Missing data stays unclassified; fewer incidents do not prove calm. |
| Profile | Email hidden, Similarity score wording and consistent colors, revised chronotype quiz wording, Update factors action without extra helper text. |
| Cognitive tests | Existing screen unchanged. |
| Login | Existing email/password plus Google integration in frontend and backend. Google is unavailable until OAuth configuration exists. |

## Validation

- Frontend TypeScript check passed.
- Two score/timeline unit tests passed.
- Web, Android and iOS JavaScript exports passed; this is not a native release build.
- Backend Google/caregiver suite: 33 tests passed in an isolated test environment before applying the verified files to the backend repository.
- UI inspected using actual components with fictional fixture data, including phone/tablet widths and light/dark appearances. This does not replace device testing.

## Remaining release work

1. Create Google OAuth clients and configure public frontend IDs and the backend audience; see GOOGLE_SIGN_IN.md.
2. Install backend dependencies, apply the database migration, and deploy the backend.
3. Verify live Google login, account linking and existing password login on web and native devices.
4. Address the equivalent-login requirement for iOS before enabling Google there; Sign in with Apple is not part of this implementation.
5. Build and test new native releases, then submit them through the relevant stores.

No production database or store release was changed by this work.
