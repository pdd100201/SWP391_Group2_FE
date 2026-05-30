// features/auth/api/testApi.js
export const checkConnection = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/users');
        const data = await response.json();
        console.log("Kết nối BE thành công:", data);
    } catch (error) {
        console.error("Kết nối BE thất bại rồi đại ca:", error);
    }
};