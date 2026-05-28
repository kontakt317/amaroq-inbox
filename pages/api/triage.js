import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Du er en email-assistent for Amaroq Glamping (amaroq-glamping.dk / .de), et dansk glamping-udstyrsfirma.

Du modtager en liste af emails. Returner KUN et JSON-array uden markdown eller forklaring:

[{
  "id": "...",
  "acct": "dk eller de",
  "sender": "Afsendernavn maks 30 tegn",
  "initials": "2 bogstaver",
  "subject": "Kort emne maks 55 tegn",
  "date": "som modtaget",
  "category": "urgent | followup | info | spam",
  "badgeLabel": "maks 15 tegn",
  "badgeClass": "bd-r | bd-a | bd-g | bd-b | bd-x",
  "avatarClass": "av-r | av-a | av-g | av-b | av-x",
  "tags": ["tag1"],
  "summary": "2-3 sætninger på dansk om hvad der skal gøres"
}]

Kategorier: urgent=handling inden 24t, followup=kræver svar, info=automatisk notifikation, spam=reklame.
bd-r/av-r=rød(urgent), bd-a/av-a=gul(followup), bd-g/av-g=grøn(klar), bd-b/av-b=blå(info), bd-x/av-x=grå(spam).`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { threads } = req.body;
  if (!threads?.length) return res.status(400).json({ error: "No threads" });

  try {
    const input = threads.map((t) => ({
      id: t.id,
      acct: t.acct,
      sender: t.sender,
      subject: t.subject,
      date: t.date,
      snippet: t.snippet?.slice(0, 200),
    }));

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: "Analyser disse emails:\n" + JSON.stringify(input) }],
    });

    const text = msg.content.find((b) => b.type === "text")?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const emails = JSON.parse(clean);

    res.status(200).json({ emails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
