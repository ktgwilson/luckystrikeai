import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { LocalizedContent, RegionConfig } from '../types';

export class LocalizationService {
  private static currentLanguage: string = 'en';
  private static currentRegion: string = 'US';
  private static translations: Record<string, string> = {};

  static async initializeLocalization(language: string = 'en', region: string = 'US'): Promise<void> {
    try {
      this.currentLanguage = language;
      this.currentRegion = region;

      const content = await this.getLocalizedContent(language, region);
      if (content) {
        this.translations = content.translations;
      }

      await AnalyticsService.trackEvent('localization_initialized', {
        language,
        region,
        translationCount: Object.keys(this.translations).length
      });
    } catch (error) {
      console.error('Error initializing localization:', error);
    }
  }

  static async setLanguage(language: string): Promise<void> {
    try {
      const content = await this.getLocalizedContent(language, this.currentRegion);
      if (content) {
        this.currentLanguage = language;
        this.translations = content.translations;
        
        await StorageService.saveUserSettings('user_language', language);
        
        await AnalyticsService.trackEvent('language_changed', {
          newLanguage: language,
          previousLanguage: this.currentLanguage,
          region: this.currentRegion
        });
      }
    } catch (error) {
      console.error('Error setting language:', error);
    }
  }

  static async setRegion(region: string): Promise<void> {
    try {
      const regionConfig = await this.getRegionConfig(region);
      if (regionConfig) {
        this.currentRegion = region;
        
        if (regionConfig.language !== this.currentLanguage) {
          await this.setLanguage(regionConfig.language);
        }

        await StorageService.saveUserSettings('user_region', region);
        
        await AnalyticsService.trackEvent('region_changed', {
          newRegion: region,
          language: regionConfig.language,
          currency: regionConfig.currency,
          gamblingAllowed: regionConfig.isGamblingAllowed
        });
      }
    } catch (error) {
      console.error('Error setting region:', error);
    }
  }

  static translate(key: string, fallback?: string): string {
    return this.translations[key] || fallback || key;
  }

  static translatePrizeName(prizeKey: string): string {
    const content = this.getCurrentContent();
    return content?.prizeNames[prizeKey] || prizeKey;
  }

  static translateThemeName(themeKey: string): string {
    const content = this.getCurrentContent();
    return content?.themeNames[themeKey] || themeKey;
  }

  static formatCurrency(amount: number): string {
    const content = this.getCurrentContent();
    const symbol = content?.currencySymbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  static formatDate(date: Date): string {
    const content = this.getCurrentContent();
    const format = content?.dateFormat || 'MM/DD/YYYY';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return format
      .replace('MM', month)
      .replace('DD', day)
      .replace('YYYY', year.toString());
  }

  static async getRegionConfig(region: string): Promise<RegionConfig | null> {
    const configs = await this.getAllRegionConfigs();
    return configs.find(config => config.code === region) || null;
  }

  static async getCurrentRegionConfig(): Promise<RegionConfig | null> {
    return await this.getRegionConfig(this.currentRegion);
  }

  static async isGamblingAllowed(): Promise<boolean> {
    const config = await this.getCurrentRegionConfig();
    return config?.isGamblingAllowed ?? true;
  }

  static async getMaxPrizeValue(): Promise<number> {
    const config = await this.getCurrentRegionConfig();
    return config?.maxPrizeValue ?? 100000;
  }

  static async getRequiredAge(): Promise<number> {
    const config = await this.getCurrentRegionConfig();
    return config?.requiredAge ?? 18;
  }

  static async getTaxRate(): Promise<number> {
    const config = await this.getCurrentRegionConfig();
    return config?.taxRate ?? 0;
  }

  static async getSupportedPayments(): Promise<string[]> {
    const config = await this.getCurrentRegionConfig();
    return config?.supportedPayments ?? ['card', 'paypal'];
  }

  static async createLocalizedContent(
    language: string,
    region: string,
    translations: Record<string, string>,
    prizeNames: Record<string, string>,
    themeNames: Record<string, string>,
    currencySymbol: string,
    dateFormat: string
  ): Promise<LocalizedContent> {
    const content: LocalizedContent = {
      language,
      region,
      translations,
      prizeNames,
      themeNames,
      currencySymbol,
      dateFormat
    };

    await this.saveLocalizedContent(content);

    await AnalyticsService.trackEvent('localized_content_created', {
      language,
      region,
      translationCount: Object.keys(translations).length,
      prizeCount: Object.keys(prizeNames).length,
      themeCount: Object.keys(themeNames).length
    });

    return content;
  }

  static async createRegionConfig(
    code: string,
    name: string,
    currency: string,
    language: string,
    isGamblingAllowed: boolean,
    maxPrizeValue: number,
    requiredAge: number,
    taxRate: number,
    supportedPayments: string[]
  ): Promise<RegionConfig> {
    const config: RegionConfig = {
      code,
      name,
      currency,
      language,
      isGamblingAllowed,
      maxPrizeValue,
      requiredAge,
      taxRate,
      supportedPayments
    };

    await this.saveRegionConfig(config);

    await AnalyticsService.trackEvent('region_config_created', {
      code,
      name,
      currency,
      language,
      isGamblingAllowed,
      maxPrizeValue,
      requiredAge
    });

    return config;
  }

  static async initializeDefaultContent(): Promise<void> {
    await this.createLocalizedContent(
      'en',
      'US',
      {
        'welcome': 'Welcome to LuckyStrike!',
        'scratch_now': 'Scratch Now',
        'daily_ticket': 'Daily Free Ticket',
        'wallet': 'Wallet',
        'tokens': 'Tokens',
        'coins': 'Coins',
        'tickets': 'Tickets',
        'settings': 'Settings',
        'profile': 'Profile',
        'marketplace': 'Marketplace',
        'social': 'Social',
        'clubs': 'Clubs',
        'parties': 'Live Parties',
        'congratulations': 'Congratulations!',
        'better_luck': 'Better luck next time!',
        'play_again': 'Play Again',
        'join_party': 'Join Party',
        'create_club': 'Create Club',
        'buy_nft': 'Buy NFT',
        'sell_nft': 'Sell NFT',
        'equip_item': 'Equip Item'
      },
      {
        'common_prize': 'Common Prize',
        'rare_prize': 'Rare Prize',
        'epic_prize': 'Epic Prize',
        'legendary_prize': 'Legendary Prize',
        'jackpot': 'Jackpot'
      },
      {
        'aurora_fortune': 'Aurora Fortune',
        'sunken_riches': 'Sunken Riches',
        'pixel_payout': 'Pixel Payout',
        'galactic_gold_rush': 'Galactic Gold Rush',
        'mythic_matchup': 'Mythic Matchup',
        'neon_nights': 'Neon Nights'
      },
      '$',
      'MM/DD/YYYY'
    );

    await this.createLocalizedContent(
      'es',
      'MX',
      {
        'welcome': '¡Bienvenido a LuckyStrike!',
        'scratch_now': 'Rasca Ahora',
        'daily_ticket': 'Boleto Diario Gratis',
        'wallet': 'Cartera',
        'tokens': 'Fichas',
        'coins': 'Monedas',
        'tickets': 'Boletos',
        'settings': 'Configuración',
        'profile': 'Perfil',
        'marketplace': 'Mercado',
        'social': 'Social',
        'clubs': 'Clubes',
        'parties': 'Fiestas en Vivo',
        'congratulations': '¡Felicidades!',
        'better_luck': '¡Mejor suerte la próxima vez!',
        'play_again': 'Jugar de Nuevo',
        'join_party': 'Unirse a la Fiesta',
        'create_club': 'Crear Club',
        'buy_nft': 'Comprar NFT',
        'sell_nft': 'Vender NFT',
        'equip_item': 'Equipar Artículo'
      },
      {
        'common_prize': 'Premio Común',
        'rare_prize': 'Premio Raro',
        'epic_prize': 'Premio Épico',
        'legendary_prize': 'Premio Legendario',
        'jackpot': 'Premio Mayor'
      },
      {
        'aurora_fortune': 'Fortuna Aurora',
        'sunken_riches': 'Riquezas Hundidas',
        'pixel_payout': 'Pago Pixel',
        'galactic_gold_rush': 'Fiebre del Oro Galáctica',
        'mythic_matchup': 'Enfrentamiento Mítico',
        'neon_nights': 'Noches de Neón'
      },
      '$',
      'DD/MM/YYYY'
    );

    await this.createRegionConfig('US', 'United States', 'USD', 'en', true, 100000, 18, 0.25, ['card', 'paypal', 'apple_pay', 'google_pay', 'crypto']);
    await this.createRegionConfig('MX', 'Mexico', 'MXN', 'es', true, 50000, 18, 0.16, ['card', 'paypal', 'crypto']);
    await this.createRegionConfig('CA', 'Canada', 'CAD', 'en', true, 75000, 19, 0.20, ['card', 'paypal', 'apple_pay', 'google_pay']);
    await this.createRegionConfig('UK', 'United Kingdom', 'GBP', 'en', true, 80000, 18, 0.20, ['card', 'paypal', 'apple_pay', 'google_pay']);
    await this.createRegionConfig('DE', 'Germany', 'EUR', 'de', false, 0, 18, 0.25, ['card', 'paypal']); // Gambling restricted
  }

  private static async saveLocalizedContent(content: LocalizedContent): Promise<void> {
    const contents = await this.getAllLocalizedContent();
    const index = contents.findIndex(c => c.language === content.language && c.region === content.region);
    if (index >= 0) {
      contents[index] = content;
    } else {
      contents.push(content);
    }
    await StorageService.saveUserSettings('localized_content', contents);
  }

  private static async getLocalizedContent(language: string, region: string): Promise<LocalizedContent | null> {
    const contents = await this.getAllLocalizedContent();
    return contents.find(c => c.language === language && c.region === region) || 
           contents.find(c => c.language === language) || null;
  }

  private static async getAllLocalizedContent(): Promise<LocalizedContent[]> {
    const data = await StorageService.getUserSettings('localized_content');
    return Array.isArray(data) ? data : [];
  }

  private static async saveRegionConfig(config: RegionConfig): Promise<void> {
    const configs = await this.getAllRegionConfigs();
    const index = configs.findIndex(c => c.code === config.code);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }
    await StorageService.saveUserSettings('region_configs', configs);
  }

  private static async getAllRegionConfigs(): Promise<RegionConfig[]> {
    const data = await StorageService.getUserSettings('region_configs');
    return Array.isArray(data) ? data : [];
  }

  private static getCurrentContent(): LocalizedContent | null {
    return {
      language: this.currentLanguage,
      region: this.currentRegion,
      translations: this.translations,
      prizeNames: {},
      themeNames: {},
      currencySymbol: '$',
      dateFormat: 'MM/DD/YYYY'
    };
  }

  static getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  static getCurrentRegion(): string {
    return this.currentRegion;
  }

  static async detectUserRegion(): Promise<string> {
    return 'US';
  }

  static async detectUserLanguage(): Promise<string> {
    return 'en';
  }
}
