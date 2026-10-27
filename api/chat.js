export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'केवल POST रिक्वेस्ट मान्य है' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vercel में GEMINI_API_KEY सेट नहीं है।' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'मैसेज या फोटो होना जरूरी है।' });
    }

    const parts = [];
    if (prompt) {
      parts.push({ text: prompt });
    }
    if (imageBase64 && mimeType) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageBase64
        }
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Gemini API एरर' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'कोई जवाब नहीं मिला।';
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'सर्वर में समस्या आई: ' + error.message });
  }
}
