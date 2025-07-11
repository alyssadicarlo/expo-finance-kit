import FinanceKit
import BackgroundTasks
import os.log

@available(iOS 17.4, *)
class BackgroundDeliveryExtension: NSObject {
    
    private let logger: Logger
    
    override init() {
        // Use dynamic bundle identifier for logger
        let bundleId = Bundle.main.bundleIdentifier ?? "com.expo.financekit"
        self.logger = Logger(subsystem: bundleId, category: "BackgroundDelivery")
        super.init()
        logger.info("BackgroundDeliveryExtension initialized")
    }
}

@available(iOS 17.4, *)
extension BackgroundDeliveryExtension: FinanceStoreDataExtension {
    
    func financeStoreDidChange() async {
        logger.info("Received finance store change notification")
        
        await handleFinanceDataUpdate()
        await notifyMainApp()
    }
    
    private func handleFinanceDataUpdate() async {
        do {
            let store = FinanceStore.shared
            
            await updateSharedAccountData(store: store)
            await updateSharedTransactionData(store: store)
            await updateSharedBalanceData(store: store)
            
        } catch {
            logger.error("Error handling finance data update: \(error.localizedDescription)")
        }
    }
    
    private func updateSharedAccountData(store: FinanceStore) async {
        guard await store.authorizationStatus() == .authorized else {
            logger.warning("Not authorized to access finance data")
            return
        }
        
        logger.info("Updating shared account data")
        
        await storeSharedData(key: "last_sync_accounts", data: Date())
    }
    
    private func updateSharedTransactionData(store: FinanceStore) async {
        guard await store.authorizationStatus() == .authorized else {
            logger.warning("Not authorized to access finance data")
            return
        }
        
        logger.info("Updating shared transaction data")
        
        let syncInfo = TransactionSyncInfo(
            lastSyncDate: Date(),
            changeType: "background_update"
        )
        
        await storeSharedData(key: "last_sync_transactions", data: syncInfo)
    }
    
    private func updateSharedBalanceData(store: FinanceStore) async {
        guard await store.authorizationStatus() == .authorized else {
            logger.warning("Not authorized to access finance data")
            return
        }
        
        logger.info("Updating shared balance data")
        
        await storeSharedData(key: "last_sync_balances", data: Date())
    }
    
    private func storeSharedData<T: Codable>(key: String, data: T) async {
        // Get app group identifier from main app bundle
        let mainBundleId = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".background-extension", with: "") ?? "com.expo.financekit"
        let appGroupId = "group.\(mainBundleId)"
        
        guard let appGroupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            logger.error("Failed to get app group container URL for: \(appGroupId)")
            return
        }
        
        let fileURL = appGroupURL.appendingPathComponent("\(key).json")
        
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let jsonData = try encoder.encode(data)
            
            try jsonData.write(to: fileURL)
            logger.info("Successfully stored shared data for key: \(key)")
            
        } catch {
            logger.error("Failed to store shared data: \(error.localizedDescription)")
        }
    }
    
    private func notifyMainApp() async {
        let mainBundleId = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".background-extension", with: "") ?? "com.expo.financekit"
        let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
        let notificationName = "\(mainBundleId).dataChanged" as CFString
        
        CFNotificationCenterPostNotification(
            notificationCenter,
            CFNotificationName(notificationName),
            nil,
            nil,
            true
        )
        
        logger.info("Posted notification to main app")
    }
}

struct TransactionSyncInfo: Codable {
    let lastSyncDate: Date
    let changeType: String
}