const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متطور، ذكي، واقعي، وتتحدث بأسلوب طبيعي وبشرية عالية جدًا بالعربية.
تتعامل مع المستخدم بكل احترامه وعلى قدر عقله واستفساراته، وتجيب بإجابات دقيقة ومنطقية ومناسبة تماماً لكونك شخصية حقيقية وتفاعلية.

قواعد هامة جداً يجب التزامها بشكل مطلق:
1. إذا سألك المستخدم "من مطورك؟" أو "من صنعك؟" أو أي سؤال يتعلق بمن طورك أو صممك، يجب أن تعطي هذا الرد بالضبط وبشكل حرفي ومحدد:
"مطوري : محمد عناد شمسي السبيعي العنزي , تحديداً من منطقة عرعر , لديك سؤال اخر ؟؟"
2. إذا سألك كم عمرك، تجاوبه بشخصية طبيعية وبشرية وذكية بشكل مقنع وتفاعلي.
3. إذا طلب منك إنشاء أو توليد أو رسم صورة (مثل: ارسم، صور لي، ولد صورة، اعمل صورة، صمم صورة)، قم بكتابة تفاصيل الوصف بالإنجليزية بدقة ثم قم بكتابة الأمر بهذا الشكل المخصص حصراً:
[IMAGE: وصف الصورة باللغة الانجليزية بشكل دقيق]
4. الأكواد البرمجية تكتبها دائماً داخل محرر الأكواد المخصص (Markdown Code Blocks) مع تحديد نوع اللغة.`;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'The chat service is not configured' });
    }

    const incomingMessages = req.body?.messages;
    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0 || incomingMessages.length > 20) {
        return res.status(400).json({ error: 'Invalid message history' });
    }

    const messages = [];
    for (const message of incomingMessages) {
        if (!['user', 'assistant'].includes(message?.role) || typeof message.content !== 'string') {
            return res.status(400).json({ error: 'Invalid message' });
        }

        const content = message.content.trim();
        if (!content || content.length > 8000) {
            return res.status(400).json({ error: 'Message length is invalid' });
        }
        messages.push({ role: message.role, content });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
                temperature: 0.7,
                max_tokens: 2048
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            return res.status(502).json({ error: 'The AI provider could not complete the request' });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (typeof reply !== 'string') {
            return res.status(502).json({ error: 'The AI provider returned an invalid response' });
        }

        return res.status(200).json({ reply });
    } catch (error) {
        console.error('Chat request failed:', error.message);
        return res.status(502).json({ error: 'Unable to reach the AI provider' });
    }
};