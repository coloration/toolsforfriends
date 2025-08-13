export default async function handler(req, res) {
  const { text } = req.query;

  if (!text) {
    res.status(400).json({ error: 'Missing text parameter' });
    return;
  }

  try {
    // 这里改成你实际调用的第三方 API
    // const result = await fetch('https://third-party-api.com', {...});

    // 示例：反转字符串
    const result = text.split('').reverse().join('');

    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
