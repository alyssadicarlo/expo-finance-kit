package expo.modules.financekit

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoFinanceKitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoFinanceKit")

    Constants(
      "isAvailable" to false
    )

    Events("onAuthorizationStatusChanged")

    AsyncFunction("requestAuthorization") { promise: Promise ->
      promise.reject("UNAVAILABLE", "FinanceKit is not available on Android", null)
    }

    AsyncFunction("getAuthorizationStatus") { promise: Promise ->
      promise.resolve("unavailable")
    }

    AsyncFunction("getAccounts") { promise: Promise ->
      promise.reject("UNAVAILABLE", "FinanceKit is not available on Android", null)
    }

    AsyncFunction("getTransactions") { accountId: String?, startDate: Double?, endDate: Double?, promise: Promise ->
      promise.reject("UNAVAILABLE", "FinanceKit is not available on Android", null)
    }

    AsyncFunction("getBalance") { accountId: String, promise: Promise ->
      promise.reject("UNAVAILABLE", "FinanceKit is not available on Android", null)
    }
  }
}
