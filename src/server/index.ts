import express from "express";
import { createServer, context, getServerPort, reddit, settings } from "@devvit/web/server";
import type { Form, UiResponse } from "@devvit/web/shared";
import { CODE_RE, issue } from "../token.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

const ui = (res: express.Response, body: UiResponse): void => {
  res.json(body);
};

const codeForm: Form = {
  title: "Verify for Emissio",
  description:
    "Enter the account code shown on your Emissio account page. You get a signed token to paste back into Emissio; it proves you own this Reddit account and when it was created.",
  fields: [
    {
      type: "string",
      name: "code",
      label: "Emissio account code",
      helpText: "10 characters, from sequentiatestnet.com/emissio/account",
    },
  ],
  acceptLabel: "Get my token",
};

router.post("/internal/menu/verify", async (_req, res): Promise<void> => {
  if (!context.userId) {
    ui(res, { showToast: "Log in to Reddit first." });
    return;
  }
  ui(res, { showForm: { name: "codeForm", form: codeForm } });
});

router.post("/internal/form/code", async (req, res): Promise<void> => {
  const code = String(req.body?.code ?? "").trim().toLowerCase();
  if (!CODE_RE.test(code)) {
    ui(res, { showToast: { text: "That is not an Emissio account code. Copy it from your account page.", appearance: "neutral" } });
    return;
  }
  const secret = await settings.get<string>("tokenSecret");
  if (!secret) {
    ui(res, { showToast: "The app is not configured yet. Tell the Sequentia team." });
    return;
  }
  const user = await reddit.getCurrentUser();
  if (!user) {
    ui(res, { showToast: "Log in to Reddit first." });
    return;
  }
  const token = issue(secret, user.username, user.createdAt, code);
  console.log(`issued token for u/${user.username} (created ${user.createdAt.toISOString()}) to code ${code}`);
  ui(res, {
    showForm: {
      name: "tokenForm",
      form: {
        title: "Your Emissio token",
        description:
          "Copy all of it and paste it into the Reddit row on your Emissio account page. It is valid for 24 hours and only for the account code you entered.",
        fields: [{ type: "paragraph" as const, name: "token", label: "Token", lineHeight: 6 }],
        acceptLabel: "Done",
      },
      data: { token },
    },
  });
});

router.post("/internal/form/token", async (_req, res): Promise<void> => {
  ui(res, { showToast: { text: "Paste the token into Emissio to finish.", appearance: "success" } });
});

app.use(router);
const server = createServer(app);
server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());
