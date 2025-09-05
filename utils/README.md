# Backend Utilities

## Setup Default Commission

To set up the default app commission in the database, run:

```bash
cd backend/utils
node setupDefaultCommission.js
```

This will create a default AppCommission record with:
- Type: percentage
- Value: 15%

This ensures that the financial breakdown calculations work correctly in the app.

## Database Seeding

To seed the database with initial data, run:

```bash
cd backend/utils
node seeder.js
```

This will create:
- Default cities (Colombo, Kandy, Galle)
- Default sub-areas
- Default vehicle categories
- Default terms and conditions
