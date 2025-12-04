import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { organizationApi } from '../services/organizationApi';
import type { Organization } from '../services/organizationApi';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
  switchOrganization: (organizationId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organizations when user is authenticated
  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { organizations: orgs } = await organizationApi.getOrganizations();
      setOrganizations(orgs);

      // Auto-select first organization or restore from localStorage
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      if (savedOrgId) {
        const savedOrg = orgs.find(org => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganization(savedOrg);
          return;
        }
      }

      // If no saved org or not found, select first one
      if (orgs.length > 0) {
        setCurrentOrganization(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
      setError(err.response?.data?.error || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Switch organization
  const switchOrganization = useCallback((organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', organizationId);
    }
  }, [organizations]);

  // Refresh organizations list
  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  const value = useMemo(
    () => ({
      currentOrganization,
      organizations,
      loading,
      error,
      setCurrentOrganization,
      refreshOrganizations,
      switchOrganization,
    }),
    [currentOrganization, organizations, loading, error, refreshOrganizations, switchOrganization]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
