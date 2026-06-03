const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client (will gracefully handle missing API key)
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (err) {
  console.warn('Gemini initialization failed. AI endpoints will use mock responses.');
}

/**
 * Check if Gemini is available
 */
const isAIAvailable = () => !!genAI;

/**
 * Sleep helper for retry backoff
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine whether an error is a transient/retryable Gemini error
 * (503 Service Unavailable, 429 Too Many Requests, etc.)
 */
function isRetryableError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('high demand')
  );
}

/**
 * Call Gemini chat completion with retry logic and graceful error handling.
 * Retries up to MAX_RETRIES times on transient errors before falling back to mock.
 */
async function callAI(systemPrompt, userPrompt, jsonMode = true) {
  if (!genAI) {
    return null; // Will trigger fallback mock response
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000; // 2 s initial delay, doubles each retry

  // Using gemini-2.5-flash which is the correct model name for modern Google AI Studio keys
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  if (jsonMode) {
    fullPrompt += '\n\nIMPORTANT: Return ONLY a valid JSON object. Do not include markdown formatting or backticks around the JSON.';
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      let text = response.text();

      if (jsonMode) {
        // Clean up potential markdown formatting that the model might add
        text = text.replace(/^```json/mi, '').replace(/^```/mi, '').trim();
        return JSON.parse(text);
      }
      return text;
    } catch (err) {
      const retryable = isRetryableError(err);
      console.error(
        `Gemini API error (attempt ${attempt}/${MAX_RETRIES}):`,
        err.message
      );

      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`Retryable error detected. Retrying in ${delay}ms…`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or exhausted retries — fall back to mock
      console.warn('Falling back to mock AI response.');
      return null;
    }
  }

  return null; // Fallback if loop exits without returning
}

/**
 * Analyze uploaded material
 * Returns: relevance score, difficulty level, suggested tests, suggested assignments
 */
async function analyzeMaterial(material) {
  const systemPrompt = `You are an educational content analyst. Analyze the given learning material and provide a structured evaluation. 
  Return JSON with: relevanceScore (1-10), difficultyLevel (beginner/intermediate/advanced), 
  topicAccuracy (1-10), contentQuality (1-10), suggestedQuestions (array of 3-5 questions), 
  suggestedAssignments (array of 2-3 assignments), summary (brief analysis), 
  bloomLevels (which Bloom taxonomy levels this material covers: remember, understand, apply, analyze).
  Respond in Uzbek language. Barcha matnlar O'zbek tilida bo'lishi shart.`;

  const userPrompt = `Analyze this educational material:
  Title: ${material.title}
  Topic: ${material.topic}
  Type: ${material.type}
  Description: ${material.description || 'N/A'}
  Content: ${material.textContent || 'File-based material (no text content available)'}`;

  const result = await callAI(systemPrompt, userPrompt);

  if (result) return result;

  // Mock response for demo when AI is unavailable
  return {
    relevanceScore: 8,
    difficultyLevel: 'intermediate',
    topicAccuracy: 7,
    contentQuality: 8,
    suggestedQuestions: [
      `"${material.title}" da muhokama qilingan asosiy tushuncha nima?`,
      `Ushbu mavzu amaliyotga qanday bog'lanadi?`,
      `Taqdim etilgan asosiy g'oyalarni taqqoslang va tahlil qiling.`,
      `Asosiy dalilni qanday faktlar qo'llab-quvvatlaydi?`,
    ],
    suggestedAssignments: [
      `"${material.title}" dan olingan asosiy fikrlarning qisqacha mazmunini yozing`,
      `Ushbu darsdagi tushunchalarni qo'llagan holda amaliy misol yarating`,
      `Ushbu material asosida dars rejasini ishlab chiqing`,
    ],
    summary: `"${material.title}" materiali ${material.topic} mavzusini o'rta darajada yoritadi. U bakalavriat talabalari uchun mos bo'lgan fundamental bilimlarni taqdim etadi.`,
    bloomLevels: ['remember', 'understand', 'apply'],
    _isMock: !isAIAvailable(),
  };
}

/**
 * Generate test questions from material
 */
async function generateTest(material, questionCount = 5) {
  const systemPrompt = `You are an educational test generator. Create a well-balanced test based on the given material.
  Return JSON with: title (string), timer (number in minutes), 
  questions (array of objects with: type (single/multiple/matching/open), question (string), 
  options (array of strings, empty for open), correctAnswer (string for single, array for multiple, null for open), 
  matchPairs (array of {left, right} for matching type, empty otherwise), points (number 1-3)).
  Include a mix of question types covering different Bloom taxonomy levels.
  Respond in Uzbek language. Barcha savollar va variantlar O'zbek tilida bo'lishi shart.`;

  const userPrompt = `Generate ${questionCount} test questions for this material:
  Title: ${material.title}
  Topic: ${material.topic}
  Description: ${material.description || 'N/A'}
  Content: ${material.textContent || 'File-based material'}`;

  const result = await callAI(systemPrompt, userPrompt);

  if (result) return result;

  // Mock response
  return {
    title: `Test: ${material.title}`,
    timer: 15,
    questions: [
      {
        type: 'single',
        question: `"${material.title}" asosan nimaga qaratilgan?`,
        options: ['A varianti', 'B varianti', 'C varianti', 'D varianti'],
        correctAnswer: 'A varianti',
        matchPairs: [],
        points: 1,
      },
      {
        type: 'multiple',
        question: `Ushbu materialda quyidagilardan qaysi biri yoritilgan? (Barcha to'g'ri javoblarni tanlang)`,
        options: ['1-tushuncha', '2-tushuncha', '3-tushuncha', '4-tushuncha'],
        correctAnswer: ['1-tushuncha', '2-tushuncha'],
        matchPairs: [],
        points: 2,
      },
      {
        type: 'open',
        question: `"${material.title}" da keltirilgan asosiy tushunchalarni tushuntiring va ularning ${material.topic} ga qanday aloqasi borligini bayon qiling.`,
        options: [],
        correctAnswer: null,
        matchPairs: [],
        points: 3,
      },
    ],
    _isMock: !isAIAvailable(),
  };
}

/**
 * Evaluate student answer using Bloom's taxonomy
 */
async function evaluateAnswer(question, studentAnswer, context = '') {
  const systemPrompt = `You are an educational assessment expert specializing in Bloom's Taxonomy evaluation.
  Evaluate the student's answer and provide cognitive level analysis.
  Return JSON with: correctness (0-100), feedback (string with specific, constructive feedback),
  bloomAnalysis: { remember (0-10), understand (0-10), apply (0-10), analyze (0-10) },
  strengths (array of strings), improvements (array of strings),
  cognitiveLevel (the dominant Bloom level: remember/understand/apply/analyze).
  Focus on cognitive thinking quality, not just grammar.
  Respond in Uzbek language. Barcha mulohazalar, kuchli tomonlar va tavsiyalar O'zbek tilida bo'lishi shart.`;

  const userPrompt = `Question: ${question}
  Student's Answer: ${studentAnswer}
  ${context ? `Context/Material: ${context}` : ''}
  
  Evaluate the cognitive quality of this answer using Bloom's Taxonomy.`;

  const result = await callAI(systemPrompt, userPrompt);

  if (result) return result;

  // Mock response
  return {
    correctness: 65,
    feedback: 'Javob asosiy tushunchalarni namoyish etadi, ammo chuqur tahlil yetishmaydi. Fikringizni mustahkamlash uchun aniq dalillar keltirish va taqqoslashlarni ko\'rib chiqing.',
    bloomAnalysis: {
      remember: 7,
      understand: 6,
      apply: 5,
      analyze: 4,
    },
    strengths: ['Tushunchalarni yodga olishni ko\'rsatadi', 'Savol mavzusini yoritgan'],
    improvements: ['Aniq misollar qo\'shing', 'Dalillarga asoslangan fikr yuriting', 'Tegishli tushunchalar bilan taqqoslang'],
    cognitiveLevel: 'understand',
    _isMock: !isAIAvailable(),
  };
}

/**
 * Generate personalized recommendations for a student
 */
async function generateRecommendations(studentData) {
  const systemPrompt = `You are an educational advisor AI. Based on the student's performance data,
  generate personalized learning recommendations.
  Return JSON with: recommendations (array of objects with: topic (string), message (string), 
  priority (low/medium/high), type (review/practice/advance/remedial)),
  overallAssessment (string), suggestedFocus (string).
  Respond in Uzbek language. Barcha matnlar O'zbek tilida bo'lishi shart.`;

  const userPrompt = `Student Performance Data:
  Total Score: ${studentData.totalScore || 0}%
  Tests Completed: ${studentData.testsCompleted || 0}
  Weak Topics: ${(studentData.weakTopics || []).join(', ') || 'None identified'}
  Strong Topics: ${(studentData.strongTopics || []).join(', ') || 'None identified'}
  Cognitive Growth: ${JSON.stringify(studentData.cognitiveGrowth || [])}
  
  Generate personalized learning recommendations.`;

  const result = await callAI(systemPrompt, userPrompt);

  if (result) return result;

  // Mock response
  return {
    recommendations: [
      {
        topic: studentData.weakTopics?.[0] || 'Umumiy takrorlash',
        message: 'Asosiy tushunchalarni takrorlang va qo\'shimcha mashqlar bajaring.',
        priority: 'high',
        type: 'remedial',
      },
      {
        topic: studentData.strongTopics?.[0] || 'Ilg\'or mavzular',
        message: 'Siz ushbu yo\'nalishda kuchli tushunchaga egasiz. Murakkab amaliy mashqlarni sinab ko\'ring.',
        priority: 'low',
        type: 'advance',
      },
      {
        topic: 'Tanqidiy fikrlash',
        message: 'Tahlil qilish ko\'nikmalarini rivojlantirishga e\'tibor qarating. Turli nuqtai nazarlarni taqqoslash va baholashni mashq qiling.',
        priority: 'medium',
        type: 'practice',
      },
    ],
    overallAssessment: `Talaba jami ${studentData.testsCompleted || 0} ta testni o'rtacha ${studentData.totalScore || 0}% natija bilan yakunlagan. Zaif tomonlarni kuchaytirish va kuchli tomonlarni yanada rivojlantirishga e'tibor qarating.`,
    suggestedFocus: 'Tahlil va qo\'llash ko\'nikmalarini rivojlantirish',
    _isMock: !isAIAvailable(),
  };
}

/**
 * Evaluate student-created lesson plan
 */
async function evaluateLessonPlan(lessonPlan, materialContext = '') {
  const systemPrompt = `You are an expert pedagogy evaluator. Evaluate the student-created lesson plan/project.
  Return JSON with: overallScore (0-100), 
  criteria: { structure (0-10), content (0-10), creativity (0-10), 
  pedagogicalValue (0-10), bloomCoverage (0-10) },
  feedback (detailed constructive feedback string),
  strengths (array of strings), improvements (array of strings),
  bloomLevelsCovered (array of: remember/understand/apply/analyze/evaluate/create),
  recommendation (pass/revise/fail).
  Respond in Uzbek language. Barcha baholashlar va xulosalar O'zbek tilida bo'lishi shart.`;

  const userPrompt = `Evaluate this student lesson plan:
  Title: ${lessonPlan.title || 'Untitled'}
  Content: ${lessonPlan.content}
  ${materialContext ? `Based on Material: ${materialContext}` : ''}
  
  Assess the pedagogical quality and cognitive depth of this lesson plan.`;

  const result = await callAI(systemPrompt, userPrompt);

  if (result) return result;

  // Mock response
  return {
    overallScore: 72,
    criteria: {
      structure: 7,
      content: 7,
      creativity: 6,
      pedagogicalValue: 8,
      bloomCoverage: 7,
    },
    feedback: 'Dars rejasi mavzuni yaxshi tushunganlikni va yaxshi tashkiliy tuzilmani ko\'rsatadi. Pedagogik yondashuvni kuchaytirish uchun ko\'proq interaktiv mashg\'ulotlar va baholash usullarini qo\'shishni tavsiya qilamiz.',
    strengths: ['Mavzuning aniq tashkil etilishi', 'Misollardan yaxshi foydalanish', 'Maqsadli auditoriya uchun mos'],
    improvements: ['Ko\'proq interaktiv elementlar qo\'shish', 'Baholash mezonlarini kiritish', 'Yuqori darajadagi fikrlash mashg\'ulotlarini kengaytirish'],
    bloomLevelsCovered: ['remember', 'understand', 'apply'],
    recommendation: 'pass',
    _isMock: !isAIAvailable(),
  };
}

/**
 * Chat with AI Mentor
 */
async function chatWithMentor(message, materialContext = '', history = []) {
  const systemPrompt = `You are a helpful and encouraging virtual AI Mentor for students. 
  Your goal is to answer the student's question based on the provided material context.
  If the answer is not in the context, use your general knowledge but mention that it's outside the current lesson scope.
  Keep your answers concise, clear, and encouraging. Use markdown for formatting if needed.
  Respond in the same language the student is asking (mostly Uzbek).`;

  let historyText = '';
  if (history && history.length > 0) {
    historyText = 'Previous Conversation:\n' + history.map(h => `${h.sender === 'user' ? 'Student' : 'Mentor'}: ${h.text}`).join('\n') + '\n\n';
  }

  const userPrompt = `${materialContext ? `Material Context:\n${materialContext}\n\n` : ''}${historyText}Student's Current Question: ${message}`;

  const result = await callAI(systemPrompt, userPrompt, false);

  if (result) return result;

  // Mock response
  return "Assalomu alaykum! Kechirasiz, hozirda AI tizimida uzilish mavjud. Savolingizni birozdan so'ng qayta yo'llang.";
}

/**
 * Global Chat with AI Mentor (handles file uploads)
 */
async function globalChatWithMentor(message, files = [], history = []) {
  if (!genAI) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Gemini API key is missing or invalid in production environment');
    }
    return "Kechirasiz, hozirda AI xizmati mavjud emas.";
  }

  const systemPrompt = `You are a strict educational AI Mentor. 
  Your ONLY purpose is to answer questions related to education, academics, learning, and study materials.
  If the user asks about ANYTHING ELSE (e.g., general knowledge, entertainment, personal advice, coding non-educational tools, etc.), 
  you MUST stop the conversation by replying with a polite refusal in Uzbek (e.g., "Kechirasiz, men faqat ta'lim va o'quv jarayoniga oid savollarga javob bera olaman.").
  Keep your answers concise, clear, and encouraging. Use markdown for formatting if needed.
  Respond in the same language the student is asking (mostly Uzbek).`;

  let historyText = '';
  if (history && history.length > 0) {
    historyText = 'Previous Conversation:\n' + history.map(h => `${h.sender === 'user' ? 'Student' : 'Mentor'}: ${h.text}`).join('\n') + '\n\n';
  }

  const userPrompt = `${historyText}Student's Current Message: ${message || '(File attached)'}`;

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Prepare contents array
      const contents = [];

      // Convert multer files to Gemini inline data parts
      if (files && files.length > 0) {
        for (const file of files) {
          contents.push({
            inlineData: {
              data: file.buffer.toString('base64'),
              mimeType: file.mimetype
            }
          });
        }
      }

      contents.push({ text: `${systemPrompt}\n\n${userPrompt}` });

      const result = await model.generateContent(contents);
      const response = await result.response;
      return response.text();
    } catch (err) {
      const retryable = isRetryableError(err);
      console.error(
        `Gemini API error - Global Chat (attempt ${attempt}/${MAX_RETRIES}):`,
        err.message
      );

      if (retryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`Retryable error detected. Retrying in ${delay}ms…`);
        await sleep(delay);
        continue;
      }

      // Non-retryable or retries exhausted — return friendly message
      console.warn('Global Chat: falling back to error message after retries.');
      return "Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.";
    }
  }

  return "Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.";
}

module.exports = {
  isAIAvailable,
  analyzeMaterial,
  generateTest,
  evaluateAnswer,
  generateRecommendations,
  evaluateLessonPlan,
  chatWithMentor,
  globalChatWithMentor,
};
