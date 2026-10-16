# MathLift

Vite + React learning app for early math.

## Firestore rules

Deploy the rules in this repo (they must stay in sync with production):

```bash
firebase deploy --only firestore:rules
```

Requires the Firebase CLI, project `mathlift-63f6e` (see `.firebaserc`), and an account that can deploy to that project. The local `firestore.rules` file is what gets deployed.
