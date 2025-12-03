// Telegram Bot Service for sending lottery predictions
import axios from 'axios';
import type { LotteryPrediction } from './lotteryPrediction';

export class TelegramBot {
  private botToken: string;
  private chatId: string;
  
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
    }
  }
  
  async sendPrediction(prediction: LotteryPrediction): Promise<void> {
    if (!this.botToken || !this.chatId) {
      console.log('Skipping Telegram notification - not configured');
      return;
    }
    
    const message = this.formatPredictionMessage(prediction);
    
    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
      });
      
      console.log(`✅ Sent prediction for ${prediction.region} to Telegram`);
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error.message);
      throw error;
    }
  }
  
  private formatPredictionMessage(prediction: LotteryPrediction): string {
    const regionName = {
      NORTH: '🔴 MIỀN BẮC',
      CENTRAL: '🟡 MIỀN TRUNG',
      SOUTH: '🔵 MIỀN NAM',
    }[prediction.region];
    
    const dateStr = prediction.date.toLocaleDateString('vi-VN');
    
    return `
<b>🎰 DỰ ĐOÁN XỔ SỐ ${regionName}</b>
📅 Ngày: ${dateStr}
📊 Độ tin cậy: ${prediction.confidence.toFixed(1)}%

<b>🎁 LÔ ĐẶC BIỆT (2 số cuối giải ĐB):</b>
${prediction.loDacBiet.join(', ')}

<b>🎯 BẠCH THỦ LÔ:</b>
${prediction.bachThuLo.join(', ')}

<b>📋 LÔ 3 SỐ:</b>
${prediction.lo3So.join(', ')}

<b>🔗 XIÊN 2:</b>
${prediction.loXien2.map(x => x.join('-')).join(', ')}

<b>🔗 XIÊN 3:</b>
${prediction.xien3.map(x => x.join('-')).join(', ')}

<b>🔗 XIÊN 4:</b>
${prediction.xien4.map(x => x.join('-')).join(', ')}

⏰ Dự đoán được tạo lúc: ${new Date().toLocaleTimeString('vi-VN')}
`.trim();
  }
  
  async sendTestMessage(): Promise<void> {
    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram not configured');
    }
    
    await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      chat_id: this.chatId,
      text: '✅ Telegram bot đã kết nối thành công!\n🎰 Hệ thống dự đoán xổ số đã sẵn sàng.',
    });
  }

  /**
   * Send a generic message to Telegram
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      console.log('Skipping Telegram notification - not configured');
      return;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
      });

      console.log('✅ Message sent to Telegram');
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error.message);
      throw error;
    }
  }

  /**
   * Check if Telegram is configured
   */
  isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }
}
