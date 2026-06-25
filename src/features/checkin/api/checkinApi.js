import axiosClient from '../../../shared/services/axiosClient'

export const checkinApi = {
    assignTable: async (data) => {
        return axiosClient.post('/check-in/assign', data)
    },

    getActiveGuestByTable: async (tableId) => {
        return axiosClient.get(`/check-in/table/${tableId}/active-guest`);
    }
};