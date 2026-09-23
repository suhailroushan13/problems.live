import "server-only";
import { env } from "@/lib/env";

/**
 * Fire-and-forget ping to the IndexNow API (Bing, Yandex, Seznam, Naver) so
 * new or changed pages get crawled without waiting for a scheduled recrawl.
 * A failed or missing key must never break the caller's action.
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const key = env.indexNowKey;
  if (!key || urls.length === 0) return;

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(env.appUrl).hostname,
        key,
        keyLocation: `${env.appUrl}/${key}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    // Best-effort — indexing is not on the critical path of the user's action.
  }
}
