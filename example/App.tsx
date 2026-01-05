import React, { useState } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  SectionList,
  RefreshControl,
} from 'react-native';

import {
  // Hooks
  useAuthorizationStatus,
  useAccounts,
  useRecentTransactions,
  useAccountBalance,
  useTotalBalance,
  
  // Types
  Account,
  Transaction,
  AccountBalance,
  SpendingInsights,
  
  // Functions
  isFinanceKitAvailable,
  generateSpendingInsights,
  calculateTransactionStats,
  groupTransactionsByDate,
  
  // Formatters
  formatCurrency,
  formatDate,
  formatRelativeDate,
  formatAccountName,
  formatMerchantCategory,
  formatBalanceChange,
  
  // Analytics
  findUnusualTransactions,
  calculateSavingsRate,
} from 'expo-finance-kit';

export default function App() {
  const [isAvailable] = useState(isFinanceKitAvailable());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<SpendingInsights | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use the custom hooks
  const { status: authStatus, requestAuthorization, isAuthorized, loading: authLoading } = useAuthorizationStatus();
  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useAccounts();
  const { transactions, loading: transactionsLoading, refetch: refetchTransactions } = useRecentTransactions(100);
  const { balance: selectedBalance, refetch: refetchBalance } = useAccountBalance(selectedAccountId || undefined);
  const { totalBalance, refetch: refetchTotalBalance } = useTotalBalance();

  // Filter transactions for selected account
  const accountTransactions = selectedAccountId
    ? transactions.filter(t => t.accountId === selectedAccountId)
    : transactions;

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const grouped = groupTransactionsByDate(accountTransactions);
    return Array.from(grouped.entries()).map(([date, items]) => ({
      title: date,
      data: items,
    }));
  }, [accountTransactions]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    return calculateTransactionStats(accountTransactions);
  }, [accountTransactions]);

  // Find unusual transactions
  const unusualTransactions = React.useMemo(() => {
    return findUnusualTransactions(accountTransactions);
  }, [accountTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAccounts(),
      refetchTransactions(),
      refetchBalance(),
      refetchTotalBalance(),
    ]);
    setRefreshing(false);
  };

  const handleRequestAuth = async () => {
    try {
      const result = await requestAuthorization();
      if (result.granted) {
        Alert.alert('Success', 'Authorization granted!');
        handleRefresh();
      } else {
        Alert.alert('Denied', 'Authorization was denied');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const generateInsights = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = accountTransactions.filter(
      t => t.transactionDate >= thirtyDaysAgo.getTime()
    );
    
    const newInsights = generateSpendingInsights(recentTransactions, thirtyDaysAgo, now);
    setInsights(newInsights);
    setShowInsights(true);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {item.merchantName || item.transactionDescription}
        </Text>
        <Text style={[
          styles.transactionAmount,
          item.creditDebitIndicator === 'credit' ? styles.creditAmount : styles.debitAmount
        ]}>
          {item.creditDebitIndicator === 'credit' ? '+' : '-'}
          {formatCurrency(Math.abs(item.amount), item.currencyCode)}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDate}>{formatRelativeDate(item.transactionDate)}</Text>
        {item.merchantCategoryCode && (
          <Text style={styles.transactionCategory}>
            {formatMerchantCategory(item.merchantCategoryCode)}
          </Text>
        )}
        <Text style={styles.transactionStatus}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!isAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>FinanceKit Not Available</Text>
          <Text style={styles.subtitle}>This feature requires iOS 17.4 or later</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>Expo Finance Kit Demo</Text>
        
        {/* Authorization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authorization</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.status, { color: isAuthorized ? '#4CAF50' : '#FF9800' }]}>
              {authStatus}
            </Text>
          </View>
          
          {authStatus === 'notDetermined' && (
            <Button 
              title="Request Authorization" 
              onPress={handleRequestAuth}
              disabled={authLoading}
            />
          )}
        </View>

        {isAuthorized && (
          <>          
            {/* Total Balance Section */}
            {totalBalance && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Total Balance</Text>
                <Text style={styles.totalBalance}>
                  {formatCurrency(totalBalance.total, 'USD')}
                </Text>
                <Text style={styles.accountCount}>
                  Across {totalBalance.accounts.length} accounts
                </Text>
              </View>
            )}

            {/* Accounts Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accounts ({accounts.length})</Text>
              {accountsLoading ? (
                <ActivityIndicator />
              ) : (
                accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountItem,
                      selectedAccountId === account.id && styles.selectedAccount
                    ]}
                    onPress={() => setSelectedAccountId(account.id)}
                  >
                    <Text style={styles.accountName}>{formatAccountName(account)}</Text>
                    <Text style={styles.accountInstitution}>{account.institutionName}</Text>
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountType}>{account.accountType}</Text>
                      <Text style={styles.accountCurrency}>{account.currencyCode}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Selected Account Balance */}
            {selectedAccountId && selectedBalance && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Balance</Text>
                <Text style={styles.balance}>
                  {formatCurrency(selectedBalance.amount, selectedBalance.currencyCode)}
                </Text>
              </View>
            )}

            {/* Transaction Statistics */}
            {accountTransactions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Income</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(stats.totalIncome, 'USD')}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Expenses</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(stats.totalExpenses, 'USD')}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg Transaction</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(stats.averageTransaction, 'USD')}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Savings Rate</Text>
                    <Text style={styles.statValue}>
                      {calculateSavingsRate(stats.totalIncome, stats.totalExpenses).toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Button title="View Spending Insights" onPress={generateInsights} />
              </View>
            )}

            {/* Unusual Transactions */}
            {unusualTransactions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Unusual Transactions ({unusualTransactions.length})
                </Text>
                {unusualTransactions.slice(0, 3).map((transaction) => (
                  <View key={transaction.id} style={styles.unusualTransaction}>
                    <Text>{transaction.merchantName || transaction.transactionDescription}</Text>
                    <Text style={styles.unusualAmount}>
                      {formatCurrency(Math.abs(transaction.amount), transaction.currencyCode)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Recent Transactions ({accountTransactions.length})
              </Text>
              {transactionsLoading ? (
                <ActivityIndicator />
              ) : groupedTransactions.length > 0 ? (
                <SectionList
                  sections={groupedTransactions.slice(0, 5)}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTransaction}
                  renderSectionHeader={({ section }) => (
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No transactions found</Text>
              )}
            </View>

            {/* Spending Insights Modal */}
            {showInsights && insights && (
              <View style={styles.insightsModal}>
                <View style={styles.insightsContent}>
                  <Text style={styles.insightsTitle}>Spending Insights</Text>
                  <Text>Total Spent: {formatCurrency(Math.abs(insights.totalSpent), 'USD')}</Text>
                  <Text>Total Income: {formatCurrency(Math.abs(insights.totalIncome), 'USD')}</Text>
                  <Text>Net Cash Flow: {formatCurrency(insights.netCashFlow, 'USD')}</Text>
                  
                  <Text style={styles.insightsSubtitle}>Top Categories</Text>
                  {insights.categoriesBreakdown.slice(0, 5).map((category, index) => (
                    <View key={index} style={styles.categoryItem}>
                      <Text>{category.category}</Text>
                      <Text>{formatCurrency(Math.abs(category.amount), 'USD')} ({category.percentage.toFixed(1)}%)</Text>
                    </View>
                  ))}
                  
                  <Button title="Close" onPress={() => setShowInsights(false)} />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalBalance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  accountCount: {
    fontSize: 14,
    color: '#666',
  },
  accountItem: {
    marginVertical: 5,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAccount: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f2ff',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  accountInstitution: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  accountDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  accountType: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  accountCurrency: {
    fontSize: 12,
    color: '#999',
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  statItem: {
    width: '50%',
    padding: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditAmount: {
    color: '#4CAF50',
  },
  debitAmount: {
    color: '#333',
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  transactionStatus: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f8f8f8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  unusualTransaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unusualAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6347',
  },
  insightsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insightsContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  insightsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  syncStatus: {
    marginTop: 10,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  syncText: {
    fontSize: 14,
    color: '#333',
  },
  syncTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
  },
});