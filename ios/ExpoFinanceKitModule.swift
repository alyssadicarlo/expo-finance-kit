import ExpoModulesCore
import FinanceKit

public class ExpoFinanceKitModule: Module {
  private var financeStore: FinanceStore?
  
  public func definition() -> ModuleDefinition {
    Name("ExpoFinanceKit")

    Constants([
      "isAvailable": isFinanceKitAvailable()
    ])

    Events("onAuthorizationStatusChanged")

    OnCreate {
      if #available(iOS 17.4, *) {
        self.financeStore = FinanceStore()
      }
    }
    
    AsyncFunction("requestAuthorization") { () -> Bool in
      guard #available(iOS 17.4, *),
            let store = self.financeStore else {
        throw FinanceKitError.unavailable
      }
      
      return try await store.requestAuthorization()
    }
    
    AsyncFunction("getAuthorizationStatus") { () -> String in
      guard #available(iOS 17.4, *),
            let store = self.financeStore else {
        return "unavailable"
      }
      
      let status = store.authorizationStatus
      return authorizationStatusToString(status)
    }
    
    AsyncFunction("getAccounts") { () -> [[String: Any?]] in
      guard #available(iOS 17.4, *),
            let store = self.financeStore else {
        throw FinanceKitError.unavailable
      }
      
      guard store.authorizationStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }
      
      let accounts = try await store.accounts()
      return accounts.map { account in
        return [
          "id": account.id.uuidString,
          "displayName": account.displayName,
          "institutionName": account.institutionName,
          "type": accountTypeToString(account.type),
          "currency": account.currencyCode
        ]
      }
    }
    
    AsyncFunction("getTransactions") { (accountId: String?, startDate: Double?, endDate: Double?) -> [[String: Any?]] in
      guard #available(iOS 17.4, *),
            let store = self.financeStore else {
        throw FinanceKitError.unavailable
      }
      
      guard store.authorizationStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }
      
      var query = TransactionQuery()
      
      if let accountIdString = accountId,
         let uuid = UUID(uuidString: accountIdString) {
        query.accountIdentifiers = [uuid]
      }
      
      if let start = startDate {
        query.dateInterval.start = Date(timeIntervalSince1970: start / 1000)
      }
      
      if let end = endDate {
        query.dateInterval.end = Date(timeIntervalSince1970: end / 1000)
      }
      
      let transactions = try await store.transactions(query: query)
      return transactions.map { transaction in
        return [
          "id": transaction.id.uuidString,
          "accountId": transaction.accountIdentifier.uuidString,
          "amount": transaction.amount,
          "currency": transaction.currencyCode,
          "date": transaction.transactionDate.timeIntervalSince1970 * 1000,
          "description": transaction.merchantName ?? transaction.transactionDescription,
          "category": transactionCategoryToString(transaction.category),
          "status": transactionStatusToString(transaction.status),
          "type": transactionTypeToString(transaction.transactionType)
        ]
      }
    }
    
    AsyncFunction("getBalance") { (accountId: String) -> [String: Any?] in
      guard #available(iOS 17.4, *),
            let store = self.financeStore else {
        throw FinanceKitError.unavailable
      }
      
      guard store.authorizationStatus == .authorized else {
        throw FinanceKitError.unauthorized
      }
      
      guard let uuid = UUID(uuidString: accountId) else {
        throw FinanceKitError.invalidAccountId
      }
      
      let balances = try await store.accountBalances(accountIdentifiers: [uuid])
      guard let balance = balances.first else {
        throw FinanceKitError.accountNotFound
      }
      
      return [
        "accountId": balance.accountIdentifier.uuidString,
        "available": balance.available,
        "current": balance.current,
        "currency": balance.currencyCode,
        "asOfDate": balance.asOfDate.timeIntervalSince1970 * 1000
      ]
    }
  }
  
  private func isFinanceKitAvailable() -> Bool {
    if #available(iOS 17.4, *) {
      return FinanceStore.isDataAvailable(.financialData)
    }
    return false
  }
  
  private func authorizationStatusToString(_ status: FinanceStore.AuthorizationStatus) -> String {
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
  
  private func accountTypeToString(_ type: Account.AccountType) -> String {
    switch type {
    case .asset:
      return "asset"
    case .liability:
      return "liability"
    @unknown default:
      return "unknown"
    }
  }
  
  private func transactionCategoryToString(_ category: Transaction.Category?) -> String? {
    guard let category = category else { return nil }
    
    switch category {
    case .automotive:
      return "automotive"
    case .billsAndUtilities:
      return "billsAndUtilities"
    case .cashAndChecks:
      return "cashAndChecks"
    case .dining:
      return "dining"
    case .education:
      return "education"
    case .entertainment:
      return "entertainment"
    case .feesAndAdjustments:
      return "feesAndAdjustments"
    case .financialServices:
      return "financialServices"
    case .food:
      return "food"
    case .gifts:
      return "gifts"
    case .groceries:
      return "groceries"
    case .health:
      return "health"
    case .home:
      return "home"
    case .income:
      return "income"
    case .other:
      return "other"
    case .personalCare:
      return "personalCare"
    case .shopping:
      return "shopping"
    case .transfer:
      return "transfer"
    case .transportation:
      return "transportation"
    case .travel:
      return "travel"
    @unknown default:
      return "unknown"
    }
  }
  
  private func transactionStatusToString(_ status: Transaction.Status) -> String {
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
  
  private func transactionTypeToString(_ type: Transaction.TransactionType) -> String {
    switch type {
    case .credit:
      return "credit"
    case .debit:
      return "debit"
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
