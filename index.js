import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    let m3u8Url = null;

    // Interceptar todas las peticiones y mostrar en consola
    page.on("request", (request) => {
      const url = request.url();
      console.log("➡️ Petición:", url);
      if (url.includes("index.m3u8?")) {
        console.log("🎯 M3U8 válido detectado:", url);
        m3u8Url = url;
      }
    });

    await page.goto("https://librefutboltv.su/tyc-sports/", {
      waitUntil: "networkidle"
    });

    // Esperar a que aparezca el player (máx 60s)
    await page.waitForSelector("video, iframe, #player", { timeout: 60000 }).catch(() => {
      console.warn("⏱️ Timeout: no se detectó el player en 60s");
    });

    await browser.close();

    if (m3u8Url) {
      res.json({ m3u8: m3u8Url });
    } else {
      res.status(404).json({ error: "No se detectó ningún index.m3u8" });
    }
  } catch (err) {
    console.error("❌ Error en scraper:", err);
    if (browser) await browser.close();
    res.status(500).json({ error: "Scraper falló" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
