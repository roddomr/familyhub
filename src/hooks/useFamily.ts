import { useState, useEffect } from 'react'
import { supabase, type Tables } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLogger } from './useLogger'

export type Family = Tables<'families'>
export type FamilyMember = Tables<'family_members'> & {
  profiles?: Tables<'profiles'>
}

export const useFamily = () => {
  const { user } = useAuth()
  const { logError, logInfo } = useLogger()
  const [families, setFamilies] = useState<Family[]>([])
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchFamilyData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user's families
        const { data: familyMemberships, error: membershipsError } = await supabase
          .from('family_members')
          .select(`
            *,
            families (*)
          `)
          .eq('user_id', user.id)

        if (membershipsError) throw membershipsError

        const userFamilies = familyMemberships?.map(fm => fm.families).filter(Boolean) || []
        setFamilies(userFamilies as Family[])

        // Set current family (first one for now)
        const firstFamily = userFamilies[0] as Family
        if (firstFamily) {
          setCurrentFamily(firstFamily)

          // Get family members for current family
          const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select(`
              *,
              profiles (
                id,
                email,
                full_name,
                avatar_url
              )
            `)
            .eq('family_id', firstFamily.id)

          if (membersError) throw membersError
          setFamilyMembers(members || [])
        }

      } catch (err) {
        console.error('Error fetching family data:', err)
        setError('Failed to load family data')
      } finally {
        setLoading(false)
      }
    }

    fetchFamilyData()
  }, [user])

  const createFamily = async (name: string, description?: string) => {
    if (!user) {
      const error = 'User not authenticated'
      await logError(error, { name, description }, 'families', 'create_family', 'AUTH_ERROR')
      throw new Error(error)
    }

    try {
      await logInfo('Attempting to create family', { 
        name, 
        description, 
        user_id: user.id,
        user_email: user.email 
      }, 'families', 'create_family')

      // Use the enhanced database function with logging
      const { data: result, error: rpcError } = await supabase.rpc('create_family_with_logging', {
        p_name: name,
        p_description: description || null,
        p_created_by: user.id,
      })

      if (rpcError) {
        await logError(
          'Database function error during family creation',
          { 
            name, 
            description, 
            error: rpcError.message,
            code: rpcError.code 
          },
          'families',
          'create_family',
          'RPC_ERROR'
        )
        throw rpcError
      }

      if (!result.success) {
        await logError(
          'Family creation failed',
          { 
            name, 
            description, 
            error: result.error,
            error_code: result.error_code 
          },
          'families',
          'create_family',
          result.error_code
        )
        throw new Error(result.error || 'Failed to create family')
      }

      const family = result.family

      // Refresh family data
      setFamilies(prev => [...prev, family])
      if (!currentFamily) {
        setCurrentFamily(family)
      }

      await logInfo(
        'Family created successfully',
        { 
          family_id: family.id,
          family_name: family.name,
          invite_code: family.invite_code 
        },
        'families',
        'create_family'
      )

      return family
    } catch (err: any) {
      await logError(
        'Unexpected error during family creation',
        {
          name,
          description,
          error: err.message,
          stack: err.stack
        },
        'families',
        'create_family',
        'UNEXPECTED_ERROR',
        err.stack
      )
      console.error('Error creating family:', err)
      throw new Error('Failed to create family')
    }
  }

  const switchFamily = (familyId: string) => {
    const family = families.find(f => f.id === familyId)
    if (family) {
      setCurrentFamily(family)
      // Re-fetch family members for new family
      // This will trigger the useEffect to refetch data
    }
  }

  return {
    families,
    currentFamily,
    familyMembers,
    loading,
    error,
    createFamily,
    switchFamily,
  }
}