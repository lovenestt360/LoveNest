// Helpers FCM HTTP v1 partilhados entre send-push e generate-love-wrapped.
// Extraído de send-push/index.ts para que os dois caminhos de notificação
// usem exatamente a mesma implementação testada, em vez de manter duas
// integrações de push em paralelo (a antiga usava web-push/VAPID, que já
// não corresponde às subscrições atuais, só com fcm_token).

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function getFcmAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    )
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, sigInput);
  const jwt = `${header}.${payload}.${toBase64Url(sig)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token as string;
}

export async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  url: string
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data: {
            url: url || "/chat",
          },
          webpush: {
            notification: {
              icon: "https://lovenestt.com/icon-192.png",
              badge: "https://lovenestt.com/icon-192.png",
              tag: "lovenest-notif",
            },
            fcm_options: { link: `https://lovenestt.com${url || "/"}` },
            headers: { TTL: "86400" },
          },
        },
      }),
    }
  );

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    const code = errBody?.error?.details?.[0]?.errorCode ?? errBody?.error?.status ?? resp.status;
    return { ok: false, error: String(code) };
  }

  return { ok: true };
}

export const FCM_PROJECT_ID = "lovenest-d7f81";
