type OAuthConfig = {
  id: string;
  secret: string;
  target: {
    tokenHost: string;
    tokenPath: string;
    authorizePath: string;
  };
};

export class OAuthClient {
  private clientConfig: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.clientConfig = config;
  }

  authorizeURL(options: { redirect_uri: string; scope: string; state: string }) {
    const { tokenHost, authorizePath } = this.clientConfig.target;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientConfig.id,
      redirect_uri: options.redirect_uri,
      scope: options.scope,
      state: options.state,
    });
    return `${tokenHost}${authorizePath}?${params}`;
  }

  async getToken(options: { code: string; redirect_uri: string }) {
    const { tokenHost, tokenPath } = this.clientConfig.target;
    const response = await fetch(`${tokenHost}${tokenPath}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientConfig.id,
        client_secret: this.clientConfig.secret,
        code: options.code,
        redirect_uri: options.redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const result = await response.json<{ access_token?: string; error_description?: string }>();
    if (!response.ok || !result.access_token) {
      throw new Error(result.error_description || "GitHub OAuth token request failed");
    }
    return result.access_token;
  }
}
