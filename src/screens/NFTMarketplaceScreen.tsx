import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NFTMarketplaceService } from '../services/NFTMarketplaceService';
import { AnalyticsService } from '../services/AnalyticsService';
import { NFTItem, MarketplaceListing, PlayerInventory } from '../types';
import { COLORS } from '../constants';

interface NFTMarketplaceScreenProps {
  onBackPress: () => void;
  userId: string;
}

export const NFTMarketplaceScreen: React.FC<NFTMarketplaceScreenProps> = ({ 
  onBackPress, 
  userId 
}) => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'inventory'>('marketplace');
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'skin' | 'theme' | 'avatar' | 'badge'>('all');
  const [selectedRarity, setSelectedRarity] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMarketplaceData();
    loadInventory();
  }, []);

  const loadMarketplaceData = async () => {
    try {
      const mockNFTs: NFTItem[] = [
        {
          id: 'nft_1',
          tokenId: '1001',
          contractAddress: '0x123...abc',
          name: 'Aurora Mystic Skin',
          description: 'A rare skin with northern lights effects',
          image: 'https://via.placeholder.com/200x200/4A90E2/FFFFFF?text=Aurora+Skin',
          rarity: 'rare',
          category: 'skin',
          attributes: [
            { trait_type: 'Theme', value: 'Aurora Fortune' },
            { trait_type: 'Effect', value: 'Glowing' },
            { trait_type: 'Rarity Score', value: 85 }
          ],
          creator: 'LuckyStrike',
          owner: 'seller_1',
          price: 150,
          currency: 'tokens',
          isForSale: true,
          createdAt: new Date(),
          lastSalePrice: 120
        },
        {
          id: 'nft_2',
          tokenId: '1002',
          contractAddress: '0x456...def',
          name: 'Galactic Avatar',
          description: 'A legendary space-themed avatar with cosmic effects',
          image: 'https://via.placeholder.com/200x200/9B59B6/FFFFFF?text=Galactic+Avatar',
          rarity: 'legendary',
          category: 'avatar',
          attributes: [
            { trait_type: 'Theme', value: 'Galactic Gold Rush' },
            { trait_type: 'Animation', value: 'Cosmic Glow' },
            { trait_type: 'Rarity Score', value: 95 }
          ],
          creator: 'LuckyStrike',
          owner: 'seller_2',
          price: 500,
          currency: 'tokens',
          isForSale: true,
          createdAt: new Date(),
          lastSalePrice: 400
        },
        {
          id: 'nft_3',
          tokenId: '1003',
          contractAddress: '0x789...ghi',
          name: 'Pixel Badge Collection',
          description: 'Retro pixel art badge with animated effects',
          image: 'https://via.placeholder.com/200x200/E74C3C/FFFFFF?text=Pixel+Badge',
          rarity: 'epic',
          category: 'badge',
          attributes: [
            { trait_type: 'Theme', value: 'Pixel Payout' },
            { trait_type: 'Style', value: '8-bit' },
            { trait_type: 'Rarity Score', value: 78 }
          ],
          creator: 'PixelArtist',
          owner: userId,
          isForSale: false,
          createdAt: new Date()
        }
      ];

      setNfts(mockNFTs);

      const mockListings: MarketplaceListing[] = [
        {
          id: 'listing_1',
          nftId: 'nft_1',
          sellerId: 'seller_1',
          price: 150,
          currency: 'tokens',
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'listing_2',
          nftId: 'nft_2',
          sellerId: 'seller_2',
          price: 500,
          currency: 'tokens',
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'active'
        }
      ];

      setListings(mockListings);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const userInventory = await NFTMarketplaceService.getPlayerInventory(userId);
      setInventory(userInventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const handleBuyNFT = async (nftId: string) => {
    const listing = listings.find(l => l.nftId === nftId && l.status === 'active');
    if (!listing) {
      Alert.alert('Error', 'NFT is not available for purchase');
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Buy this NFT for ${listing.price} ${listing.currency}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await NFTMarketplaceService.buyNFT(listing.id, userId);
              
              if (success) {
                await AnalyticsService.trackEvent('nft_purchased_ui', {
                  nftId,
                  price: listing.price,
                  currency: listing.currency
                });
                
                loadMarketplaceData();
                loadInventory();
                Alert.alert('Success', 'NFT purchased successfully!');
              } else {
                Alert.alert('Error', 'Failed to purchase NFT');
              }
            } catch (error) {
              console.error('Error buying NFT:', error);
              Alert.alert('Error', 'Failed to purchase NFT');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSellNFT = async (nftId: string) => {
    Alert.prompt(
      'Sell NFT',
      'Enter price in tokens:',
      async (priceText) => {
        const price = parseInt(priceText || '0');
        if (price <= 0) {
          Alert.alert('Error', 'Please enter a valid price');
          return;
        }

        setLoading(true);
        try {
          const listing = await NFTMarketplaceService.listNFTForSale(
            nftId,
            userId,
            price,
            'tokens'
          );
          
          if (listing) {
            await AnalyticsService.trackEvent('nft_listed_ui', {
              nftId,
              price,
              currency: 'tokens'
            });
            
            loadMarketplaceData();
            loadInventory();
            Alert.alert('Success', 'NFT listed for sale!');
          } else {
            Alert.alert('Error', 'Failed to list NFT for sale');
          }
        } catch (error) {
          console.error('Error selling NFT:', error);
          Alert.alert('Error', 'Failed to list NFT for sale');
        } finally {
          setLoading(false);
        }
      },
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleEquipNFT = async (nftId: string) => {
    setLoading(true);
    try {
      const success = await NFTMarketplaceService.equipNFT(userId, nftId);
      
      if (success) {
        await AnalyticsService.trackEvent('nft_equipped_ui', {
          nftId,
          userId
        });
        
        loadInventory();
        Alert.alert('Success', 'NFT equipped!');
      } else {
        Alert.alert('Error', 'Failed to equip NFT');
      }
    } catch (error) {
      console.error('Error equipping NFT:', error);
      Alert.alert('Error', 'Failed to equip NFT');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredNFTs = () => {
    let filtered = nfts;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(nft => nft.category === selectedCategory);
    }

    if (selectedRarity !== 'all') {
      filtered = filtered.filter(nft => nft.rarity === selectedRarity);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(nft => 
        nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#95A5A6';
      case 'rare': return '#3498DB';
      case 'epic': return '#9B59B6';
      case 'legendary': return '#F39C12';
      default: return COLORS.textSecondary;
    }
  };

  const renderNFT = ({ item }: { item: NFTItem }) => {
    const isOwned = item.owner === userId;
    const listing = listings.find(l => l.nftId === item.id && l.status === 'active');
    const isEquipped = inventory?.equippedItems.badges?.includes(item.id) ||
                     inventory?.equippedItems[item.category as keyof typeof inventory.equippedItems] === item.id;

    return (
      <View style={styles.nftCard}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.background]}
          style={styles.nftGradient}
        >
          <View style={styles.nftImageContainer}>
            <Image source={{ uri: item.image }} style={styles.nftImage} />
            <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
              <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
            </View>
            {isEquipped && (
              <View style={styles.equippedBadge}>
                <Text style={styles.equippedText}>EQUIPPED</Text>
              </View>
            )}
          </View>

          <View style={styles.nftInfo}>
            <Text style={styles.nftName}>{item.name}</Text>
            <Text style={styles.nftDescription} numberOfLines={2}>
              {item.description}
            </Text>
            
            <View style={styles.nftAttributes}>
              {item.attributes.slice(0, 2).map((attr, index) => (
                <View key={index} style={styles.attributeChip}>
                  <Text style={styles.attributeText}>
                    {attr.trait_type}: {attr.value}
                  </Text>
                </View>
              ))}
            </View>

            {item.isForSale && listing && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  {listing.price} {listing.currency.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.nftActions}>
            {!isOwned && item.isForSale && (
              <TouchableOpacity
                style={[styles.actionButton, styles.buyButton]}
                onPress={() => handleBuyNFT(item.id)}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Buy</Text>
              </TouchableOpacity>
            )}

            {isOwned && !item.isForSale && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.sellButton]}
                  onPress={() => handleSellNFT(item.id)}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>Sell</Text>
                </TouchableOpacity>
                
                {!isEquipped && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.equipButton]}
                    onPress={() => handleEquipNFT(item.id)}
                    disabled={loading}
                  >
                    <Text style={styles.actionButtonText}>Equip</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {isOwned && item.isForSale && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  Alert.alert('Info', 'Cancel listing feature would be implemented here');
                }}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Cancel Sale</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const categories = ['all', 'skin', 'theme', 'avatar', 'badge'];
  const rarities = ['all', 'common', 'rare', 'epic', 'legendary'];

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>NFT Marketplace</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'marketplace' && styles.activeTab]}
          onPress={() => setActiveTab('marketplace')}
        >
          <Text style={[styles.tabText, activeTab === 'marketplace' && styles.activeTabText]}>
            Marketplace
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            My Inventory ({inventory?.nfts.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search NFTs..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item && styles.selectedFilter
              ]}
              onPress={() => setSelectedCategory(item as any)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === item && styles.selectedFilterText
              ]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />

        <FlatList
          horizontal
          data={rarities}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedRarity === item && styles.selectedFilter
              ]}
              onPress={() => setSelectedRarity(item as any)}
            >
              <Text style={[
                styles.filterText,
                selectedRarity === item && styles.selectedFilterText
              ]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />
      </View>

      <FlatList
        data={activeTab === 'marketplace' ? getFilteredNFTs().filter(nft => nft.isForSale) : 
              inventory?.nfts || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNFT}
        numColumns={2}
        contentContainerStyle={styles.nftsList}
        refreshing={loading}
        onRefresh={() => {
          loadMarketplaceData();
          loadInventory();
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'marketplace' ? 'No NFTs for sale' : 'No NFTs in inventory'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'marketplace' ? 'Check back later!' : 'Purchase some from the marketplace!'}
            </Text>
          </View>
        }
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 60,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterList: {
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  selectedFilter: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedFilterText: {
    color: COLORS.background,
  },
  nftsList: {
    padding: 20,
  },
  nftCard: {
    flex: 1,
    margin: 5,
    borderRadius: 15,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  nftGradient: {
    padding: 15,
  },
  nftImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  nftImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  equippedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  equippedText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  nftInfo: {
    marginBottom: 15,
  },
  nftName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  nftDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  nftAttributes: {
    marginBottom: 10,
  },
  attributeChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  attributeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  priceText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  nftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  buyButton: {
    backgroundColor: COLORS.success,
  },
  sellButton: {
    backgroundColor: COLORS.warning,
  },
  equipButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: COLORS.background,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
