
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "केवल POST अनुरोध स्वीकार है।"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY Vercel में सेट नहीं है।"
    });
  }

  try {
    const body = req.body || {};
    const message = String(body.message || body.prompt || "").trim();
    const imageBase64 = body.imageBase64 || "";

    if (!message && !imageBase64) {
      return res.status(400).json({
        error: "कृपया अपना सवाल लिखें या फोटो चुनें।"
      });
    }

    const parts = [];

    if (message) {
      parts.push({ text: message });
    }

    if (imageBase64) {
      const match = imageBase64.match(
        /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/
      );

      if (!match) {
        return res.status(400).json({
          error: "फोटो का फॉर्मेट सही नहीं है। JPG, PNG या WebP फोटो चुनें।"
        });
      }

      parts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2].replace(/\s/g, "")
        }
      });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You are Vishal Tech Mitra, a helpful AI assistant. Reply clearly in the same language as the user. Explain things simply and accurately."
            }]
          },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      return res.status(502).json({
        error: data?.error?.message || "Gemini API से जवाब नहीं मिला।"
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "AI से खाली जवाब मिला। कृपया दोबारा कोशिश करें।"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      error: "सर्वर में समस्या हुई। कृपया दोबारा कोशिश करें।"
    });
  }
}
  
