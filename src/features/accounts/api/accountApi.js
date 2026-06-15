import axiosClient from '../../../shared/services/axiosClient';

// ============ STAFF ACCOUNTS ============

export const getStaffAccounts = (params = {}) => {
  return axiosClient.get('/admin/accounts/staff', { params });
};

export const getStaffById = (id) => {
  return axiosClient.get(`/admin/accounts/staff/${id}`);
};

export const createStaff = (data) => {
  return axiosClient.post('/admin/accounts/staff', data);
};

export const updateStaff = (id, data) => {
  return axiosClient.put(`/admin/accounts/staff/${id}`, data);
};

export const toggleStaffStatus = (id) => {
  return axiosClient.patch(`/admin/accounts/staff/${id}/status`, {});
};

export const deleteStaff = (id) => {
  return axiosClient.delete(`/admin/accounts/staff/${id}`);
};

// ============ CUSTOMER ACCOUNTS ============

export const getCustomerAccounts = (params = {}) => {
  return axiosClient.get('/admin/accounts/customer', { params });
};

export const getCustomerById = (id) => {
  return axiosClient.get(`/admin/accounts/customer/${id}`);
};

export const updateCustomer = (id, data) => {
  return axiosClient.put(`/admin/accounts/customer/${id}`, data);
};

export const toggleCustomerStatus = (id) => {
  return axiosClient.patch(`/admin/accounts/customer/${id}/status`);
};

export const deleteCustomer = (id) => {
  return axiosClient.delete(`/admin/accounts/customer/${id}`);
};
