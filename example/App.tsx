import { useState, useEffect } from 'react';
import { Button, StyleSheet, Text, View, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';

import ExpoFinanceKit, { 
  Account, 
  Transaction, 
  Balance,
  AuthorizationStatus 
} from 'expo-finance-kit';
import React from 'react';

export default function App() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthorizationStatus>('notDetermined');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Safely check if module is available first
    const moduleAvailable = ExpoFinanceKit?.isAvailable ?? false;
    setIsAvailable(moduleAvailable);
    if (moduleAvailable) {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await ExpoFinanceKit.getAuthorizationStatus();
      setAuthStatus(status);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const requestAuthorization = async () => {
    try {
      setLoading(true);
      const granted = await ExpoFinanceKit.requestAuthorization();
      if (granted) {
        await checkAuthStatus();
        Alert.alert('Success', 'Authorization granted!');
      } else {
        Alert.alert('Denied', 'Authorization was denied');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountList = await ExpoFinanceKit.getAccounts();
      setAccounts(accountList);
      if (accountList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountList[0].id);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      const transactionList = await ExpoFinanceKit.getTransactions(
        selectedAccountId || undefined,
        thirtyDaysAgo,
        now
      );
      setTransactions(transactionList);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account first');
      return;
    }

    try {
      setLoading(true);
      const accountBalance = await ExpoFinanceKit.getBalance(selectedAccountId);
      setBalance(accountBalance);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>FinanceKit Example</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authorization Status</Text>
          <Text style={styles.status}>{authStatus}</Text>
          
          {authStatus === 'notDetermined' && (
            <Button 
              title="Request Authorization" 
              onPress={requestAuthorization}
              disabled={loading}
            />
          )}
        </View>

        {authStatus === 'authorized' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accounts</Text>
              <Button 
                title="Load Accounts" 
                onPress={loadAccounts}
                disabled={loading}
              />
              {accounts.map((account) => (
                <View key={account.id} style={styles.accountItem}>
                  <Text style={styles.accountName}>{account.displayName}</Text>
                  <Text>{account.institutionName}</Text>
                  <Text>Type: {account.type}</Text>
                  <Button
                    title="Select"
                    onPress={() => setSelectedAccountId(account.id)}
                    disabled={selectedAccountId === account.id}
                  />
                </View>
              ))}
            </View>

            {selectedAccountId && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Balance</Text>
                  <Button 
                    title="Load Balance" 
                    onPress={loadBalance}
                    disabled={loading}
                  />
                  {balance && (
                    <View style={styles.balanceItem}>
                      <Text>Available: {balance.currency} {balance.available.toFixed(2)}</Text>
                      <Text>Current: {balance.currency} {balance.current.toFixed(2)}</Text>
                      <Text>As of: {new Date(balance.asOfDate).toLocaleDateString()}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Transactions (Last 30 days)</Text>
                  <Button 
                    title="Load Transactions" 
                    onPress={loadTransactions}
                    disabled={loading}
                  />
                  {transactions.map((transaction) => (
                    <View key={transaction.id} style={styles.transactionItem}>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      <Text>{transaction.type}: {transaction.currency} {Math.abs(transaction.amount).toFixed(2)}</Text>
                      <Text>Date: {new Date(transaction.date).toLocaleDateString()}</Text>
                      <Text>Status: {transaction.status}</Text>
                      {transaction.category && <Text>Category: {transaction.category}</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {loading && <ActivityIndicator style={styles.loader} />}
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 10,
  },
  accountItem: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceItem: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  transactionItem: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
});