import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if we're not on the login page already
            const isLoginRequest = error.config?.url?.includes('/auth/login') ||
                error.config?.url?.includes('/auth/employee-login');
            if (!isLoginRequest) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userType');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/me')
};

// Business API
export const businessAPI = {
    updateOnboarding: (data) => api.put('/business/onboarding', data),
    getHealthCard: () => api.get('/business/health-card'),
    getProfile: () => api.get('/business/profile'),
    updateProfile: (data) => api.put('/business/profile', data)
};

// Upload API
export const uploadAPI = {
    uploadFile: (formData) => api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    saveMapping: (id, mapping) => api.put(`/upload/${id}/mapping`, { columnMapping: mapping }),
    getUploads: () => api.get('/upload'),
    getUpload: (id) => api.get(`/upload/${id}`),
    getMappingSuggestions: (dataType) => api.get(`/upload/mapping-suggestions/${dataType}`)
};

// KPI API
export const kpiAPI = {
    compute: (period) => api.post('/kpi/compute', { period }),
    getLatest: () => api.get('/kpi/latest'),
    getHistory: (params) => api.get('/kpi/history', { params }),
    getSummary: () => api.get('/kpi/summary'),
    getBaseline: () => api.get('/kpi/baseline')
};

// Issues API
export const issuesAPI = {
    getAll: (params) => api.get('/issues', { params }),
    getSummary: () => api.get('/issues/summary'),
    getById: (id) => api.get(`/issues/${id}`),
    updateStatus: (id, status, notes) => api.put(`/issues/${id}/status`, { status, resolutionNotes: notes }),
    dismiss: (id, reason) => api.post(`/issues/${id}/dismiss`, { reason })
};

// Feedback API
export const feedbackAPI = {
    submit: (data) => api.post('/feedback', data),
    getOutletInfo: (outletId) => api.get(`/feedback/outlet/${outletId}`),
    getAll: (params) => api.get('/feedback', { params }),
    getSummary: () => api.get('/feedback/summary'),
    generateQR: (outletId) => api.post(`/feedback/qr/${outletId}`)
};

// Staff Logs API
export const staffLogsAPI = {
    create: (data) => api.post('/staff-logs', data),
    getAll: (params) => api.get('/staff-logs', { params }),
    getSummary: () => api.get('/staff-logs/summary'),
    updateStatus: (id, status) => api.put(`/staff-logs/${id}/status`, { status }),
    getFormConfig: () => api.get('/staff-logs/form-config')
};

// Recommendations API
export const recommendationsAPI = {
    generate: () => api.post('/recommendations/generate'),
    getAll: (params) => api.get('/recommendations', { params }),
    getLatest: () => api.get('/recommendations/latest'),
    updateStatus: (id, status, feedback) => api.put(`/recommendations/${id}/status`, { status, feedback }),
    convertToExperiment: (id, data) => api.post(`/recommendations/${id}/convert`, data)
};

// Experiments API
export const experimentsAPI = {
    getAll: (params) => api.get('/experiments', { params }),
    getById: (id) => api.get(`/experiments/${id}`),
    start: (id) => api.put(`/experiments/${id}/start`),
    addUpdate: (id, data) => api.post(`/experiments/${id}/update`, data),
    complete: (id, notes) => api.put(`/experiments/${id}/complete`, { completionNotes: notes }),
    getComparison: (id) => api.get(`/experiments/${id}/comparison`),
    getSummary: () => api.get('/experiments/summary/stats')
};

// Admin API
export const adminAPI = {
    getBusinesses: (params) => api.get('/admin/businesses', { params }),
    getDashboard: () => api.get('/admin/dashboard'),
    getBusinessDetails: (id) => api.get(`/admin/business/${id}`),
    exportKPI: () => api.get('/admin/export/kpi')
};

// Reports API
export const reportsAPI = {
    generate: () => api.post('/reports/generate', {}, { responseType: 'blob' }),
    preview: () => api.get('/reports/preview')
};

// Employee API
export const employeeAPI = {
    // Company endpoints (managing employees)
    create: (data) => api.post('/employees', data),
    getAll: () => api.get('/employees'),
    delete: (id) => api.delete(`/employees/${id}`),
    reactivate: (id) => api.put(`/employees/${id}/reactivate`),
    // Employee auth endpoints
    login: (data) => api.post('/auth/employee-login', data),
    getProfile: () => api.get('/auth/employee/me')
};

export default api;
