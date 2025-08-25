import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  let browser;
  let retries = 2; // Cantidad de intentos
  let m3u8Url = null;

  try {
    while (retries > 0 && !m3u8Url) {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();

      // User-Agent real
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
      );

      // Interceptar peticiones
      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("index.m3u8?")) {
          console.log("🎯 M3U8 válido detectado:", url);
          m3u8Url = url;
        }
      });

      try {
        await page.goto("https://librefutboltv.su/tyc-sports/", {
          waitUntil: "networkidle"
        });

        await page.waitForSelector("video, iframe, #player", { timeout: 20000 }).catch(() => {
          console.warn("⏱️ Timeout: no se detectó el player en 20s");
        });
      } catch (err) {
        console.warn("⚠️ Error cargando la página:", err.message);
      }

      await browser.close();
      retries--;

      if (!m3u8Url && retries > 0) {
        console.log("🔄 Reintentando para capturar el m3u8...");
      }
    }

    if (m3u8Url) {
      res.json({ m3u8: m3u8Url });
    } else {
      res.status(404).json({
        error: "No se detectó ningún index.m3u8 después de varios intentos",
        note: "Verifica que la página cargue correctamente y que no bloquee headless"
      });
    }
  } catch (err) {
    console.error("❌ Error en scraper:", err);
    if (browser) await browser.close();
    res.status(500).json({
      error: "Scraper falló",
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
