import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, employeeAPI } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType');

        if (token && savedUser) {
            const userData = JSON.parse(savedUser);
            setUser(userData);

            // Verify token is still valid based on user type
            const verifyPromise = userType === 'employee'
                ? employeeAPI.getProfile()
                : authAPI.getProfile();

            verifyPromise
                .then(res => {
                    // IMPORTANT: Preserve the userType when updating from profile response
                    const profileData = res.data;
                    const updatedUser = { 
                        ...profileData, 
                        userType: profileData.userType || userType || (userType === 'employee' ? 'employee' : 'business')
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userType');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, ...userData } = response.data;

        // Explicitly add userType to ensure it persists in user object
        const userWithType = { ...userData, userType: 'business' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithType));
        localStorage.setItem('userType', 'business');
        setUser(userWithType);
        return userWithType;
    };

    const employeeLogin = async (email, password) => {
        try {
            console.log('[AuthContext] Attempting employee login for:', email);
            const response = await employeeAPI.login({ email, password });
            console.log('[AuthContext] Login response:', response.data);
            const { token, ...userData } = response.data;

            // Explicitly add userType to ensure it persists in user object
            const userWithType = { ...userData, userType: 'employee' };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userWithType));
            localStorage.setItem('userType', 'employee');
            setUser(userWithType);
            return userWithType;
        } catch (error) {
            console.error('[AuthContext] Login failed:', error.response?.data || error.message);
            throw error;
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        const response = await employeeAPI.changePassword({ currentPassword, newPassword });
        const updatedUser = { ...user, firstLoginCompleted: true, requirePasswordChange: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return response.data;
    };

    const register = async (email, password, businessName) => {
        const response = await authAPI.register({ email, password, businessName });
        const { token, ...userData } = response.data;

        // Explicitly add userType to ensure it persists in user object
        const userWithType = { ...userData, userType: 'business' };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithType));
        localStorage.setItem('userType', 'business');
        setUser(userWithType);
        return userWithType;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        setUser(null);
    };

    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const isEmployee = user?.userType === 'employee';
    const isBusiness = user?.userType === 'business';

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            employeeLogin,
            changePassword,
            register,
            logout,
            updateUser,
            isEmployee,
            isBusiness
        }}>
            {children}
        </AuthContext.Provider>
    );
};

