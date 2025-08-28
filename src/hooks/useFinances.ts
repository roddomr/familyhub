import { useState, useEffect } from 'react'
import { supabase, type Tables } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type FinancialAccount = Tables<'financial_accounts'>
export type Transaction = Tables<'transactions'>
export type TransactionCategory = Tables<'transaction_categories'>
export type Budget = Tables<'budgets'>

interface FinancesData {
  accounts: FinancialAccount[]
  recentTransactions: Transaction[]
  categories: TransactionCategory[]
  budgets: Budget[]
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
}

export const useFinances = () => {
  const { user } = useAuth()
  const [data, setData] = useState<FinancesData>({
    accounts: [],
    recentTransactions: [],
    categories: [],
    budgets: [],
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchFinancesData = async () => {
      try {
        setLoading(true)
        setError(null)

        // First, get user's families
        const { data: familyMembers } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)

        const familyIds = familyMembers?.map(fm => fm.family_id) || []

        if (familyIds.length === 0) {
          setData(prev => ({ ...prev }))
          return
        }

        // Fetch all financial data in parallel
        const [
          accountsResult,
          transactionsResult,
          categoriesResult,
          budgetsResult
        ] = await Promise.all([
          // Financial accounts
          supabase
            .from('financial_accounts')
            .select('*')
            .in('family_id', familyIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

          // Recent transactions (last 10)
          supabase
            .from('transactions')
            .select(`
              *,
              transaction_categories (
                name,
                color,
                icon,
                type
              ),
              financial_accounts (
                name,
                type
              )
            `)
            .in('family_id', familyIds)
            .order('created_at', { ascending: false })
            .limit(10),

          // Transaction categories
          supabase
            .from('transaction_categories')
            .select('*')
            .in('family_id', familyIds)
            .order('name'),

          // Active budgets
          supabase
            .from('budgets')
            .select(`
              *,
              transaction_categories (
                name,
                color,
                icon
              )
            `)
            .in('family_id', familyIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
        ])

        // Calculate financial metrics
        const accounts = accountsResult.data || []
        const transactions = transactionsResult.data || []
        const categories = categoriesResult.data || []
        const budgets = budgetsResult.data || []

        const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)

        // Calculate current month income/expenses
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        const currentMonthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date)
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear
        })

        const monthlyIncome = currentMonthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)

        const monthlyExpenses = currentMonthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)

        setData({
          accounts,
          recentTransactions: transactions,
          categories,
          budgets,
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
        })

      } catch (err) {
        console.error('Error fetching finances data:', err)
        setError('Failed to load financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchFinancesData()
  }, [user])

  const refreshData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)

      // First, get user's families
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)

      const familyIds = familyMembers?.map(fm => fm.family_id) || []

      if (familyIds.length === 0) {
        setData(prev => ({ ...prev }))
        return
      }

      // Fetch all financial data in parallel
      const [
        accountsResult,
        transactionsResult,
        categoriesResult,
        budgetsResult
      ] = await Promise.all([
        // Financial accounts
        supabase
          .from('financial_accounts')
          .select('*')
          .in('family_id', familyIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),

        // Recent transactions (last 10)
        supabase
          .from('transactions')
          .select(`
            *,
            transaction_categories (
              name,
              color,
              icon,
              type
            ),
            financial_accounts (
              name,
              type
            )
          `)
          .in('family_id', familyIds)
          .order('created_at', { ascending: false })
          .limit(10),

        // Transaction categories
        supabase
          .from('transaction_categories')
          .select('*')
          .in('family_id', familyIds)
          .order('name'),

        // Active budgets
        supabase
          .from('budgets')
          .select(`
            *,
            transaction_categories (
              name,
              color,
              icon
            )
          `)
          .in('family_id', familyIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ])

      // Calculate financial metrics
      const accounts = accountsResult.data || []
      const transactions = transactionsResult.data || []
      const categories = categoriesResult.data || []
      const budgets = budgetsResult.data || []

      const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)

      // Calculate current month income/expenses
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const currentMonthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear
      })

      const monthlyIncome = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const monthlyExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      setData({
        accounts,
        recentTransactions: transactions,
        categories,
        budgets,
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
      })

    } catch (err) {
      console.error('Error refreshing finances data:', err)
      setError('Failed to refresh financial data')
    } finally {
      setLoading(false)
    }
  }

  return {
    ...data,
    loading,
    error,
    refreshData,
  }
}