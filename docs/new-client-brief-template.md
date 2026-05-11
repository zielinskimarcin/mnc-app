# New Client Brief Template

Use this brief when asking Codex to create a new restaurant/cafe app.

```txt
Client name:
Slug:
City:
Owner/admin email:

Bundle id:
App scheme:
Dashboard subdomain:

Design direction:
Colors:
Typography feel:
Radius/shape feel:
Logo/assets available:

Menu categories:
1.
2.
3.

Reward rule:
Reward copy PL:
Reward copy EN:

Languages:
Google login:
Apple login:
Push notifications:

Initial menu:
Category / section / title / description / price

Notes:
```

After filling this out, run:

```bash
npm run client:launch-check -- <slug> --full
```

The launch checker should become the main handoff between the owner, Codex, and the manual platform setup steps.
