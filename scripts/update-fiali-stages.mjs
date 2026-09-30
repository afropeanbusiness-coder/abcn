import { Client } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Please provide DATABASE_URL in your environment or .env.local");
  process.exit(1);
}

async function run() {
  console.log("Connecting to Neon database...");
  const client = new Client({ connectionString });
  await client.connect();

  const res = await client.query("SELECT id, slug, stages FROM events WHERE slug = 'fiali-frankfurt-2026'");
  if (res.rows.length === 0) {
    console.log("No event found for slug 'fiali-frankfurt-2026'");
    await client.end();
    return;
  }

  const event = res.rows[0];
  console.log("Current stages in DB:", JSON.stringify(event.stages, null, 2));

  let stages = event.stages;
  if (typeof stages === "string") {
    stages = JSON.parse(stages);
  }

  // Update stages with explicit real images and overlays
  const updatedStages = stages.map((stage) => {
    const isStage1 = /1|lab|workshop|strategy/i.test(stage.stage) || /workshop|lab|strategy|phase 1/i.test(stage.title);
    return {
      ...stage,
      image: isStage1
        ? "/assets/abcn/events/sales-lab-workshop-room.jpg"
        : "/assets/abcn/events/business-development-talk.jpg",
      image_overlay: isStage1
        ? "Interactive Workshop & Strategy Lab"
        : "Pitch Showcase & Ecosystem Matchmaking"
    };
  });

  console.log("Updated stages to save:", JSON.stringify(updatedStages, null, 2));

  await client.query(
    "UPDATE events SET stages = $1::jsonb WHERE slug = 'fiali-frankfurt-2026'",
    [JSON.stringify(updatedStages)]
  );

  console.log("Successfully updated stages in DB for fiali-frankfurt-2026!");

  await client.end();
}

run().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
