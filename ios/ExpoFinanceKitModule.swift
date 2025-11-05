import ExpoModulesCore
import FinanceKit
import BackgroundTasks
import UserNotifications
import UIKit

public class ExpoFinanceKitModule: Module {
  
  public func definition() -> ModuleDefinition {
    Name("ExpoFinanceKit")

    Constants([
      "isAvailable": self.isFinanceKitAvailable()
    ])

    Events("onAuthorizationStatusChanged", "onTransactionsChanged")
    
    // Set up app lifecycle observers
    OnCreate {
      if #available(iOS 17.4, *) {
        setupAppLifecycleObservers()
      }
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

      let balances = try await fetchBalances()

      var result: [[String: Any?]] = []
      
      for account in accounts {
        let accountId = account.id.uuidString
        if let balance = balances.first(where: { $0["accountId"] as? String == accountId }) {
          var amount = balance["amount"] as? Double ?? 0.0
          
          if let liabilityAccount = account.liabilityAccount,
             let creditLimit = liabilityAccount.creditInformation.creditLimit {
              amount = NSDecimalNumber(decimal: creditLimit.amount).doubleValue - amount
          }
          
          var accountType: String = "unknown"
          if account.assetAccount != nil {
            accountType = "asset"
          } else if account.liabilityAccount != nil {
            accountType = "liability"
          }

          result.append([
            "id": account.id.uuidString,
            "displayName": account.displayName,
            "institutionName": account.institutionName,
            "accountDescription": account.accountDescription,
            "currencyCode": account.currencyCode,
            "accountType": accountType,
            "balance": amount
          ])
        }
      }
      
      return result
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

    AsyncFunction("getBalances") { () -> [[String: Any?]] in
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
    
    // Transaction monitoring functions
    AsyncFunction("startMonitoringTransactions") { (accountIds: [String]?) -> Void in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }

      let authStatus = try await FinanceStore.shared.authorizationStatus()
      guard authStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }
      
      let accountUUIDs = accountIds?.compactMap { UUID(uuidString: $0) } ?? []
      TransactionMonitor.shared.startMonitoring(accountIds: accountUUIDs, module: self)
    }
    
    AsyncFunction("stopMonitoringTransactions") { () -> Void in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }
      
      TransactionMonitor.shared.stopMonitoring()
    }
    
    AsyncFunction("getHistoryToken") { (accountId: String) -> String? in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }
      
      guard let uuid = UUID(uuidString: accountId) else {
        throw FinanceKitError.invalidAccountId
      }
      
      // HistoryToken is not directly serializable, so we return nil
      // The actual token is managed internally by FinanceKit
      return nil
    }
    
    AsyncFunction("clearHistoryToken") { (accountId: String) -> Void in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }
      
      guard let uuid = UUID(uuidString: accountId) else {
        throw FinanceKitError.invalidAccountId
      }
      
      TransactionMonitor.shared.clearHistoryToken(for: uuid)
    }
    
    AsyncFunction("setAppGroupIdentifier") { (identifier: String) -> Void in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }
      
      TransactionMonitor.shared.setAppGroupIdentifier(identifier)
    }
    
    AsyncFunction("processPendingChanges") { () -> Void in
      guard #available(iOS 17.4, *) else {
        throw FinanceKitError.unavailable
      }
      
      TransactionMonitor.shared.processPendingChanges()
    }
  }
  
  @available(iOS 17.4, *)
  private func setupAppLifecycleObservers() {
    // Listen for app becoming active to process pending changes
    NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { _ in
      TransactionMonitor.shared.processPendingChanges()
    }
    
    // Also process on app launch
    DispatchQueue.main.async {
      TransactionMonitor.shared.processPendingChanges()
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
  
  @available(iOS 17.4, *)
  private func fetchBalances() async throws -> [[String: Any?]] {
    let authStatus = try await FinanceStore.shared.authorizationStatus()
    guard authStatus == .authorized else {
      throw FinanceKitError.unauthorized
    }
    
    let query = AccountBalanceQuery()
    let balances = try await FinanceStore.shared.accountBalances(query: query)
    
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

// MARK: - Transaction Monitor

@available(iOS 17.4, *)
class TransactionMonitor {
  static let shared = TransactionMonitor()
  
  private var monitoringTasks: [UUID: Task<Void, Never>] = [:]
  private let userDefaults: UserDefaults = UserDefaults.standard
  private let historyTokenKeyPrefix: String = "FinanceKitHistoryToken_"
  private let backgroundTaskIdentifier: String = "com.expo.financekit.sync"
  private weak var module: ExpoFinanceKitModule?
  private var appGroupIdentifier: String?
  
  private struct TransactionChangePayload {
    var inserted: [Transaction] = []
    var updated: [Transaction] = []
    var deleted: [UUID] = []
  }
  
  private init() {
    setupBackgroundNotificationObserver()
    registerBackgroundTask()
  }
  
  deinit {
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      nil,
      nil
    )
  }
  
  private func setupBackgroundNotificationObserver() {
    // Listen for notifications from the background delivery extension
    let center: CFNotificationCenter? = CFNotificationCenterGetDarwinNotifyCenter()
    let mainBundleId: String = Bundle.main.bundleIdentifier ?? "com.expo.financekit"
    let notificationName: CFString = "\(mainBundleId).dataChanged" as CFString
    
    CFNotificationCenterAddObserver(
      center,
      Unmanaged.passUnretained(self).toOpaque(),
      { (center, observer, name, object, userInfo) in
        // Convert opaque pointer back to TransactionMonitor
        let monitor = Unmanaged<TransactionMonitor>.fromOpaque(observer!).takeUnretainedValue()
        monitor.handleBackgroundDataChange()
      },
      notificationName,
      nil,
      .deliverImmediately
    )
  }
  
  private func handleBackgroundDataChange() {
    // When extension notifies of changes, schedule a background task to sync
    scheduleBackgroundSync()
  }
  
  private func registerBackgroundTask() {
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: backgroundTaskIdentifier,
      using: nil
    ) { task in
      self.handleBackgroundSync(task: task as! BGProcessingTask)
    }
  }
  
  private func scheduleBackgroundSync() {
    let request = BGProcessingTaskRequest(identifier: backgroundTaskIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15) // Run in 15 seconds
    request.requiresNetworkConnectivity = false
    request.requiresExternalPower = false
    
    do {
      try BGTaskScheduler.shared.submit(request)
    } catch {
      print("Failed to schedule background sync: \(error)")
    }
  }
  
  private func handleBackgroundSync(task: BGProcessingTask) {
    // Schedule the next background task before this one expires
    scheduleBackgroundSync()
    
    // Set expiration handler
    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }
    
    // Drain transaction streams for all monitored accounts
    Task {
      await syncAllAccounts()
      task.setTaskCompleted(success: true)
    }
  }
  
  private func syncAllAccounts() async {
    // Get all account IDs we're monitoring
    // If no accounts are being monitored, fetch all accounts
    let accountIds = Array(monitoringTasks.keys)
    
    if accountIds.isEmpty {
      // Fetch all accounts to sync
      do {
        let query = AccountQuery()
        let accounts = try await FinanceStore.shared.accounts(query: query)
        let allAccountIds = accounts.map { $0.id }
        for accountId in allAccountIds {
          await syncAccount(accountId: accountId)
        }
      } catch {
        print("Failed to fetch accounts for background sync: \(error)")
      }
    } else {
      for accountId in accountIds {
        await syncAccount(accountId: accountId)
      }
    }
  }
  
  private func syncAccount(accountId: UUID) async {
    // Get the latest changes from FinanceKit
    let historyToken = getHistoryToken(for: accountId)
    
    do {
      let transactionHistory = try await FinanceStore.shared.transactionHistory(
        forAccountID: accountId,
        since: historyToken,
        isMonitoring: false // Don't monitor, just get current changes
      )
      
      // Process changes
      for try await change in transactionHistory {
        // Map change to payload
        let payload = TransactionChangePayload(
          inserted: change.inserted,
          updated: change.updated,
          deleted: change.deleted
        )
        // Store changes in app group for later processing when app becomes active
        storeChangeForLater(change: payload, accountId: accountId)
      }
    } catch {
      print("Error syncing account \(accountId) in background: \(error)")
    }
  }
  
  private func storeChangeForLater(change: TransactionChangePayload, accountId: UUID) {
    // Store changes in app group shared container
    // These will be processed when the app becomes active
    guard let appGroupURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier ?? "group.\(Bundle.main.bundleIdentifier ?? "com.expo.financekit")"
    ) else {
      return
    }
    
    let changesDir = appGroupURL.appendingPathComponent("pending_changes")
    try? FileManager.default.createDirectory(at: changesDir, withIntermediateDirectories: true)
    
    let changeData = convertTransactionChangeToDict(change: change, accountId: accountId)
    let fileName = "\(accountId.uuidString)_\(Date().timeIntervalSince1970).json"
    let fileURL = changesDir.appendingPathComponent(fileName)
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: changeData) {
      try? jsonData.write(to: fileURL)
    }
  }
  
  func processPendingChanges() {
    // Called when app becomes active to process changes stored during background
    guard let appGroupURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier ?? "group.\(Bundle.main.bundleIdentifier ?? "com.expo.financekit")"
    ) else {
      return
    }
    
    let changesDir = appGroupURL.appendingPathComponent("pending_changes")
    guard let files = try? FileManager.default.contentsOfDirectory(at: changesDir, includingPropertiesForKeys: nil) else {
      return
    }
    
    for fileURL in files where fileURL.pathExtension == "json" {
      if let data = try? Data(contentsOf: fileURL),
         let changeData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        
        // Emit event to JS
        if let module = self.module {
          DispatchQueue.main.async {
            module.sendEvent("onTransactionsChanged", changeData)
          }
        }
        
        // Delete processed file
        try? FileManager.default.removeItem(at: fileURL)
      }
    }
  }
  
  func setAppGroupIdentifier(_ identifier: String) {
    self.appGroupIdentifier = identifier
  }
  
  func startMonitoring(accountIds: [UUID], module: ExpoFinanceKitModule) {
    self.module = module
    
    // Ensure app group identifier is set from module config if available
    // This should be set via setAppGroupIdentifier, but we can also try to infer it
    if appGroupIdentifier == nil {
      // Try to get from app group container
      if let bundleId = Bundle.main.bundleIdentifier {
        let inferredGroupId = "group.\(bundleId)"
        if FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: inferredGroupId) != nil {
          appGroupIdentifier = inferredGroupId
        }
      }
    }
    
    // Stop existing monitoring
    stopMonitoring()
    
    // If no account IDs provided, monitor all accounts
    if accountIds.isEmpty {
      // Start monitoring for all accounts
      Task {
        do {
          let query = AccountQuery()
          let accounts = try await FinanceStore.shared.accounts(query: query)
          let allAccountIds = accounts.map { $0.id }
          startMonitoringForAccounts(allAccountIds)
        } catch {
          print("Failed to fetch accounts for monitoring: \(error)")
        }
      }
    } else {
      startMonitoringForAccounts(accountIds)
    }
  }
  
  private func startMonitoringForAccounts(_ accountIds: [UUID]) {
    for accountId in accountIds {
      let task = Task {
        await monitorAccount(accountId: accountId)
      }
      monitoringTasks[accountId] = task
    }
  }
  
  func stopMonitoring() {
    for (_, task) in monitoringTasks {
      task.cancel()
    }
    monitoringTasks.removeAll()
  }
  
  private func monitorAccount(accountId: UUID) async {
    // Get stored history token or start fresh
    let historyToken = getHistoryToken(for: accountId)
    
    do {
      // Start monitoring from the history token
      let transactionHistory = try await FinanceStore.shared.transactionHistory(
        forAccountID: accountId,
        since: historyToken,
        isMonitoring: true
      )
      
      // Process changes from the async sequence
      for try await change in transactionHistory {
        // Handle cancellation
        if Task.isCancelled {
          break
        }
        
        // Map change to payload
        let payload = TransactionChangePayload(
          inserted: change.inserted,
          updated: change.updated,
          deleted: change.deleted
        )
        let eventData = convertTransactionChangeToDict(change: payload, accountId: accountId)
        
        // Emit event to JS on main thread
        if let module = self.module {
          DispatchQueue.main.async {
            module.sendEvent("onTransactionsChanged", eventData)
          }
        }
      }
    } catch {
      print("Error monitoring transactions for account \(accountId): \(error)")
    }
  }
  
  private func convertTransactionChangeToDict(change: TransactionChangePayload, accountId: UUID) -> [String: Any] {
    var result: [String: Any] = [
      "accountId": accountId.uuidString,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ]
    
    // Convert inserted transactions
    if !change.inserted.isEmpty {
      result["inserted"] = change.inserted.map { convertTransactionToDict($0) }
    }
    
    // Convert updated transactions
    if !change.updated.isEmpty {
      result["updated"] = change.updated.map { convertTransactionToDict($0) }
    }
    
    // Convert deleted transaction IDs
    if !change.deleted.isEmpty {
      result["deleted"] = change.deleted.map { $0.uuidString }
    }
    
    return result
  }
  
  private func convertTransactionToDict(_ transaction: Transaction) -> [String: Any?] {
    return [
      "id": transaction.id.uuidString,
      "accountId": transaction.accountID.uuidString,
      "amount": NSDecimalNumber(decimal: transaction.transactionAmount.amount).doubleValue,
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
  
  // History token management
  // Note: HistoryToken in FinanceKit is opaque and not directly serializable
  // FinanceKit manages the token internally when using transactionHistory(since:isMonitoring:)
  // We store a flag to indicate we've started monitoring, but the actual token
  // is managed by FinanceKit's async sequence
  func getHistoryToken(for accountId: UUID) -> FinanceStore.HistoryToken? {
    // HistoryToken cannot be serialized/deserialized
    // FinanceKit will handle resumption internally when we pass nil
    // Returning nil means start from the beginning or use FinanceKit's internal state
    return nil
  }
  
  func clearHistoryToken(for accountId: UUID) {
    let key = historyTokenKeyPrefix + accountId.uuidString
    userDefaults.removeObject(forKey: key)
  }
  
  private func hasHistoryToken(for accountId: UUID) -> Bool {
    let key = historyTokenKeyPrefix + accountId.uuidString
    return userDefaults.bool(forKey: key)
  }
  
  private func markHistoryTokenExists(for accountId: UUID) {
    let key = historyTokenKeyPrefix + accountId.uuidString
    userDefaults.set(true, forKey: key)
  }
}

