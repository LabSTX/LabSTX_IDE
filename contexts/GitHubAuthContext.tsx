import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GitHubUser {
    login: string;
    avatar_url: string;
    name: string | null;
    id: number;
}

interface GitHubAuthContextType {
    user: GitHubUser | null;
    loading: boolean;
    isAuthenticated: boolean;
    checkAuth: () => Promise<void>;
    login: () => void;
    logout: () => void;
}

const GitHubAuthContext = createContext<GitHubAuthContextType | undefined>(undefined);

export const GitHubAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch('/ide-api/github/user');
            if (!response.ok) {
                setUser(null);
                return;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.authenticated) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(() => {
        window.location.href = '/ide-api/auth/github';
    }, []);

    const logout = useCallback(() => {
        window.location.href = '/ide-api/auth/logout';
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        checkAuth,
        login,
        logout
    };

    return (
        <GitHubAuthContext.Provider value={value}>
            {children}
        </GitHubAuthContext.Provider>
    );
};

export const useGitHubAuth = () => {
    const context = useContext(GitHubAuthContext);
    if (context === undefined) {
        throw new Error('useGitHubAuth must be used within a GitHubAuthProvider');
    }
    return context;
};
