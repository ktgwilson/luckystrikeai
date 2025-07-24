import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import { PaymentService } from '../services/PaymentService';
import { WalletManager } from '../utils/WalletManager';
import { PaymentTransaction, UserPaymentHistory, Wallet, PaymentMethod } from '../types';

interface AccountScreenProps {
  userId: string;
  onBack: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ userId, onBack }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [, ] = useState<UserPaymentHistory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'wallet' | 'history' | 'payments'>('wallet');

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      const [walletData, transactionData, methods] = await Promise.all([
        WalletManager.getWallet(),
        PaymentService.getUserTransactions(userId),
        PaymentService.getAvailablePaymentMethods()
      ]);

      setWallet(walletData);
      setTransactions(transactionData);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading account data:', error);
      Alert.alert('Error', 'Failed to load account data');
    }
  };

  const handleAddFunds = async () => {
    if (!selectedPaymentMethod || !paymentAmount) {
      Alert.alert('Error', 'Please select payment method and enter amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const result = await PaymentService.processPayment(
        amount,
        'USD',
        selectedPaymentMethod,
        userId,
        'Add funds to wallet'
      );

      if (result.success) {
        const tokensToAdd = Math.floor(amount * 10);
        await WalletManager.updateWallet({
          tokens: (wallet?.tokens || 0) + tokensToAdd
        });
        
        Alert.alert('Success', `Added ${tokensToAdd} tokens to your wallet!`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedPaymentMethod('');
        loadAccountData();
      } else {
        Alert.alert('Payment Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Error', 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPaymentMethod || !paymentAmount) {
      Alert.alert('Error', 'Please select payment method and enter amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const paymentMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (paymentMethod?.type === 'crypto' && !cryptoAddress) {
      Alert.alert('Error', 'Please enter crypto wallet address');
      return;
    }

    if (paymentMethod?.type === 'crypto') {
      const isValidAddress = await PaymentService.validateCryptoAddress(cryptoAddress, paymentMethod.id);
      if (!isValidAddress) {
        Alert.alert('Error', 'Invalid crypto wallet address');
        return;
      }
    }

    setLoading(true);
    try {
      const result = await PaymentService.processWithdrawal(
        userId,
        amount,
        selectedPaymentMethod,
        cryptoAddress || undefined
      );

      if (result.success) {
        Alert.alert('Success', 'Withdrawal request submitted successfully!');
        setShowWithdrawModal(false);
        setPaymentAmount('');
        setSelectedPaymentMethod('');
        setCryptoAddress('');
        loadAccountData();
      } else {
        Alert.alert('Withdrawal Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Error', 'Withdrawal processing failed');
    } finally {
      setLoading(false);
    }
  };

  const renderWalletTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>Your Wallet</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Tokens:</Text>
          <Text style={styles.balanceValue}>{wallet?.tokens || 0}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Coins:</Text>
          <Text style={styles.balanceValue}>{wallet?.coins || 0}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Tickets:</Text>
          <Text style={styles.balanceValue}>{wallet?.tickets || 0}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total Winnings:</Text>
          <Text style={styles.balanceValue}>${wallet?.totalWinnings || 0}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Text style={styles.actionButtonText}>Add Funds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.withdrawButton]}
          onPress={() => setShowWithdrawModal(true)}
        >
          <Text style={styles.actionButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet</Text>
      ) : (
        transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionAmount}>
                ${Math.abs(transaction.amount).toFixed(2)}
              </Text>
              <Text style={[
                styles.transactionStatus,
                { color: transaction.status === 'completed' ? COLORS.success : 
                         transaction.status === 'failed' ? COLORS.error : COLORS.warning }
              ]}>
                {transaction.status}
              </Text>
            </View>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>
              {transaction.createdAt.toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderPaymentMethodsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Traditional Payment Methods</Text>
      {PaymentService.getTraditionalPaymentMethods().map((method) => (
        <View key={method.id} style={styles.paymentMethodCard}>
          <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          <Text style={[styles.paymentMethodStatus, { color: COLORS.success }]}>
            Available
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Cryptocurrency</Text>
      {PaymentService.getCryptoPaymentMethods().map((method) => (
        <View key={method.id} style={styles.paymentMethodCard}>
          <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          <Text style={[styles.paymentMethodStatus, { color: COLORS.success }]}>
            Available
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderPaymentModal = () => (
    <Modal visible={showPaymentModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Funds</Text>
          
          <Text style={styles.inputLabel}>Amount (USD)</Text>
          <TextInput
            style={styles.input}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.inputLabel}>Payment Method</Text>
          <ScrollView style={styles.paymentMethodsList}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleAddFunds}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.modalButtonText}>Add Funds</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderWithdrawModal = () => (
    <Modal visible={showWithdrawModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Withdraw Funds</Text>
          
          <Text style={styles.inputLabel}>Amount (USD)</Text>
          <TextInput
            style={styles.input}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.inputLabel}>Withdrawal Method</Text>
          <ScrollView style={styles.paymentMethodsList}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {paymentMethods.find(m => m.id === selectedPaymentMethod)?.type === 'crypto' && (
            <>
              <Text style={styles.inputLabel}>Wallet Address</Text>
              <TextInput
                style={styles.input}
                value={cryptoAddress}
                onChangeText={setCryptoAddress}
                placeholder="Enter your wallet address"
                placeholderTextColor={COLORS.textSecondary}
              />
            </>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowWithdrawModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleWithdraw}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.modalButtonText}>Withdraw</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={[COLORS.background, COLORS.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Account</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.activeTab]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}>
            Wallet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
            Payments
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'wallet' && renderWalletTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'payments' && renderPaymentMethodsTab()}

      {renderPaymentModal()}
      {renderWithdrawModal()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 20,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.background,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  walletCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  walletTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  balanceValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  withdrawButton: {
    backgroundColor: COLORS.secondary,
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  transactionAmount: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transactionDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 5,
  },
  transactionDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  paymentMethodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  paymentMethodName: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  paymentMethodStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  paymentMethodsList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.textSecondary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
