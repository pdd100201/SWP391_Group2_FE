import axiosClient from '../../../shared/services/axiosClient'

export const checkinApi = {
    assignTable: async (data) => {
        return axiosClient.post('/check-in/assign', data)
    }
}