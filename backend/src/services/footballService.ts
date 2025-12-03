import axios from 'axios';

// Football leagues configuration
export const FOOTBALL_LEAGUES = {
  CHAMPIONS_LEAGUE: { id: 2, name: 'UEFA Champions League', flag: '🏆' },
  EUROPA_LEAGUE: { id: 3, name: 'UEFA Europa League', flag: '🏆' },
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LA_LIGA: { id: 140, name: 'La Liga', flag: '🇪🇸' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', flag: '🇩🇪' },
  SERIE_A: { id: 135, name: 'Serie A', flag: '🇮🇹' },
  LIGUE_1: { id: 61, name: 'Ligue 1', flag: '🇫🇷' },
};

export interface FootballMatch {
  id: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  league: string;
  leagueFlag: string;
}

export interface LeagueResults {
  league: string;
  leagueFlag: string;
  matches: FootballMatch[];
}

export class FootballService {
  private apiKey: string;
  private baseUrl: string = 'https://api.football-data.org/v4';
  // Map our league IDs to football-data.org competition codes
  private leagueCodeMap: { [key: number]: string } = {
    2: 'CL',    // Champions League
    3: 'EL',    // Europa League
    39: 'PL',   // Premier League
    140: 'PD',  // La Liga (Primera División)
    78: 'BL1',  // Bundesliga
    135: 'SA',  // Serie A
    61: 'FL1',  // Ligue 1
  };

  constructor() {
    this.apiKey = process.env.FOOTBALL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Football API key not configured. Set FOOTBALL_API_KEY in .env');
    }
  }

  /**
   * Get yesterday's football results for all major leagues
   */
  async getYesterdayResults(): Promise<LeagueResults[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`🔍 Fetching football results for: ${dateStr}`);

    try {
      const results: LeagueResults[] = [];

      // Query each league separately (more reliable than /matches endpoint)
      for (const league of Object.values(FOOTBALL_LEAGUES)) {
        const leagueCode = this.leagueCodeMap[league.id];
        if (leagueCode) {
          const matches = await this.getLeagueMatchesForDate(leagueCode, league, dateStr);
          if (matches.length > 0) {
            results.push({
              league: league.name,
              leagueFlag: league.flag,
              matches,
            });
          }
        }
      }

      console.log(`📊 Total leagues with matches: ${results.length}`);
      console.log(`⚽ Total matches: ${results.reduce((sum, r) => sum + r.matches.length, 0)}`);

      return results;
    } catch (error) {
      console.error('Error fetching football results:', error);
      return [];
    }
  }

  /**
   * Get matches for a specific league and date
   */
  private async getLeagueMatchesForDate(
    leagueCode: string,
    league: typeof FOOTBALL_LEAGUES[keyof typeof FOOTBALL_LEAGUES],
    date: string
  ): Promise<FootballMatch[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/competitions/${leagueCode}/matches`, {
        params: {
          status: 'FINISHED',
        },
        headers: {
          'X-Auth-Token': this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data && response.data.matches) {
        // Filter matches for the specific date
        const dateMatches = response.data.matches.filter((match: any) => 
          match.utcDate.startsWith(date)
        );

        return dateMatches.map((match: any) => this.mapMatchData(match, league.id));
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`⚠️  Rate limit reached for ${league.name}`);
      } else if (error.response?.status === 403) {
        console.warn(`⚠️  ${league.name} not available in free tier`);
      } else {
        console.error(`❌ Error fetching ${league.name}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Get all matches for a specific date
   */
  private async getAllMatches(date: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('Football API key not configured');
    }

    try {
      console.log(`🌐 API Request: ${this.baseUrl}/matches?dateFrom=${date}&dateTo=${date}`);
      const response = await axios.get(`${this.baseUrl}/matches`, {
        params: {
          dateFrom: date,
          dateTo: date,
        },
        headers: {
          'X-Auth-Token': this.apiKey,
        },
        timeout: 10000,
      });

      console.log(`📡 API Response: ${response.data.matches?.length || 0} total matches`);
      
      if (response.data && response.data.matches) {
        const finishedMatches = response.data.matches.filter(
          (match: any) => match.status === 'FINISHED'
        );
        console.log(`✅ Finished matches: ${finishedMatches.length}`);
        console.log(`📋 Sample matches:`, response.data.matches.slice(0, 3).map((m: any) => ({
          date: m.utcDate,
          comp: m.competition.code,
          status: m.status,
          home: m.homeTeam.shortName,
          away: m.awayTeam.shortName
        })));
        return finishedMatches;
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Football API rate limit reached');
      }
      console.error('❌ API Error:', error.message);
      throw error;
    }
  }

  /**
   * Map match data from football-data.org format to our format
   */
  private mapMatchData(match: any, leagueId: number): FootballMatch {
    return {
      id: match.id,
      date: match.utcDate.split('T')[0],
      time: new Date(match.utcDate).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
      status: match.status,
      league: match.competition.name,
      leagueFlag: this.getLeagueFlag(leagueId),
    };
  }

  /**
   * Get league ID from competition code
   */
  private getLeagueIdFromCode(code: string): number | null {
    for (const [id, leagueCode] of Object.entries(this.leagueCodeMap)) {
      if (leagueCode === code) {
        return parseInt(id);
      }
    }
    return null;
  }

  /**
   * Get matches for a specific league and date (legacy method for compatibility)
   */
  private async getLeagueMatches(leagueId: number, date: string): Promise<FootballMatch[]> {
    const allMatches = await this.getAllMatches(date);
    const leagueCode = this.leagueCodeMap[leagueId];
    
    if (!leagueCode) {
      return [];
    }

    return allMatches
      .filter((match: any) => match.competition.code === leagueCode)
      .map((match: any) => this.mapMatchData(match, leagueId));
  }

  /**
   * Format results into a Telegram message
   */
  formatResultsMessage(results: LeagueResults[]): string {
    if (results.length === 0) {
      return '⚽ Không có trận đấu nào diễn ra hôm qua';
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let message = `⚽ KẾT QUẢ BÓNG ĐÁ\n${dateStr}\n\n`;

    for (const leagueResult of results) {
      message += `${leagueResult.leagueFlag} ${leagueResult.league.toUpperCase()}\n`;
      message += `${'─'.repeat(40)}\n`;

      for (const match of leagueResult.matches) {
        const homeScore = match.homeScore ?? '-';
        const awayScore = match.awayScore ?? '-';
        
        // Add emoji for result
        let resultEmoji = '';
        if (match.homeScore !== null && match.awayScore !== null) {
          if (match.homeScore > match.awayScore) {
            resultEmoji = '✅'; // Home win
          } else if (match.homeScore < match.awayScore) {
            resultEmoji = '✅'; // Away win
          } else {
            resultEmoji = '🤝'; // Draw
          }
        }

        message += `${match.time} ${resultEmoji}\n`;
        message += `${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}\n\n`;
      }

      message += '\n';
    }

    message += '━━━━━━━━━━━━━━━━━━━━━━\n';
    message += '📊 Tổng số trận: ' + results.reduce((sum, r) => sum + r.matches.length, 0);

    return message;
  }

  /**
   * Get league flag emoji by ID
   */
  private getLeagueFlag(leagueId: number): string {
    const league = Object.values(FOOTBALL_LEAGUES).find(l => l.id === leagueId);
    return league?.flag || '⚽';
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
