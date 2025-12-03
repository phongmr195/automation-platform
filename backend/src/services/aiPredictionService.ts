import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export type AIProvider = 'claude' | 'gpt' | 'gemini' | 'groq';

export interface LotteryHistoricalData {
  date: string;
  region: string;
  results: {
    special?: string;
    first?: string[];
    second?: string[];
    third?: string[];
    fourth?: string[];
    fifth?: string[];
    sixth?: string[];
    seventh?: string[];
  };
}

export interface AIPrediction {
  provider: AIProvider;
  region: string;
  bachThuLo: string[];
  lo3So: string[];
  loXien2: string[][];
  xien3: string[][];
  xien4: string[][];
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export class AIPredictionService {
  private claudeClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private groqClient: Groq | null = null;

  constructor() {
    // Initialize Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.claudeClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Gemini
    if (process.env.GOOGLE_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    // Initialize Groq
    if (process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }
  }

  private buildPrompt(region: string, historicalData: LotteryHistoricalData[]): string {
    const regionName = {
      NORTH: 'Miền Bắc',
      CENTRAL: 'Miền Trung',
      SOUTH: 'Miền Nam',
    }[region];

    const historyText = historicalData.length > 0
      ? historicalData.map(h => `${h.date}: ${JSON.stringify(h.results)}`).join('\n')
      : 'Không có dữ liệu lịch sử. Hãy dựa vào phân tích thống kê xổ số Việt Nam và tần suất xuất hiện các số từ 00-99.';

    return `Bạn là chuyên gia phân tích xổ số Việt Nam với nhiều năm kinh nghiệm. Hãy phân tích và đưa ra dự đoán cho xổ số ${regionName}.

DỮ LIỆU LỊCH SỬ:
${historyText}

NGUYÊN TẮC DỰ ĐOÁN QUAN TRỌNG:
- KHÔNG sử dụng các số lặp đơn giản như 11, 22, 33, 44, 55
- KHÔNG sử dụng các số theo thứ tự liên tiếp như 12, 23, 34, 45
- PHẢI chọn các số ngẫu nhiên và phân tán từ 00-99
- ƯU TIÊN các số có tần suất cao trong xổ số thực tế: 07, 17, 27, 37, 47, 57, 67, 77, 87, 97 và các số kết thúc bằng 0, 1, 2, 3, 5, 7, 8, 9
- TRÁNH các số theo pattern rõ ràng
- Đảm bảo các số phân tán đều trong khoảng 00-99

YÊU CẦU DỰ ĐOÁN:
1. Bạch thủ lô (1 số 2 chữ số duy nhất có khả năng cao nhất): String (1 number)
2. Lô 3 số (2 số 3 chữ số KHÁC NHAU): Array of 2 numbers  
3. Xiên 2 (6 cặp số KHÁC NHAU): Array of 6 pairs [num1, num2]
4. Xiên 3 (3 bộ 3 số KHÁC NHAU): Array of 3 triplets [num1, num2, num3]
5. Xiên 4 (1 bộ 4 số): Array of 1 quadruplet [num1, num2, num3, num4]

VÍ DỤ SỐ TỐT (phân tán, ngẫu nhiên):
- Bạch thủ lô: ["07"]
- Lô 3 số: ["127", "348"]

VÍ DỤ SỐ TỒI (TRÁNH):
- TRÁNH: ["11"] hoặc ["22"] - quá đơn giản
- TRÁNH: ["12"] hoặc ["23"] - liên tiếp
- TRÁNH: ["111", "222"] - lặp số

PHƯƠNG PHÁP PHÂN TÍCH:
- Nếu có dữ liệu: Phân tích tần suất, pattern, chu kỳ
- Nếu không có dữ liệu: Dựa vào kinh nghiệm xổ số Việt Nam, chọn các số có xác suất cao, phân tán đều
- Ưu tiên số có đuôi 7, 0, 3, 5, 8
- Kết hợp các số chẵn và lẻ

QUAN TRỌNG: Trả lời CHÍNH XÁC theo format JSON sau, KHÔNG thêm text hay giải thích nào khác:
{
  "bachThuLo": ["07"],
  "lo3So": ["127", "348"],
  "loXien2": [["07", "23"], ["07", "45"], ["23", "45"], ["45", "68"], ["23", "68"], ["07", "68"]],
  "xien3": [["07", "23", "45"], ["07", "45", "68"], ["23", "45", "68"]],
  "xien4": [["07", "23", "45", "68"]],
  "confidence": 75,
  "reasoning": "Dựa trên phân tích tần suất xuất hiện và kinh nghiệm xổ số Việt Nam, số 07 có đuôi 7 là số hot nhất. Kết hợp cân bằng số chẵn lẻ và phân tán đều."
}`;
  }

  async predictWithClaude(region: string, historicalData: LotteryHistoricalData[] = []): Promise<AIPrediction> {
    if (!this.claudeClient) {
      throw new Error('Claude API key not configured');
    }

    const prompt = this.buildPrompt(region, historicalData);

    const message = await this.claudeClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      provider: 'claude',
      region,
      bachThuLo: parsed.bachThuLo,
      lo3So: parsed.lo3So,
      loXien2: parsed.loXien2,
      xien3: parsed.xien3,
      xien4: parsed.xien4,
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'No reasoning provided',
      timestamp: new Date(),
    };
  }

  async predictWithGPT(region: string, historicalData: LotteryHistoricalData[] = []): Promise<AIPrediction> {
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildPrompt(region, historicalData);

    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse GPT response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      provider: 'gpt',
      region,
      bachThuLo: parsed.bachThuLo,
      lo3So: parsed.lo3So,
      loXien2: parsed.loXien2,
      xien3: parsed.xien3,
      xien4: parsed.xien4,
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'No reasoning provided',
      timestamp: new Date(),
    };
  }

  async predictWithGemini(region: string, historicalData: LotteryHistoricalData[] = []): Promise<AIPrediction> {
    if (!this.geminiClient) {
      throw new Error('Google API key not configured');
    }

    const prompt = this.buildPrompt(region, historicalData);
    
    // Use the correct model name for Gemini API
    const model = this.geminiClient.getGenerativeModel({ 
      model: 'gemini-pro'
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      provider: 'gemini',
      region,
      bachThuLo: parsed.bachThuLo,
      lo3So: parsed.lo3So,
      loXien2: parsed.loXien2,
      xien3: parsed.xien3,
      xien4: parsed.xien4,
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'No reasoning provided',
      timestamp: new Date(),
    };
  }

  async predictWithGroq(region: string, historicalData: LotteryHistoricalData[] = []): Promise<AIPrediction> {
    if (!this.groqClient) {
      throw new Error('Groq API key not configured');
    }

    const prompt = this.buildPrompt(region, historicalData);

    const completion = await this.groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse Groq response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      provider: 'groq',
      region,
      bachThuLo: parsed.bachThuLo,
      lo3So: parsed.lo3So,
      loXien2: parsed.loXien2,
      xien3: parsed.xien3,
      xien4: parsed.xien4,
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'No reasoning provided',
      timestamp: new Date(),
    };
  }

  async predictWithAll(region: string, historicalData: LotteryHistoricalData[] = []): Promise<{
    predictions: AIPrediction[];
    consensus: AIPrediction;
  }> {
    const predictions: AIPrediction[] = [];

    // Run all predictions in parallel
    const promises: Promise<AIPrediction>[] = [];

    if (this.claudeClient) {
      promises.push(this.predictWithClaude(region, historicalData).catch(err => {
        console.error('Claude prediction failed:', err);
        return null;
      }) as Promise<AIPrediction>);
    }

    if (this.openaiClient) {
      promises.push(this.predictWithGPT(region, historicalData).catch(err => {
        console.error('GPT prediction failed:', err);
        return null;
      }) as Promise<AIPrediction>);
    }

    if (this.geminiClient) {
      promises.push(this.predictWithGemini(region, historicalData).catch(err => {
        console.error('Gemini prediction failed:', err);
        return null;
      }) as Promise<AIPrediction>);
    }

    if (this.groqClient) {
      promises.push(this.predictWithGroq(region, historicalData).catch(err => {
        console.error('Groq prediction failed:', err);
        return null;
      }) as Promise<AIPrediction>);
    }

    const results = await Promise.all(promises);
    predictions.push(...results.filter(p => p !== null));

    if (predictions.length === 0) {
      throw new Error('All AI predictions failed');
    }

    // Create consensus by combining predictions
    const consensus = this.createConsensus(predictions, region);

    return { predictions, consensus };
  }

  private createConsensus(predictions: AIPrediction[], region: string): AIPrediction {
    // Combine all numbers and count frequency
    const numberFrequency = new Map<string, number>();
    const pairFrequency = new Map<string, number>();

    predictions.forEach(pred => {
      pred.bachThuLo.forEach(num => {
        numberFrequency.set(num, (numberFrequency.get(num) || 0) + 1);
      });
      pred.lo3So.forEach(num => {
        numberFrequency.set(num, (numberFrequency.get(num) || 0) + 1);
      });
      pred.loXien2.forEach(pair => {
        const key = pair.join('-');
        pairFrequency.set(key, (pairFrequency.get(key) || 0) + 1);
      });
    });

    // Get top numbers by frequency
    const sortedNumbers = Array.from(numberFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([num]) => num);

    const bachThuLo = sortedNumbers.filter(n => n.length === 2).slice(0, 5);
    const lo3So = sortedNumbers.filter(n => n.length === 3).slice(0, 10);

    // Ensure we have enough numbers
    while (bachThuLo.length < 5) {
      const num = String(Math.floor(Math.random() * 100)).padStart(2, '0');
      if (!bachThuLo.includes(num)) bachThuLo.push(num);
    }

    while (lo3So.length < 10) {
      const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      if (!lo3So.includes(num)) lo3So.push(num);
    }

    // Generate combinations from consensus numbers
    const loXien2: string[][] = [];
    for (let i = 0; i < bachThuLo.length && loXien2.length < 10; i++) {
      for (let j = i + 1; j < bachThuLo.length && loXien2.length < 10; j++) {
        loXien2.push([bachThuLo[i], bachThuLo[j]]);
      }
    }

    const xien3: string[][] = [];
    for (let i = 0; i < bachThuLo.length - 2 && xien3.length < 8; i++) {
      for (let j = i + 1; j < bachThuLo.length - 1 && xien3.length < 8; j++) {
        for (let k = j + 1; k < bachThuLo.length && xien3.length < 8; k++) {
          xien3.push([bachThuLo[i], bachThuLo[j], bachThuLo[k]]);
        }
      }
    }

    const xien4: string[][] = [];
    for (let i = 0; i < bachThuLo.length - 3 && xien4.length < 5; i++) {
      for (let j = i + 1; j < bachThuLo.length - 2 && xien4.length < 5; j++) {
        for (let k = j + 1; k < bachThuLo.length - 1 && xien4.length < 5; k++) {
          for (let l = k + 1; l < bachThuLo.length && xien4.length < 5; l++) {
            xien4.push([bachThuLo[i], bachThuLo[j], bachThuLo[k], bachThuLo[l]]);
          }
        }
      }
    }

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    return {
      provider: 'claude', // Default to Claude for consensus
      region,
      bachThuLo,
      lo3So,
      loXien2,
      xien3,
      xien4,
      confidence: Math.round(avgConfidence),
      reasoning: `Consensus from ${predictions.length} AI models: ${predictions.map(p => p.provider).join(', ')}`,
      timestamp: new Date(),
    };
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.claudeClient) providers.push('claude');
    if (this.openaiClient) providers.push('gpt');
    if (this.geminiClient) providers.push('gemini');
    if (this.groqClient) providers.push('groq');
    return providers;
  }
}
