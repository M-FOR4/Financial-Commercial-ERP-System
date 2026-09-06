import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/accounting/Accounts';
import { JournalEntries } from './pages/accounting/JournalEntries';
import { Products } from './pages/inventory/Products';
import { StockMovements } from './pages/inventory/StockMovements';
import { Customers } from './pages/sales/Customers';
import { Invoices } from './pages/sales/Invoices';
import { Returns } from './pages/sales/Returns';
import { Suppliers } from './pages/purchases/Suppliers';
import { Invoices as PurchaseInvoices } from './pages/purchases/Invoices';
import { Returns as PurchaseReturns } from './pages/purchases/Returns';
import { Treasuries } from './pages/cash/Treasuries';
import { CashVouchers } from './pages/cash/CashVouchers';
import { Transfers } from './pages/cash/Transfers';
import { ReportsHub } from './pages/reports/ReportsHub';
import { TrialBalance } from './pages/reports/TrialBalance';
import { IncomeStatement } from './pages/reports/IncomeStatement';
import { BalanceSheet } from './pages/reports/BalanceSheet';
import { AccountStatement } from './pages/reports/AccountStatement';
import { FixedAssets } from './pages/assets/FixedAssets';
import { Depreciation } from './pages/assets/Depreciation';
import { Users } from './pages/settings/Users';
import { AuditLogs } from './pages/settings/AuditLogs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting/accounts"
            element={
              <ProtectedRoute requiredPermission="Accounting.Account.View">
                <AppLayout>
                  <Accounts />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounting/journal-entries"
            element={
              <ProtectedRoute requiredPermission="Accounting.JournalEntry.View">
                <AppLayout>
                  <JournalEntries />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/products"
            element={
              <ProtectedRoute requiredPermission="Inventory.Item.View">
                <AppLayout>
                  <Products />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stock-movements"
            element={
              <ProtectedRoute requiredPermission="Inventory.Movement.View">
                <AppLayout>
                  <StockMovements />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/customers"
            element={
              <ProtectedRoute requiredPermission="Customer.Customer.View">
                <AppLayout>
                  <Customers />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <ProtectedRoute requiredPermission="Sales.Invoice.View">
                <AppLayout>
                  <Invoices />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/returns"
            element={
              <ProtectedRoute requiredPermission="Sales.Return.View">
                <AppLayout>
                  <Returns />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/purchases/suppliers" element={<ProtectedRoute requiredPermission="Supplier.Supplier.View"><AppLayout><Suppliers /></AppLayout></ProtectedRoute>} />
          <Route path="/purchases/invoices" element={<ProtectedRoute requiredPermission="Purchase.Invoice.View"><AppLayout><PurchaseInvoices /></AppLayout></ProtectedRoute>} />
          <Route path="/purchases/returns" element={<ProtectedRoute requiredPermission="Purchase.Return.View"><AppLayout><PurchaseReturns /></AppLayout></ProtectedRoute>} />
          <Route path="/cash/treasuries" element={<ProtectedRoute requiredPermission="Cash.CashAccount.View"><AppLayout><Treasuries /></AppLayout></ProtectedRoute>} />
          <Route path="/cash/vouchers" element={<ProtectedRoute requiredPermission="Cash.Receipt.View"><AppLayout><CashVouchers /></AppLayout></ProtectedRoute>} />
          <Route path="/cash/transfers" element={<ProtectedRoute requiredPermission="Cash.Transfer.View"><AppLayout><Transfers /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requiredPermission="Reports.Reports.ViewSalesReports"><AppLayout><ReportsHub /></AppLayout></ProtectedRoute>} />
          <Route path="/reports/trial-balance" element={<ProtectedRoute requiredPermission="Accounting.TrialBalance.View"><AppLayout><TrialBalance /></AppLayout></ProtectedRoute>} />
          <Route path="/reports/income-statement" element={<ProtectedRoute requiredPermission="Reports.Reports.ViewAccountingReports"><AppLayout><IncomeStatement /></AppLayout></ProtectedRoute>} />
          <Route path="/reports/balance-sheet" element={<ProtectedRoute requiredPermission="Reports.Reports.ViewAccountingReports"><AppLayout><BalanceSheet /></AppLayout></ProtectedRoute>} />
          <Route path="/reports/account-statement" element={<ProtectedRoute requiredPermission="Accounting.GeneralLedger.ViewAccountStatement"><AppLayout><AccountStatement /></AppLayout></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute requiredPermission="FixedAsset.FixedAsset.View"><AppLayout><FixedAssets /></AppLayout></ProtectedRoute>} />
          <Route path="/assets/depreciation" element={<ProtectedRoute requiredPermission="FixedAsset.FixedAsset.CalculateDepreciation"><AppLayout><Depreciation /></AppLayout></ProtectedRoute>} />
          <Route path="/settings/users" element={<ProtectedRoute requiredPermission="Admin.User.View"><AppLayout><Users /></AppLayout></ProtectedRoute>} />
          <Route path="/settings/audit-logs" element={<ProtectedRoute requiredPermission="Reports.Reports.ViewAccountingReports"><AppLayout><AuditLogs /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
