// server/services/inseeAuth.ts
type TokenJson = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

let cache: { token: string; expiresAt: number } | null = null;

function isJson(ct: string | null) {
  return !!ct && ct.toLowerCase().includes("application/json");
}

async function discoverTokenEndpoint(): Promise<string> {
  const discoveryUrl =
    "https://auth.insee.net/auth/realms/insee/.well-known/openid-configuration";

  const res = await fetch(discoveryUrl);
  const ct = res.headers.get("content-type");
  const raw = await res.text();

  if (!res.ok || !isJson(ct)) {
    throw new Error(
      `INSEE discovery failed: status=${res.status} content-type=${ct} body=${raw.slice(
        0,
        200
      )}`
    );
  }

  const json = JSON.parse(raw) as any;
  if (!json.token_endpoint) {
    throw new Error("INSEE discovery: token_endpoint introuvable");
  }

  return String(json.token_endpoint);
}

export async function getInseeAccessToken(): Promise<string> {
  const clientId = process.env.INSEE_CLIENT_ID;
  const clientSecret = process.env.INSEE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("INSEE_CLIENT_ID / INSEE_CLIENT_SECRET manquants.");
  }

  const now = Date.now();
  if (cache && cache.expiresAt > now + 10_000) return cache.token;

  const tokenEndpoint = await discoverTokenEndpoint();

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const ct = res.headers.get("content-type");
  const raw = await res.text();

  if (!res.ok || !isJson(ct)) {
    throw new Error(
      `INSEE token failed: status=${res.status} content-type=${ct} body=${raw.slice(
        0,
        200
      )}`
    );
  }

  const json = JSON.parse(raw) as TokenJson;
  if (!json.access_token) {
    throw new Error(
      `INSEE token: JSON sans access_token. body=${raw.slice(0, 200)}`
    );
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  cache = { token: json.access_token, expiresAt: now + expiresIn * 1000 };
  return json.access_token;
}
