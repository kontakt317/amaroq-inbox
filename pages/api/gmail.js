import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: "v1", auth });

    // Fetch unread threads from inbox
    const listRes = await gmail.users.threads.list({
      userId: "me",
      q: "is:unread in:inbox",
      maxResults: 20,
    });

    const threads = listRes.data.threads || [];

    // Fetch details for each thread
    const detailed = await Promise.all(
      threads.map(async (t) => {
        const detail = await gmail.users.threads.get({
          userId: "me",
          id: t.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "To", "Date"],
        });

        const firstMsg = detail.data.messages?.[0];
        const headers = firstMsg?.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name === name)?.value || "";

        const from = get("From");
        const senderName = from.includes("<")
          ? from.split("<")[0].trim().replace(/"/g, "")
          : from.split("@")[0];

        const toAddr = get("To");
        const acct = toAddr.includes("amaroq-glamping.de") ? "de" : "dk";

        const dateStr = get("Date");
        const date = dateStr ? new Date(dateStr) : new Date();
        const now = new Date();
        const diffDays = Math.floor((now - date) / 86400000);
        const dateLabel =
          diffDays === 0 ? "I dag" :
          diffDays === 1 ? "I går" :
          date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });

        return {
          id: t.id,
          acct,
          sender: senderName.slice(0, 35),
          initials: senderName.slice(0, 2).toUpperCase(),
          subject: get("Subject").slice(0, 60) || "(ingen emne)",
          date: dateLabel,
          snippet: firstMsg?.snippet || "",
          to: toAddr,
        };
      })
    );

    res.status(200).json({ threads: detailed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
