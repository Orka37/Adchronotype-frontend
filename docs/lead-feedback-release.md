# Lead feedback changes — October 15, 2026

Implemented restored caregiver tile/streak/summary icons, consistent factor-impact colors, labeled BMI categories, separated profile actions, weekday and previous-week sleep history, and new 1–10 sleep ratings.

Existing 0–21 scores retain their original values and scale. Reports average each scale separately. Editing an original-scale entry requires choosing or confirming a new rating; the original database entry remains.

## Release order

1. Deploy backend changes from the Adchronotype backend repository, including migration `20261015_0013_sleep_quality_scale.py`; apply `alembic upgrade head` using the normal release workflow before serving the updated backend.
2. Deploy this frontend. It writes to `/sleep-logs/ratings` and requests history with `include_ratings=true`.
3. Rebuild mobile applications to include the frontend changes, then verify on physical Android and iOS devices.

Older clients retain the legacy endpoint and see legacy-scale history by default. Rollback must not remove scale metadata once new ratings exist; the migration refuses that downgrade.

## Verification

- TypeScript check passed.
- Expo web export passed.
- Three frontend regression tests passed.
- Eight backend API/migration tests passed: rating bounds, original score preservation, compatibility and account isolation.
- Local mobile-width before/after previews inspected with fictional data.

Production deployment, live database migration, and native-device testing have not been performed.
