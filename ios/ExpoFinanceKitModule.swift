import ExpoModulesCore
import FinanceKit

public class ExpoFinanceKitModule: Module {
  private var notificationObserver: NSObjectProtocol?
  
  public func definition() -> ModuleDefinition {
    Name("ExpoFinanceKit")

    Constants([
      "isAvailable": self.isFinanceKitAvailable()
    ])

    Events("onAuthorizationStatusChanged", "onFinanceDataChanged")
    
    OnCreate {
      self.setupBackgroundNotificationObserver()
    }
    
    OnDestroy {
      self.removeBackgroundNotificationObserver()
    }

    AsyncFunction("requestAuthorization") { () -> Bool in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let status = try await FinanceStore.shared.requestAuthorization()
      return status == .authorized
    }

    AsyncFunction("getAuthorizationStatus") { () async throws -> String in
      guard #available(iOS 17.4, *) else {
        return "unavailable"
      }

      let status = try await FinanceStore.shared.authorizationStatus()
      return convertAuthorizationStatusToString(status)
    }
    
    AsyncFunction("getLastSyncInfo") { () -> [String: Any?] in
      // Get app group identifier from bundle
      let bundleId = Bundle.main.bundleIdentifier ?? "com.expo.financekit"
      let appGroupId = "group.\(bundleId)"
      
      guard let appGroupURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroupId
      ) else {
        return [:]
      }
      
      var syncInfo: [String: Any?] = [:]
      
      let syncKeys = ["last_sync_accounts", "last_sync_transactions", "last_sync_balances"]
      
      for key in syncKeys {
        let fileURL = appGroupURL.appendingPathComponent("\(key).json")
        
        if let data = try? Data(contentsOf: fileURL),
           let json = try? JSONSerialization.jsonObject(with: data) {
          syncInfo[key] = json
        }
      }
      
      return syncInfo
    }

    AsyncFunction("getAccounts") { () -> [[String: Any?]] in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let authStatus = try await FinanceStore.shared.authorizationStatus()
      guard authStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }

      let query = AccountQuery()
      let accounts = try await FinanceStore.shared.accounts(query: query)
      return accounts.map { account in
        var accountType: String = "unknown"
        if account.assetAccount != nil {
          accountType = "asset"
        } else if account.liabilityAccount != nil {
          accountType = "liability"
        }

        return [
          "id": account.id.uuidString,
          "displayName": account.displayName,
          "institutionName": account.institutionName,
          "accountDescription": account.accountDescription,
          "currencyCode": account.currencyCode,
          "accountType": accountType
        ]
      }
    }

    AsyncFunction("getTransactions") {
      (accountId: String?, startDate: Double?, endDate: Double?) -> [[String: Any?]] in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let authStatus = try await FinanceStore.shared.authorizationStatus()
      guard authStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }

      // Build predicate
      let startDate = startDate != nil ? Date(timeIntervalSince1970: startDate! / 1000) : nil
      let endDate = endDate != nil ? Date(timeIntervalSince1970: endDate! / 1000) : nil

      var predicate: Predicate<Transaction>?

      if let accountIdString = accountId,
        let uuid = UUID(uuidString: accountIdString)
      {
        if let start = startDate, let end = endDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.accountID == uuid && transaction.transactionDate >= start
              && transaction.transactionDate <= end
          }
        } else if let start = startDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.accountID == uuid && transaction.transactionDate >= start
          }
        } else if let end = endDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.accountID == uuid && transaction.transactionDate <= end
          }
        } else {
          predicate = #Predicate<Transaction> { transaction in
            transaction.accountID == uuid
          }
        }
      } else {
        if let start = startDate, let end = endDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.transactionDate >= start && transaction.transactionDate <= end
          }
        } else if let start = startDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.transactionDate >= start
          }
        } else if let end = endDate {
          predicate = #Predicate<Transaction> { transaction in
            transaction.transactionDate <= end
          }
        }
      }

      // Create query with predicate
      let query = TransactionQuery(
        sortDescriptors: [SortDescriptor(\Transaction.transactionDate, order: .reverse)],
        predicate: predicate,
        limit: nil,
        offset: nil
      )

      let transactions = try await FinanceStore.shared.transactions(query: query)
      return transactions.map { transaction in
        return [
          "id": transaction.id.uuidString,
          "accountId": transaction.accountID.uuidString,
          "amount": transaction.transactionAmount.amount,
          "currencyCode": transaction.transactionAmount.currencyCode,
          "transactionDate": transaction.transactionDate.timeIntervalSince1970 * 1000,
          "merchantName": transaction.merchantName,
          "transactionDescription": transaction.transactionDescription,
          "merchantCategoryCode": transaction.merchantCategoryCode?.rawValue,
          "status": convertTransactionStatusToString(transaction.status),
          "transactionType": convertTransactionTypeToString(transaction.transactionType),
          "creditDebitIndicator": transaction.creditDebitIndicator.rawValue,
        ]
      }
    }

    AsyncFunction("getBalance") { () -> [[String: Any?]] in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let authStatus = try await FinanceStore.shared.authorizationStatus()
      guard authStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }

      // Simply get all account balances - FinanceKit returns current balances
      let query = AccountBalanceQuery()
      let balances = try await FinanceStore.shared.accountBalances(query: query)
      
      // FinanceKit should return only current balances, but let's deduplicate by account ID just in case
      var uniqueBalances: [String: AccountBalance] = [:]
      for balance in balances {
        let accountIdString = balance.accountID.uuidString
        uniqueBalances[accountIdString] = balance
      }

      return uniqueBalances.values.map { balance in
        var amount: Decimal = 0.0
        
        switch balance.currentBalance {
        case .available(let availableBalance):
          amount = availableBalance.amount.amount
        case .booked(let bookedBalance):
          amount = bookedBalance.amount.amount
        case .availableAndBooked(let availableBalance, _):
          amount = availableBalance.amount.amount
        }
        
        return [
          "id": balance.id.uuidString,
          "amount": NSDecimalNumber(decimal: amount).doubleValue,
          "currencyCode": balance.currencyCode,
          "accountId": balance.accountID.uuidString,
        ]
      }
    }
    
    AsyncFunction("getBalanceForAccount") { (accountId: String) -> [String: Any?]? in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let authStatus = try await FinanceStore.shared.authorizationStatus()
      guard authStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }
      
      guard let uuid = UUID(uuidString: accountId) else {
        throw FinanceKitError.invalidAccountId
      }

      // Query for balance of specific account
      let predicate = #Predicate<AccountBalance> { balance in
        balance.accountID == uuid
      }
      
      let query = AccountBalanceQuery(
        sortDescriptors: [],
        predicate: predicate,
        limit: 1,
        offset: nil
      )

      let balances = try await FinanceStore.shared.accountBalances(query: query)
      
      guard let balance = balances.first else {
        return nil
      }
      
      var amount: Decimal = 0.0
      
      switch balance.currentBalance {
      case .available(let availableBalance):
        amount = availableBalance.amount.amount
      case .booked(let bookedBalance):
        amount = bookedBalance.amount.amount
      case .availableAndBooked(let availableBalance, _):
        amount = availableBalance.amount.amount
      }
      
      return [
        "id": balance.id.uuidString,
        "amount": NSDecimalNumber(decimal: amount).doubleValue,
        "currencyCode": balance.currencyCode,
        "accountId": balance.accountID.uuidString,
      ]
    }
  }

  private func isFinanceKitAvailable() -> Bool {
    if #available(iOS 17.4, *) {
      return FinanceStore.isDataAvailable(.financialData)
    }
    return false
  }

  private func convertAuthorizationStatusToString(_ status: AuthorizationStatus) -> String {
    switch status {
    case .notDetermined:
      return "notDetermined"
    case .denied:
      return "denied"
    case .authorized:
      return "authorized"
    @unknown default:
      return "unknown"
    }
  }

  private func convertTransactionStatusToString(_ status: TransactionStatus) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .booked:
      return "booked"
    case .pending:
      return "pending"
    case .rejected:
      return "rejected"
    @unknown default:
      return "unknown"
    }
  }

  private func convertTransactionTypeToString(_ type: TransactionType) -> String {
    switch type {
    case .adjustment:
      return "adjustment"
    case .atm:
      return "atm"
    case .billPayment:
      return "billPayment"
    case .check:
      return "check"
    case .deposit:
      return "deposit"
    case .directDebit:
      return "directDebit"
    case .directDeposit:
      return "directDeposit"
    case .dividend:
      return "dividend"
    case .fee:
      return "fee"
    case .interest:
      return "interest"
    case .loan:
      return "loan"
    case .pointOfSale:
      return "pointOfSale"
    case .refund:
      return "refund"
    case .standingOrder:
      return "standingOrder"
    case .transfer:
      return "transfer"
    case .unknown:
      return "unknown"
    case .withdrawal:
      return "withdrawal"
    @unknown default:
      return "unknown"
    }
  }
  
  private func setupBackgroundNotificationObserver() {
    let bundleId = Bundle.main.bundleIdentifier ?? "com.expo.financekit"
    let notificationName = "\(bundleId).dataChanged" as CFString
    let darwinCenter = CFNotificationCenterGetDarwinNotifyCenter()
    
    CFNotificationCenterAddObserver(
      darwinCenter,
      Unmanaged.passUnretained(self).toOpaque(),
      { center, observer, name, object, userInfo in
        guard let observer = observer else { return }
        let module = Unmanaged<ExpoFinanceKitModule>.fromOpaque(observer).takeUnretainedValue()
        module.handleFinanceDataChanged()
      },
      notificationName,
      nil,
      .deliverImmediately
    )
  }
  
  private func removeBackgroundNotificationObserver() {
    let bundleId = Bundle.main.bundleIdentifier ?? "com.expo.financekit"
    let notificationName = "\(bundleId).dataChanged" as CFString
    let darwinCenter = CFNotificationCenterGetDarwinNotifyCenter()
    
    CFNotificationCenterRemoveObserver(
      darwinCenter,
      Unmanaged.passUnretained(self).toOpaque(),
      notificationName,
      nil
    )
  }
  
  private func handleFinanceDataChanged() {
    DispatchQueue.main.async {
      self.sendEvent("onFinanceDataChanged", [
        "timestamp": Date().timeIntervalSince1970,
        "source": "background_extension"
      ])
    }
  }
}

enum FinanceKitError: Error {
  case unavailable
  case unauthorized
  case invalidAccountId
  case accountNotFound
}

extension FinanceKitError: CustomStringConvertible {
  var description: String {
    switch self {
    case .unavailable:
      return "FinanceKit is not available on this device"
    case .unauthorized:
      return "FinanceKit authorization has not been granted"
    case .invalidAccountId:
      return "Invalid account ID provided"
    case .accountNotFound:
      return "Account not found"
    }
  }
}
