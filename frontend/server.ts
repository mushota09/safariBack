import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- MOCK DATA ---
  const ports = [
    { id: "kalemie", name: "Kalemie", ville: "Kalemie", lat: -5.9231, lng: 29.1864 },
    { id: "moba", name: "Moba", ville: "Moba", lat: -7.0620, lng: 29.7424 },
    { id: "uvira", name: "Uvira", ville: "Uvira", lat: -3.3768, lng: 29.1417 },
  ];

  const voyages = [
    {
      id: "v1",
      bateau: "MV Safari I",
      depart: "Kalemie",
      arrivee: "Uvira",
      date: "2026-05-15T08:00:00Z",
      prix_base: 45,
      places_totales: 200,
      places_vendues: 145,
      statut: "programme",
      photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "v2",
      bateau: "Le Tanganyika Express",
      depart: "Uvira",
      arrivee: "Moba",
      date: "2026-05-16T10:00:00Z",
      prix_base: 30,
      places_totales: 120,
      places_vendues: 40,
      statut: "confirme",
      photo: "https://images.unsplash.com/photo-1516246843873-9d12356b6fab?q=80&w=2072&auto=format&fit=crop",
    },
    {
        id: "v3",
        bateau: "Lukuga Star",
        depart: "Moba",
        arrivee: "Kalemie",
        date: "2026-05-17T09:00:00Z",
        prix_base: 35,
        places_totales: 150,
        places_vendues: 150,
        statut: "complet",
        photo: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop",
      },
  ];

  // API routes
  app.get("/api/ports", (req, res) => {
    res.json(ports);
  });

  app.get("/api/voyages", (req, res) => {
    const { depart, arrivee, date } = req.query;
    let filtered = voyages;
    if (depart) filtered = filtered.filter(v => v.depart === depart);
    if (arrivee) filtered = filtered.filter(v => v.arrivee === arrivee);
    // Simple date filter (ignoring time)
    if (date) {
        const d = (date as string).split('T')[0];
        filtered = filtered.filter(v => v.date.startsWith(d));
    }
    res.json(filtered);
  });

  app.get("/api/voyages/:id", (req, res) => {
    const voyage = voyages.find(v => v.id === req.params.id);
    if (!voyage) return res.status(404).json({ error: "Voyage non trouvé" });
    res.json(voyage);
  });

  // Mock reservation logic
  app.post("/api/reservations", (req, res) => {
    const { voyageId, passagers } = req.body;
    // In a real app, we would decrement available places and save to DB
    res.json({ 
        success: true, 
        reservationId: "RES-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        total: 45 * (passagers?.length || 1)
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
