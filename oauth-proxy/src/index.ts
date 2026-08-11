import { OAuthClient } from "./oauth";

interface Env {
  GITHUB_OAUTH_ID: string;
  GITHUB_OAUTH_SECRET: string;
  GITHUB_REPO_PRIVATE?: string;
}

function createOAuth(env: Env) {
  return new OAuthClient({
    id: env.GITHUB_OAUTH_ID,
    secret: env.GITHUB_OAUTH_SECRET,
    target: {
      tokenHost: "https://github.com",
      tokenPath: "/login/oauth/access_token",
      authorizePath: "/login/oauth/authorize",
    },
  });
}

function randomHex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

function callbackResponse(status: string, token: string) {
  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify({ token })}`);
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Авторизация Decap CMS</title></head><body><p>Авторизация...</p><script>
    const receiveMessage = () => {
      window.opener.postMessage(${message}, "*");
      window.removeEventListener("message", receiveMessage);
    };
    window.addEventListener("message", receiveMessage);
    window.opener.postMessage("authorizing:github", "*");
  </script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const redirectUri = `${url.origin}/callback?provider=github`;

    if (url.pathname === "/auth") {
      if (url.searchParams.get("provider") !== "github") return new Response("Invalid provider", { status: 400 });
      const privateRepo = env.GITHUB_REPO_PRIVATE && env.GITHUB_REPO_PRIVATE !== "0";
      const location = createOAuth(env).authorizeURL({
        redirect_uri: redirectUri,
        scope: privateRepo ? "repo,user" : "public_repo,user",
        state: randomHex(16),
      });
      return Response.redirect(location, 302);
    }

    if (url.pathname === "/callback") {
      if (url.searchParams.get("provider") !== "github") return new Response("Invalid provider", { status: 400 });
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      try {
        return callbackResponse("success", await createOAuth(env).getToken({ code, redirect_uri: redirectUri }));
      } catch (error) {
        return new Response(error instanceof Error ? error.message : "OAuth failed", { status: 502 });
      }
    }

    return new Response("Decap CMS OAuth proxy is running.");
  },
};
