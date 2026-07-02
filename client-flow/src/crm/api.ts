import axios from 'axios';
import { Lead, CrmUser, FollowUp, Activity } from './data';

const API_BASE_URL = (import.meta.env.MODE === 'development' || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')))
  ? 'http://localhost:5000/api/v1'
  : (import.meta.env.VITE_API_BASE_URL || "https://crm-lovable-henna.vercel.app/api/v1");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('crm_jwt_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Don't intercept login requests so the login form can show validation/invalid credential messages
      const isLoginRequest = error.config.url && error.config.url.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('crm_jwt_token');
        localStorage.removeItem('crm_user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


// Map backend Lead to frontend Lead structure
const mapLead = (backendLead: any): Lead => ({
  id: backendLead._id,
  name: backendLead.leadName,
  company: backendLead.companyName,
  email: backendLead.email || '', // Now provided by backend
  phone: backendLead.phoneNumber,
  source: backendLead.source || 'Website',
  owner: backendLead.assignedUser ? backendLead.assignedUser.name : 'Unassigned',
  ownerId: backendLead.assignedUser ? backendLead.assignedUser._id : null,
  value: backendLead.value || 0,
  notes: backendLead.notes || '',
  location: backendLead.location || '',
  // Status is stored as a human-readable label in DB (e.g. "New", "Contacted", "Follow-Up")
  status: backendLead.status || 'New',
  createdAt: backendLead.createdAt,
  lastContact: backendLead.updatedAt || backendLead.createdAt,
  avatar: (backendLead.leadName || 'A B').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
  customFields: backendLead.customFields || {}
});

export const ApiService = {
  // AUTHENTICATION
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token, user: backendUser } = res.data.data;
    
    // Decode JWT payload
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decoded = JSON.parse(jsonPayload);
    const user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: backendUser.name // Not in JWT but useful for UI
    };

    localStorage.setItem('crm_jwt_token', token);
    localStorage.setItem('crm_user', JSON.stringify(user));
    return { token, user };
  },

  logout: () => {
    localStorage.removeItem('crm_jwt_token');
    localStorage.removeItem('crm_user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('crm_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  // PROFILE
  getProfile: async () => {
    const res = await apiClient.get('/profile');
    return res.data.data;
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const res = await apiClient.put('/profile', data);
    return res.data.data;
  },

  changePassword: async (data: any) => {
    const res = await apiClient.put('/profile/change-password', data);
    return res.data;
  },

  // PREFERENCES
  getPreferences: async () => {
    const res = await apiClient.get('/preferences');
    return res.data.data;
  },

  updatePreferences: async (data: any) => {
    const res = await apiClient.put('/preferences', data);
    return res.data.data;
  },

  // USERS
  getUsers: async (params?: any) => {
    const res = await apiClient.get('/users', { params });
    return res.data;
  },

  createUser: async (userData: any) => {
    const res = await apiClient.post('/users', userData);
    return res.data.data;
  },

  updateUser: async (id: string, userData: any) => {
    const res = await apiClient.put(`/users/${id}`, userData);
    return res.data.data;
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    const res = await apiClient.patch(`/users/${id}/status`, { isActive });
    return res.data.data;
  },

  deleteUser: async (id: string) => {
    await apiClient.delete(`/users/${id}`);
  },

  // DASHBOARD
  getDashboardSummary: async (pipelineRange?: string) => {
    const res = await apiClient.get('/dashboard/summary', { params: { pipelineRange } });
    return res.data.data;
  },

  getReportsSummary: async () => {
    const res = await apiClient.get('/dashboard/reports');
    return res.data.data;
  },

  // LEADS
  getLeads: async (params?: any): Promise<{ data: Lead[], total: number }> => {
    const res = await apiClient.get('/leads', { params });
    return {
      data: res.data.data.map(mapLead),
      total: res.data.total
    };
  },

  getLead: async (id: string): Promise<Lead> => {
    const res = await apiClient.get(`/leads/${id}`);
    return mapLead(res.data.data);
  },

  createLead: async (leadData: Partial<Lead> & { assignedUser?: string }): Promise<Lead> => {
    const payload: any = {
      leadName: leadData.name,
      companyName: leadData.company,
      email: leadData.email,
      phoneNumber: leadData.phone,
      location: leadData.location || 'Unknown',
      source: leadData.source || 'Website',
      // Store status exactly as the CRM settings label (e.g. "New", "Contacted") - never uppercase
      status: leadData.status || 'New',
      value: leadData.value || 0,
      notes: leadData.notes || '',
      customFields: leadData.customFields || {}
    };
    // Only include assignedUser if it's a valid non-empty string
    if (leadData.assignedUser && leadData.assignedUser.trim().length > 0) {
      payload.assignedUser = leadData.assignedUser;
    }
    const res = await apiClient.post('/leads', payload);
    return mapLead(res.data.data);
  },

  updateLeadStatus: async (id: string, status: string): Promise<Lead> => {
    // Send status label as-is (e.g. "Contacted", "Follow-Up") - matches what's stored in DB
    const res = await apiClient.patch(`/leads/${id}/status`, { status });
    return mapLead(res.data.data);
  },

  updateLead: async (id: string, leadData: Partial<Lead> & { assignedUser?: string }): Promise<Lead> => {
    const payload: any = {};
    if (leadData.name) payload.leadName = leadData.name;
    if (leadData.company) payload.companyName = leadData.company;
    if (leadData.email !== undefined) payload.email = leadData.email;
    if (leadData.phone) payload.phoneNumber = leadData.phone;
    if (leadData.location) payload.location = leadData.location;
    if (leadData.source) payload.source = leadData.source;
    if (leadData.assignedUser) payload.assignedUser = leadData.assignedUser;
    if (leadData.value !== undefined) payload.value = leadData.value;
    if (leadData.notes !== undefined) payload.notes = leadData.notes;
    if (leadData.customFields !== undefined) payload.customFields = leadData.customFields;
    
    const res = await apiClient.put(`/leads/${id}`, payload);
    return mapLead(res.data.data);
  },

  assignLead: async (id: string, userId: string): Promise<Lead> => {
    const res = await apiClient.patch(`/leads/${id}/assign`, { assignedUser: userId });
    return mapLead(res.data.data);
  },

  deleteLead: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  logLeadActivity: async (id: string, payload: { actionTaken?: string, summary?: string, followUpDate?: string, notes?: string, status?: string }): Promise<Lead> => {
    if (payload.status) {
      payload.status = payload.status.toUpperCase().replace(/[\s-]+/g, '_');
    }
    const res = await apiClient.post(`/leads/${id}/log-update`, payload);
    return mapLead(res.data.data);
  },

  // CSV IMPORT
  downloadSampleCsvUrl: () => `${API_BASE_URL}/leads/csv/sample`,

  uploadCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('crm_jwt_token');
    const res = await fetch(`${API_BASE_URL}/leads/csv/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.data;
  },

  validateCsv: async (rows: any[]) => {
    const res = await apiClient.post('/leads/csv/validate', { rows });
    return res.data.data;
  },

  importCsv: async (rows: any[]) => {
    const res = await apiClient.post('/leads/csv/import', { rows });
    return res.data.data;
  },

  // COMMUNICATIONS
  addCommunication: async (leadId: string, type: string, remarks: string) => {
    const res = await apiClient.post(`/leads/${leadId}/communications`, { type: type.toUpperCase(), remarks });
    return res.data.data;
  },

  // FOLLOW-UPS
  getFollowUps: async (params?: any) => {
    const res = await apiClient.get('/followups', { params });
    return res.data;
  },

  createFollowUp: async (leadId: string, data: Partial<FollowUp> & { priority?: string }) => {
    const payload = {
      followUpDate: data.due,
      notes: data.notes,
      priority: data.priority || 'MEDIUM'
    };
    const res = await apiClient.post(`/leads/${leadId}/followups`, payload);
    return res.data.data;
  },

  updateFollowUp: async (id: string, data: any) => {
    const res = await apiClient.patch(`/followups/${id}`, data);
    return res.data.data;
  },

  // ACTIVITIES
  getActivities: async (leadId: string, params?: any) => {
    const res = await apiClient.get(`/leads/${leadId}/activities`, { params });
    return res.data;
  },

  getAllActivities: async (params?: { page?: number; limit?: number; activityType?: string; fromDate?: string; toDate?: string }) => {
    const res = await apiClient.get('/activities', { params });
    return res.data; // { success, count, total, data: Activity[] }
  },

  // CRM SETTINGS
  getCrmSettings: async (): Promise<Record<string, CrmSettingItem[]>> => {
    const res = await apiClient.get('/settings');
    return res.data.data;
  },

  createCrmSetting: async (data: { category: string; label: string; value: string }) => {
    const res = await apiClient.post('/settings', data);
    return res.data.data;
  },

  updateCrmSetting: async (id: string, data: { label?: string; isActive?: boolean; order?: number }) => {
    const res = await apiClient.put(`/settings/${id}`, data);
    return res.data.data;
  },

  deleteCrmSetting: async (id: string) => {
    await apiClient.delete(`/settings/${id}`);
  },

  reorderCrmSettings: async (category: string, items: { id: string; order: number }[]) => {
    await apiClient.post('/settings/reorder', { category, items });
  },

  // CUSTOM FIELDS
  getCustomFields: async (): Promise<LeadCustomField[]> => {
    const res = await apiClient.get('/custom-fields');
    return res.data;
  },

  createCustomField: async (data: Partial<LeadCustomField>) => {
    const res = await apiClient.post('/custom-fields', data);
    return res.data;
  },

  updateCustomField: async (id: string, data: Partial<LeadCustomField>) => {
    const res = await apiClient.put(`/custom-fields/${id}`, data);
    return res.data;
  },

  deleteCustomField: async (id: string) => {
    await apiClient.delete(`/custom-fields/${id}`);
  },

  reorderCustomFields: async (items: { id: string; order: number }[]) => {
    await apiClient.post('/custom-fields/reorder', { orderPayload: items });
  },
};

export interface CrmSettingItem {
  _id: string;
  category: string;
  label: string;
  value: string;
  isActive: boolean;
  isSystem: boolean;
  order: number;
}

export interface LeadCustomField {
  _id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE' | 'DROPDOWN' | 'MULTI_SELECT' | 'CHECKBOX' | 'RADIO' | 'URL';
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  order: number;
}