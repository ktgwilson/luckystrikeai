import { AnalyticsService } from './AnalyticsService';
import { StorageService } from './StorageService';
import { NFTItem, MarketplaceListing, PlayerInventory, NFTAttribute } from '../types';

export class NFTMarketplaceService {
  private static readonly MARKETPLACE_FEE = 0.025; // 2.5% marketplace fee
  private static readonly MAX_LISTING_DURATION_DAYS = 30;

  static async createNFT(
    name: string,
    description: string,
    image: string,
    rarity: 'common' | 'rare' | 'epic' | 'legendary',
    category: 'skin' | 'theme' | 'avatar' | 'badge',
    attributes: NFTAttribute[],
    creator: string
  ): Promise<NFTItem> {
    const nft: NFTItem = {
      id: `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId: `${Date.now()}`,
      contractAddress: '0x' + Math.random().toString(16).substr(2, 40), // Mock contract address
      name,
      description,
      image,
      rarity,
      category,
      attributes,
      creator,
      owner: creator,
      isForSale: false,
      createdAt: new Date()
    };

    await this.saveNFT(nft);

    await AnalyticsService.trackEvent('nft_created', {
      nftId: nft.id,
      creator,
      rarity,
      category,
      name
    });

    return nft;
  }

  static async mintLimitedEditionDrop(
    name: string,
    description: string,
    image: string,
    rarity: 'rare' | 'epic' | 'legendary',
    category: 'skin' | 'theme' | 'avatar' | 'badge',
    attributes: NFTAttribute[],
    quantity: number,
    priceTokens: number
  ): Promise<NFTItem[]> {
    const nfts: NFTItem[] = [];

    for (let i = 0; i < quantity; i++) {
      const nft = await this.createNFT(
        `${name} #${i + 1}`,
        description,
        image,
        rarity,
        category,
        [...attributes, { trait_type: 'Edition', value: `${i + 1}/${quantity}` }],
        'LuckyStrike' // System creator for limited drops
      );

      nft.price = priceTokens;
      nft.currency = 'tokens';
      nft.isForSale = true;

      await this.saveNFT(nft);
      nfts.push(nft);
    }

    await AnalyticsService.trackEvent('limited_edition_drop', {
      name,
      quantity,
      priceTokens,
      rarity,
      category
    });

    return nfts;
  }

  static async listNFTForSale(
    nftId: string,
    sellerId: string,
    price: number,
    currency: 'tokens' | 'eth' | 'usdc',
    durationDays: number = 7
  ): Promise<MarketplaceListing | null> {
    try {
      const nft = await this.getNFT(nftId);
      if (!nft || nft.owner !== sellerId || nft.isForSale) {
        return null;
      }

      const listing: MarketplaceListing = {
        id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nftId,
        sellerId,
        price,
        currency,
        listedAt: new Date(),
        expiresAt: new Date(Date.now() + Math.min(durationDays, this.MAX_LISTING_DURATION_DAYS) * 24 * 60 * 60 * 1000),
        status: 'active'
      };

      nft.isForSale = true;
      nft.price = price;
      nft.currency = currency;

      await this.saveNFT(nft);
      await this.saveListing(listing);

      await AnalyticsService.trackEvent('nft_listed', {
        nftId,
        sellerId,
        price,
        currency,
        rarity: nft.rarity,
        category: nft.category
      });

      return listing;
    } catch (error) {
      console.error('Error listing NFT for sale:', error);
      return null;
    }
  }

  static async buyNFT(listingId: string, buyerId: string): Promise<boolean> {
    try {
      const listing = await this.getListing(listingId);
      if (!listing || listing.status !== 'active' || listing.sellerId === buyerId) {
        return false;
      }

      const nft = await this.getNFT(listing.nftId);
      if (!nft || !nft.isForSale) {
        return false;
      }

      const fee = listing.price * this.MARKETPLACE_FEE;
      const sellerAmount = listing.price - fee;

      nft.owner = buyerId;
      nft.isForSale = false;
      nft.lastSalePrice = listing.price;
      nft.price = undefined;
      nft.currency = undefined;

      listing.status = 'sold';

      await this.saveNFT(nft);
      await this.saveListing(listing);

      await this.updatePlayerInventory(buyerId, nft, 'add');
      await this.updatePlayerInventory(listing.sellerId, nft, 'remove');

      await AnalyticsService.trackEvent('nft_purchased', {
        nftId: nft.id,
        buyerId,
        sellerId: listing.sellerId,
        price: listing.price,
        currency: listing.currency,
        fee,
        sellerAmount,
        rarity: nft.rarity,
        category: nft.category
      });

      return true;
    } catch (error) {
      console.error('Error buying NFT:', error);
      return false;
    }
  }

  static async cancelListing(listingId: string, sellerId: string): Promise<boolean> {
    try {
      const listing = await this.getListing(listingId);
      if (!listing || listing.sellerId !== sellerId || listing.status !== 'active') {
        return false;
      }

      const nft = await this.getNFT(listing.nftId);
      if (nft) {
        nft.isForSale = false;
        nft.price = undefined;
        nft.currency = undefined;
        await this.saveNFT(nft);
      }

      listing.status = 'cancelled';
      await this.saveListing(listing);

      await AnalyticsService.trackEvent('nft_listing_cancelled', {
        listingId,
        nftId: listing.nftId,
        sellerId
      });

      return true;
    } catch (error) {
      console.error('Error cancelling listing:', error);
      return false;
    }
  }

  static async getPlayerInventory(userId: string): Promise<PlayerInventory> {
    try {
      const data = await StorageService.getUserSettings(`inventory_${userId}`);
      if (data) {
        return {
          ...data,
          lastUpdated: new Date(data.lastUpdated)
        };
      }

      const inventory: PlayerInventory = {
        userId,
        nfts: [],
        equippedItems: {
          badges: []
        },
        totalValue: 0,
        lastUpdated: new Date()
      };

      await this.savePlayerInventory(inventory);
      return inventory;
    } catch (error) {
      console.error('Error getting player inventory:', error);
      return {
        userId,
        nfts: [],
        equippedItems: { badges: [] },
        totalValue: 0,
        lastUpdated: new Date()
      };
    }
  }

  static async equipNFT(userId: string, nftId: string): Promise<boolean> {
    try {
      const inventory = await this.getPlayerInventory(userId);
      const nft = inventory.nfts.find(n => n.id === nftId);
      
      if (!nft) return false;

      if (nft.category === 'badge') {
        if (!inventory.equippedItems.badges.includes(nftId)) {
          inventory.equippedItems.badges.push(nftId);
        }
      } else {
        inventory.equippedItems[nft.category] = nftId;
      }

      inventory.lastUpdated = new Date();
      await this.savePlayerInventory(inventory);

      await AnalyticsService.trackEvent('nft_equipped', {
        userId,
        nftId,
        category: nft.category,
        rarity: nft.rarity
      });

      return true;
    } catch (error) {
      console.error('Error equipping NFT:', error);
      return false;
    }
  }

  static async getMarketplaceStats(): Promise<{
    totalListings: number;
    totalSales: number;
    totalVolume: number;
    averagePrice: number;
    topCategories: { category: string; count: number }[];
    recentSales: MarketplaceListing[];
  }> {
    try {
      const listings = await this.getAllListings();
      const soldListings = listings.filter(l => l.status === 'sold');
      
      const totalVolume = soldListings.reduce((sum, l) => sum + l.price, 0);
      const averagePrice = soldListings.length > 0 ? totalVolume / soldListings.length : 0;

      const categoryCount: { [key: string]: number } = {};
      for (const listing of soldListings) {
        const nft = await this.getNFT(listing.nftId);
        if (nft) {
          categoryCount[nft.category] = (categoryCount[nft.category] || 0) + 1;
        }
      }

      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const recentSales = soldListings
        .sort((a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime())
        .slice(0, 10);

      return {
        totalListings: listings.filter(l => l.status === 'active').length,
        totalSales: soldListings.length,
        totalVolume,
        averagePrice,
        topCategories,
        recentSales
      };
    } catch (error) {
      console.error('Error getting marketplace stats:', error);
      return {
        totalListings: 0,
        totalSales: 0,
        totalVolume: 0,
        averagePrice: 0,
        topCategories: [],
        recentSales: []
      };
    }
  }

  private static async saveNFT(nft: NFTItem): Promise<void> {
    const nfts = await this.getAllNFTs();
    const index = nfts.findIndex(n => n.id === nft.id);
    if (index >= 0) {
      nfts[index] = nft;
    } else {
      nfts.push(nft);
    }
    await StorageService.saveUserSettings('nfts', nfts);
  }

  private static async getNFT(nftId: string): Promise<NFTItem | null> {
    const nfts = await this.getAllNFTs();
    return nfts.find(n => n.id === nftId) || null;
  }

  private static async getAllNFTs(): Promise<NFTItem[]> {
    const data = await StorageService.getUserSettings('nfts');
    return Array.isArray(data) ? data.map(nft => ({
      ...nft,
      createdAt: new Date(nft.createdAt)
    })) : [];
  }

  private static async saveListing(listing: MarketplaceListing): Promise<void> {
    const listings = await this.getAllListings();
    const index = listings.findIndex(l => l.id === listing.id);
    if (index >= 0) {
      listings[index] = listing;
    } else {
      listings.push(listing);
    }
    await StorageService.saveUserSettings('marketplace_listings', listings);
  }

  private static async getListing(listingId: string): Promise<MarketplaceListing | null> {
    const listings = await this.getAllListings();
    return listings.find(l => l.id === listingId) || null;
  }

  private static async getAllListings(): Promise<MarketplaceListing[]> {
    const data = await StorageService.getUserSettings('marketplace_listings');
    return Array.isArray(data) ? data.map(listing => ({
      ...listing,
      listedAt: new Date(listing.listedAt),
      expiresAt: listing.expiresAt ? new Date(listing.expiresAt) : undefined
    })) : [];
  }

  private static async savePlayerInventory(inventory: PlayerInventory): Promise<void> {
    await StorageService.saveUserSettings(`inventory_${inventory.userId}`, inventory);
  }

  private static async updatePlayerInventory(userId: string, nft: NFTItem, action: 'add' | 'remove'): Promise<void> {
    const inventory = await this.getPlayerInventory(userId);
    
    if (action === 'add') {
      inventory.nfts.push(nft);
    } else {
      inventory.nfts = inventory.nfts.filter(n => n.id !== nft.id);
      Object.keys(inventory.equippedItems).forEach(key => {
        if (key === 'badges') {
          inventory.equippedItems.badges = inventory.equippedItems.badges.filter(id => id !== nft.id);
        } else if (inventory.equippedItems[key as keyof typeof inventory.equippedItems] === nft.id) {
          delete inventory.equippedItems[key as keyof typeof inventory.equippedItems];
        }
      });
    }

    inventory.totalValue = inventory.nfts.reduce((sum, n) => sum + (n.lastSalePrice || 0), 0);
    inventory.lastUpdated = new Date();

    await this.savePlayerInventory(inventory);
  }
}
