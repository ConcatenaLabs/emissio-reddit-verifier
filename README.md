# Emissio Reddit verifier

A Reddit app that proves a Reddit account to [Sequentia Emissio](https://github.com/ConcatenaLabs/emissio), the community rewards site for the Sequentia network. Emissio pays a small reward for linking an aged social account and requires at least one linked account before the launch payout, as a sybil deterrent without identity documents.

Reddit no longer serves profile data to unauthenticated requests, and an app on Reddit's developer platform may not call an outside server. So the proof travels with the user: this app, installed on r/sequentia, signs a short statement about the logged-in user, and the user pastes it into Emissio.

## How it works

1. On r/sequentia, the user opens the subreddit menu and chooses **Verify for Emissio**.
2. A form asks for their Emissio account code, the ten-character code shown on their Emissio account page.
3. The app reads the logged-in user's name and account creation date from Reddit, signs them together with the code, and shows the token.
4. The user pastes the token into the Reddit row of their Emissio account page. Emissio checks the signature, the expiry, that the code is the user's own, and that the account is at least two years old, then records the verification for a reviewer to approve.

Reddit authenticates the user for the app, so the signature is the ownership proof. Nothing is posted, no bio is edited, and the token is valid for 24 hours and for one account code only.

### Token format

```
ERV1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "ERV1." + base64url(payload)))>
```

The payload is JSON with `u` (username), `c` (account created, Unix seconds), `e` (Emissio account code), `i` (issued) and `x` (expires). `src/token.ts` is the reference; Emissio's `verifications.go` verifies it with the same secret.

## Layout

| Path | Purpose |
|---|---|
| `devvit.json` | App configuration: the menu item, the two forms, the `tokenSecret` setting |
| `src/server/index.ts` | The three endpoints: menu action, code form, token form |
| `src/token.ts` | Signing and verification of tokens |
| `test/` | Token round trip, tampering, expiry and code format |

## Developing

Node 22 and npm.

```
npm install
npm test          # token tests
npm run typecheck
npm run build     # bundles src/server into dist/server/index.cjs
```

`npm run dev` starts a playtest on r/sequentia, which installs the app there and reinstalls on every save; it needs a logged-in Reddit account that moderates the subreddit.

## Deploying

```
npx devvit login                      # once, with an account that moderates r/sequentia
npm run upload                        # build and upload a private version
npx devvit install r/sequentia        # install or update it there
npx devvit settings set tokenSecret   # paste the secret the Emissio server uses
```

The secret must equal `EMISSIO_REDDIT_TOKEN_SECRET` on the Emissio server. It is never committed to either repository.

Subreddits under 200 members can install an uploaded app without Reddit's review. For larger subreddits or a directory listing, `npx devvit publish` submits the app for review.

## Licence

MIT.
