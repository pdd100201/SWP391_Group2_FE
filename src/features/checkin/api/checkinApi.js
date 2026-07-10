import axiosClient from '../../../shared/services/axiosClient'

export const checkinApi = {
    assignTable: async (data) => {
        return axiosClient.post('/check-in/assign', data)
    },
    assignTables: async (reservationId, data) => {
        return axiosClient.patch(`/reservations/${reservationId}/assign-tables`, data);
    },
    changeTables: async (reservationId, data) => {
        return axiosClient.patch(`/reservations/${reservationId}/change-tables`, data);
    },

    getActiveGuestByTable: async (tableId) => {
        return axiosClient.get(`/check-in/table/${tableId}/active-guest`);
    },

    getReservedGuestByTable: async (tableId) => {
        return axiosClient.get(`/check-in/table/${tableId}/reserved-guest`);
    }
};
