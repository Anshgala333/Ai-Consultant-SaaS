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
                .then(res => setUser(res.data))
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
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userType', 'business');
        setUser(userData);
        return userData;
    };

    const employeeLogin = async (email, password) => {
        const response = await employeeAPI.login({ email, password });
        const { token, ...userData } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userType', 'employee');
        setUser(userData);
        return userData;
    };

    const register = async (email, password, businessName) => {
        const response = await authAPI.register({ email, password, businessName });
        const { token, ...userData } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userType', 'business');
        setUser(userData);
        return userData;
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

