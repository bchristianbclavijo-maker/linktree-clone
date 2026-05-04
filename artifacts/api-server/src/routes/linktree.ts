import { Router, type IRouter } from "express";
import { db, linktreeTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetLinktreeDataResponse,
  SaveLinktreeDataBody,
  SaveLinktreeDataResponse,
  TrackClickParams,
  TrackClickResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_DESIGN = {
  bgColor: "#0a0a0a",
  glowColor: "#cc0000",
  glowOpacity: 0.55,
  accentColor: "#cc0000",
  textColor: "#ffffff",
};

const DEFAULT_DATA = {
  profile: {
    photo: "https://i.pravatar.cc/150?img=47",
    name: "YOUR NAME",
    description: "Your tagline here",
  },
  links: [
    { id: "1", label: "My Product", url: "", emoji: "🛍️", order: 1 },
    { id: "2", label: "Quiz", url: "", emoji: "📝", order: 2 },
    { id: "3", label: "YouTube", url: "", emoji: "▶️", order: 3 },
    { id: "4", label: "Instagram", url: "", emoji: "📸", order: 4 },
    { id: "5", label: "WhatsApp", url: "", emoji: "💬", order: 5 },
  ],
  design: DEFAULT_DESIGN,
  clicks: {} as Record<string, number>,
};

async function getOrInit() {
  const rows = await db.select().from(linktreeTable).where(eq(linktreeTable.id, 1));
  if (rows.length > 0) {
    const row = rows[0];
    if (!row.design) {
      await db.update(linktreeTable).set({ design: DEFAULT_DESIGN }).where(eq(linktreeTable.id, 1));
      row.design = DEFAULT_DESIGN;
    }
    return row;
  }
  const inserted = await db
    .insert(linktreeTable)
    .values({ id: 1, ...DEFAULT_DATA })
    .returning();
  return inserted[0];
}

router.get("/linktree", async (req, res) => {
  try {
    const row = await getOrInit();
    const data = GetLinktreeDataResponse.parse({
      profile: row.profile,
      links: row.links,
      design: row.design,
      clicks: row.clicks,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to get linktree data");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/linktree", async (req, res) => {
  try {
    const body = SaveLinktreeDataBody.parse(req.body);
    await getOrInit();
    await db
      .update(linktreeTable)
      .set({ profile: body.profile, links: body.links, design: body.design })
      .where(eq(linktreeTable.id, 1));
    const result = SaveLinktreeDataResponse.parse({ success: true });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to save linktree data");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/linktree/track/:id", async (req, res) => {
  try {
    const { id } = TrackClickParams.parse({ id: req.params.id });
    const row = await getOrInit();
    const clicks = { ...(row.clicks as Record<string, number>) };
    clicks[id] = (clicks[id] ?? 0) + 1;
    await db.update(linktreeTable).set({ clicks }).where(eq(linktreeTable.id, 1));
    const result = TrackClickResponse.parse({ clicks: clicks[id] });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to track click");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
