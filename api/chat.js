
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
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "कृपया अपना सवाल लिखें।"
      });
    }

    const contents = [];

    for (const message of messages.slice(-12)) {
      const role =
        message.role === "model" ? "model" : "user";

      const parts = [];

      if (
        typeof message.text === "string" &&
        message.text.trim()
      ) {
        parts.push({
          text: message.text.slice(0, 10000)
        });
      }

      if (
        role === "user" &&
        typeof message.image === "string"
      ) {
        const match = message.image.match(
          /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/
        );

        if (match) {
          if (match[2].length > 6000000) {
            return res.status(413).json({
              error: "फोटो छोटी करके दोबारा अपलोड करें।"
            });
          }

          parts.push({
            inline_data: {
              mime_type: match[1],
              data: match[2]
            }
          });
        }
      }

      if (parts.length) {
        contents.push({ role, parts });
      }
    }

    if (!contents.length) {
      return res.status(400).json({
        error: "सवाल या फोटो नहीं मिली।"
      });
    }

    const model =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
              text:
                "You are Vishal Tech Mitra, a helpful AI assistant. Reply in simple Hindi when the user writes Hindi, and in English when they write English. Explain clearly and honestly."
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1800
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini error:",
        response.status,
        data?.error?.message
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          "Gemini API में समस्या है। API key, model और quota जाँचें।"
      });
    }

    const reply = (data.candidates || [])
      .flatMap(item => item.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "AI से जवाब नहीं मिला।"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error:
        "सर्वर में समस्या है। इंटरनेट और API सेटिंग जाँचें।"
    });
  }
}
