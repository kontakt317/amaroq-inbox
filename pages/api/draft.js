import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { threadId, sender, subject, summary, acct } = req.body;

  try {
    // Generate reply with Claude
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `Du skriver emails på vegne af Amaroq Glamping. Tonen er venlig, professionel og direkte. 
Skriv på det sprog afsenderen brugte (dansk, tysk, engelsk, fransk etc.).
Returner KUN emailteksten — ingen emne, ingen forklaring, ingen "Her er et udkast"-indledning.
Slut altid med: "Med venlig hilsen\nAmaroq Glamping"`,
      messages: [{
        role: "user",
        content: `Skriv et svar til denne email:\nAfsender: ${sender}\nEmne: ${subject}\nKontekst: ${summary}`
      }],
    });

    const draftBody = msg.content.find((b) => b.type === "text")?.text || "";

    // Save as Gmail draft
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    const fromAddr = acct === "de"
      ? "kontakt@amaroq-glamping.de"
      : "kontakt@amaroq-glamping.dk";

    const rawEmail = [
      `From: Amaroq Glamping <${fromAddr}>`,
      `Subject: Re: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      draftBody,
    ].join("\n");

    const encoded = Buffer.from(rawEmail).toString("base64url");

    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encoded,
          threadId,
        },
      },
    });

    res.status(200).json({ draftId: draft.data.id, body: draftBody });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
