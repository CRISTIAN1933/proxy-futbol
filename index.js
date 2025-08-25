import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = 3000;

app.get("/scrape", async (req, res) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let m3u8Url = null;

  // Interceptar peticiones
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes(".m3u8")) {
      console.log("🎯 M3U8 detectado:", url);
      m3u8Url = url;
    }
  });

  try {
    await page.goto("https://librefutboltv.su/tyc-sports/", {
      waitUntil: "networkidle",
    });

    // Esperar unos segundos a que cargue el player
    await page.waitForTimeout(8000);

    await browser.close();

    if (m3u8Url) {
      res.json({ m3u8: m3u8Url });
    } else {
      res.json({ error: "No se detectó ningún m3u8" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraper falló" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
