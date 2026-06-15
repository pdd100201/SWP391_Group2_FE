/**
 * main.jsx
 * -------------------------------------------------------------------
 * Entry point của ứng dụng React — đây là file đầu tiên được Vite
 * thực thi khi khởi chạy ứng dụng.
 *
 * Nhiệm vụ của file này:
 *  1. Import CSS global (index.css) để áp dụng style nền tảng cho toàn app
 *  2. Tìm phần tử DOM root (#root trong index.html) để gắn React vào
 *  3. Bọc App trong StrictMode để phát hiện lỗi tiềm ẩn trong quá trình dev
 *
 * Lưu ý về StrictMode:
 *  - Chỉ hoạt động ở môi trường DEVELOPMENT, không ảnh hưởng production build
 *  - React sẽ render component 2 lần để phát hiện side effect không tinh khiết
 *  - Giúp phát hiện sớm: deprecated APIs, memory leaks, không đúng lifecycle...
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Import CSS toàn cục — chứa reset, font, CSS variable và style nền tảng
import './index.css'

// Import component gốc của ứng dụng — chứa toàn bộ cây route
import App from './App.jsx'

/**
 * Tìm element #root trong index.html và tạo React root từ đó.
 * createRoot() là API của React 18 (thay thế ReactDOM.render cũ)
 * — hỗ trợ Concurrent Mode và các tính năng mới như Suspense, Transitions.
 *
 * StrictMode bọc bên ngoài App để kích hoạt các cảnh báo phát triển.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
